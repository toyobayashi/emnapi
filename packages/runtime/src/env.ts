import type { Handle } from './Handle'
import type { Context } from './Context'
import type { IStoreValue } from './Store'
import {
  TryCatch,
  _setImmediate,
  NAPI_VERSION,
  NAPI_VERSION_EXPERIMENTAL,
  NODE_API_DEFAULT_MODULE_API_VERSION
} from './util'
import { RefTracker } from './RefTracker'
import { RefBase } from './RefBase'

function throwNodeApiVersionError (moduleName: string, moduleApiVersion: number): never {
  const errorMessage = `${
    moduleName} requires Node-API version ${
      moduleApiVersion}, but this version of Node.js only supports version ${
        NAPI_VERSION} add-ons.`
  throw new Error(errorMessage)
}

function handleThrow (_envObject: Env, value: any): void {
  // if (envObject.terminatedOrTerminating()) {
  //   return
  // }
  throw value
}

export interface IReferenceBinding {
  wrapped: number // wrapped Reference id
  tag: [number, number, number, number] | null
  data: void_p
}

export class Env implements IStoreValue {
  public id: number

  public openHandleScopes: number = 0

  public instanceData: RefBase | null = null

  public tryCatch = new TryCatch()

  public refs = 1

  public reflist = new RefTracker()
  public finalizing_reflist = new RefTracker()

  private destructing: boolean = false
  public finalizationScheduled: boolean = false
  public pendingFinalizers: RefTracker[] = []

  public lastError = {
    errorCode: napi_status.napi_ok,
    engineErrorCode: 0 as uint32_t,
    engineReserved: 0 as Ptr
  }

  public static create (
    ctx: Context,
    filename: string,
    moduleApiVersion: number,
    makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void,
    makeDynCall_vp: (cb: Ptr) => (a: Ptr) => void,
    abort: (msg?: string) => never
  ): Env {
    moduleApiVersion = typeof moduleApiVersion !== 'number' ? NODE_API_DEFAULT_MODULE_API_VERSION : moduleApiVersion
    // Validate module_api_version.
    if (moduleApiVersion < NODE_API_DEFAULT_MODULE_API_VERSION) {
      moduleApiVersion = NODE_API_DEFAULT_MODULE_API_VERSION
    } else if (moduleApiVersion > NAPI_VERSION && moduleApiVersion !== NAPI_VERSION_EXPERIMENTAL) {
      throwNodeApiVersionError(filename, moduleApiVersion)
    }
    const env = new Env(ctx, filename, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort)
    ctx.envStore.add(env)
    ctx.addCleanupHook(env, () => { env.unref() }, 0)
    return env
  }

  private constructor (
    public readonly ctx: Context,
    public filename: string,
    public moduleApiVersion: number,
    public makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void,
    public makeDynCall_vp: (cb: Ptr) => (a: Ptr) => void,
    public abort: (msg?: string) => never
  ) {
    this.id = 0
  }

  // public canCallIntoJs (): boolean {
  //   return this.ctx.canCallIntoJs()
  // }

  // public terminatedOrTerminating (): boolean {
  //   return !this.canCallIntoJs()
  // }

  public ref (): void {
    this.refs++
  }

  public unref (): void {
    this.refs--
    if (this.refs === 0) {
      this.dispose()
    }
  }

  public ensureHandle<S> (value: S): Handle<S> {
    return this.ctx.ensureHandle(value)
  }

  public ensureHandleId (value: any): napi_value {
    return this.ensureHandle(value).id
  }

  public clearLastError (): napi_status {
    const lastError = this.lastError
    lastError.errorCode = napi_status.napi_ok
    lastError.engineErrorCode = 0
    lastError.engineReserved = 0

    return napi_status.napi_ok
  }

  public setLastError (error_code: napi_status, engine_error_code: uint32_t = 0, engine_reserved: void_p = 0): napi_status {
    const lastError = this.lastError
    lastError.errorCode = error_code
    lastError.engineErrorCode = engine_error_code
    lastError.engineReserved = engine_reserved
    return error_code
  }

  public getReturnStatus (): napi_status {
    return !this.tryCatch.hasCaught() ? napi_status.napi_ok : this.setLastError(napi_status.napi_pending_exception)
  }

  public triggerFatalException (err: any): void {
    if (typeof process === 'object' && process !== null && typeof (process as any)._fatalException === 'function') {
      const handled = (process as any)._fatalException(err)
      if (!handled) {
        console.error(err)
        process.exit(1)
      }
    } else {
      throw err
    }
  }

  public callIntoModule<T> (fn: (env: Env) => T, handleException?: (envObject: Env, value: any) => void): T
  public callIntoModule<T> (fn: (env: Env) => T, handleException = handleThrow): T {
    const openHandleScopesBefore = this.openHandleScopes
    this.clearLastError()
    const r = fn(this)
    if (openHandleScopesBefore !== this.openHandleScopes) {
      this.abort()
    }
    if (this.tryCatch.hasCaught()) {
      const err = this.tryCatch.extractException()!
      handleException(this, err)
    }
    return r
  }

  public callbackIntoModule<T> (enforceUncaughtExceptionPolicy: boolean, fn: (env: Env) => T): T {
    return this.callIntoModule(fn, (envObject, err) => {
      // if (envObject.terminatedOrTerminating()) {
      //   return
      // }
      const hasProcess = typeof process === 'object' && process !== null
      const hasForceFlag = hasProcess ? Boolean(process.execArgv && (process.execArgv.indexOf('--force-node-api-uncaught-exceptions-policy') !== -1)) : false
      if (!hasForceFlag && !enforceUncaughtExceptionPolicy) {
        if (hasProcess && typeof process.emitWarning === 'function') {
          process.emitWarning(
            'Uncaught N-API callback exception detected, please run node with option --force-node-api-uncaught-exceptions-policy=true to handle those exceptions properly.',
            'DeprecationWarning',
            'DEP0168'
          )
        } else {
          throw err
        }
      }
      envObject.triggerFatalException(err)
    })
  }

  public callFinalizer (forceUncaught: int, cb: napi_finalize, data: void_p, hint: void_p): void {
    const f = this.makeDynCall_vppp(cb)
    const env: napi_env = this.id
    const scope = this.ctx.openScope(this)
    try {
      this.callbackIntoModule(Boolean(forceUncaught), () => { f(env, data, hint) })
    } finally {
      this.ctx.closeScope(this, scope)
    }
  }

  public enqueueFinalizer (finalizer: RefTracker): void {
    if (this.pendingFinalizers.indexOf(finalizer) === -1) {
      this.pendingFinalizers.push(finalizer)
    }
    if (!this.finalizationScheduled && !this.destructing) {
      this.finalizationScheduled = true
      this.ref()
      _setImmediate(() => {
        this.finalizationScheduled = false
        this.unref()
        this.drainFinalizerQueue()
      })
    }
  }

  public dequeueFinalizer (finalizer: RefTracker): void {
    const index = this.pendingFinalizers.indexOf(finalizer)
    if (index !== -1) {
      this.pendingFinalizers.splice(index, 1)
    }
  }

  public drainFinalizerQueue (): void {
    while (this.pendingFinalizers.length > 0) {
      const refTracker = this.pendingFinalizers.shift()!
      refTracker.finalize()
    }
  }

  public dispose (): void {
    if (this.id === 0) return
    this.destructing = true
    this.drainFinalizerQueue()

    RefBase.finalizeAll(this.finalizing_reflist)
    RefBase.finalizeAll(this.reflist)

    this.tryCatch.extractException()
    this.ctx.envStore.remove(this.id)
    this.id = 0
  }

  private readonly _bindingMap: WeakMap<object, IReferenceBinding> = new WeakMap()

  public initObjectBinding<S extends object> (value: S): IReferenceBinding {
    const binding: IReferenceBinding = {
      wrapped: 0,
      tag: null,
      data: 0
    }
    this._bindingMap.set(value, binding)
    return binding
  }

  public getObjectBinding<S extends object> (value: S): IReferenceBinding {
    if (this._bindingMap.has(value)) {
      return this._bindingMap.get(value)!
    }
    return this.initObjectBinding(value)
  }

  setInstanceData (data: number, finalize_cb: number, finalize_hint: number): void {
    if (this.instanceData) {
      this.instanceData.dispose()
    }
    this.instanceData = new RefBase(this, 0, Ownership.kRuntime, finalize_cb, data, finalize_hint)
  }

  getInstanceData (): number {
    return this.instanceData ? this.instanceData.data() : 0
  }
}
