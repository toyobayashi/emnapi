import type { Context } from './Context'
import {
  NAPI_VERSION_EXPERIMENTAL
} from './util'
import { RefTracker } from './RefTracker'
import { TrackedFinalizer } from './TrackedFinalizer'
import { Disposable } from './Disaposable'
import type { ArrayStore } from './Store'
import { Persistent } from './Persistent'

function handleThrow (envObject: Env, value: any): void {
  if (envObject.terminatedOrTerminating()) {
    return
  }
  throw value
}

export interface IReferenceBinding {
  wrapped: number // wrapped Reference id
  tag: Uint32Array | null
}

export interface EnvNativeBridge {
  address: number
  deleteEnv: (ptr: number) => void
  setLastError: (env: napi_env, error_code: napi_status, engine_error_code: uint32_t, engine_reserved: number) => void
  makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void
  makeDynCall_vp: (cb: Ptr) => (a: Ptr) => void
  abort: (msg?: string) => never
  wasm64?: boolean
}

export abstract class Env extends Disposable {
  public id: number | bigint

  public openHandleScopes: number = 0

  public instanceData: TrackedFinalizer | null = null

  public lastException: Persistent<any>

  public refs = 1

  public reflist = new RefTracker()
  public finalizing_reflist = new RefTracker()

  public pendingFinalizers: RefTracker[] = []

  moduleApiVersion!: number
  filename!: string
  nodeBinding?: any

  public inGcFinalizer = false

  public bridge: EnvNativeBridge

  public readonly ctx: Context
  private store: ArrayStore<Env>

  public constructor (
    ctx: Context,
    store: ArrayStore<Env>,
    bridge: EnvNativeBridge
  ) {
    super()
    this.ctx = ctx
    this.store = store
    this.id = 0
    this.store.insert(this)
    this.lastException = new Persistent<any>(ctx.isolate)
    this.bridge = bridge
  }

  /** @virtual */
  public canCallIntoJs (): boolean {
    return true
  }

  public terminatedOrTerminating (): boolean {
    return !this.canCallIntoJs()
  }

  public ref (): void {
    this.refs++
  }

  public unref (): void {
    this.refs--
    if (this.refs === 0) {
      this.dispose()
    }
  }

  public clearLastError (): napi_status {
    this.bridge.setLastError(this.bridge.address, napi_status.napi_ok, 0, 0)
    return napi_status.napi_ok
  }

  public setLastError (error_code: napi_status, engine_error_code: uint32_t = 0, engine_reserved: number = 0): napi_status {
    this.bridge.setLastError(this.bridge.address, error_code, engine_error_code, engine_reserved)
    return error_code
  }

  public callIntoModule<T> (fn: (env: Env) => T, handleException?: (envObject: Env, value: any) => void): T
  public callIntoModule<T> (fn: (env: Env) => T, handleException = handleThrow): T {
    const openHandleScopesBefore = this.openHandleScopes
    this.clearLastError()
    const r = fn(this)
    if (openHandleScopesBefore !== this.openHandleScopes) {
      this.bridge.abort('open_handle_scopes != open_handle_scopes_before')
    }
    if (!this.lastException.isEmpty()) {
      const err = this.lastException.deref()!
      this.lastException.reset()
      handleException(this, err)
    }
    return r
  }

  /** @virtual */
  public abstract callFinalizer (cb: napi_finalize, data: void_p, hint: void_p): void

  public invokeFinalizerFromGC (finalizer: RefTracker): void {
    if (this.moduleApiVersion !== NAPI_VERSION_EXPERIMENTAL) {
      this.enqueueFinalizer(finalizer)
    } else {
      const saved = this.inGcFinalizer
      this.inGcFinalizer = true
      try {
        finalizer.finalize()
      } finally {
        this.inGcFinalizer = saved
      }
    }
  }

  public checkGCAccess (): void {
    if (this.moduleApiVersion === NAPI_VERSION_EXPERIMENTAL && this.inGcFinalizer) {
      this.bridge.abort(
        'Finalizer is calling a function that may affect GC state.\n' +
        'The finalizers are run directly from GC and must not affect GC ' +
        'state.\n' +
        'Use `node_api_post_finalizer` from inside of the finalizer to work ' +
        'around this issue.\n' +
        'It schedules the call as a new task in the event loop.'
      )
    }
  }

  /** @virtual */
  public enqueueFinalizer (finalizer: RefTracker): void {
    if (this.pendingFinalizers.indexOf(finalizer) === -1) {
      this.pendingFinalizers.push(finalizer)
    }
  }

  /** @virtual */
  public dequeueFinalizer (finalizer: RefTracker): void {
    const index = this.pendingFinalizers.indexOf(finalizer)
    if (index !== -1) {
      this.pendingFinalizers.splice(index, 1)
    }
  }

  /** @virtual */
  public deleteMe (): void {
    RefTracker.finalizeAll(this.finalizing_reflist)
    RefTracker.finalizeAll(this.reflist)

    this.lastException.reset()
    this.store.dealloc(this.id)

    this.bridge.deleteEnv(this.bridge.address)
  }

  public dispose (): void {
    if (this.id === 0) return
    this.deleteMe()

    this.finalizing_reflist.dispose()
    this.reflist.dispose()
    this.id = 0
  }

  private readonly _bindingMap: WeakMap<object, IReferenceBinding> = new WeakMap()

  public initObjectBinding<S extends object> (value: S): IReferenceBinding {
    const binding: IReferenceBinding = {
      wrapped: 0,
      tag: null
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

  public setInstanceData (data: number, finalize_cb: number, finalize_hint: number): void {
    if (this.instanceData) {
      this.instanceData.dispose()
    }
    this.instanceData = TrackedFinalizer.create(this, finalize_cb, data, finalize_hint)
  }

  public getInstanceData (): number | bigint {
    return this.instanceData ? this.instanceData.data() : 0
  }
}

export class NodeEnv extends Env {
  public destructing: boolean = false
  public finalizationScheduled: boolean = false

  public constructor (
    ctx: Context,
    store: ArrayStore<Env>,
    bridge: EnvNativeBridge
  ) {
    super(ctx, store, bridge)
    this.bridge = bridge
  }

  public override deleteMe (): void {
    this.destructing = true
    this.drainFinalizerQueue()
    super.deleteMe()
  }

  public override canCallIntoJs (): boolean {
    return super.canCallIntoJs() && this.ctx.canCallIntoJs()
  }

  public triggerFatalException (err: any): void {
    if (this.nodeBinding) {
      this.nodeBinding.napi.fatalException(err)
    } else {
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
  }

  public callbackIntoModule<T> (enforceUncaughtExceptionPolicy: boolean, fn: (env: Env) => T): T {
    return this.callIntoModule(fn, (envObject, err) => {
      if (envObject.terminatedOrTerminating()) {
        return
      }
      const hasProcess = typeof process === 'object' && process !== null
      const hasForceFlag = hasProcess ? Boolean(process.execArgv && (process.execArgv.indexOf('--force-node-api-uncaught-exceptions-policy') !== -1)) : false
      if (envObject.moduleApiVersion < 10 && !hasForceFlag && !enforceUncaughtExceptionPolicy) {
        const warn = hasProcess && typeof process.emitWarning === 'function'
          ? process.emitWarning
          : function (warning: string | Error, type?: string, code?: string) {
            if (warning instanceof Error) {
              console.warn(warning.toString())
            } else {
              const prefix = code ? `[${code}] ` : ''

              console.warn(`${prefix}${type || 'Warning'}: ${warning}`)
            }
          }
        warn(
          'Uncaught Node-API callback exception detected, please run node with option --force-node-api-uncaught-exceptions-policy=true to handle those exceptions properly.',
          'DeprecationWarning',
          'DEP0168'
        )
        return
      }
      (envObject as NodeEnv).triggerFatalException(err)
    })
  }

  public override callFinalizer (cb: napi_finalize, data: void_p, hint: void_p): void {
    this.callFinalizerInternal(1, cb, data, hint)
  }

  public callFinalizerInternal (forceUncaught: int, cb: napi_finalize, data: void_p, hint: void_p): void {
    const f = this.bridge.makeDynCall_vppp(cb)
    const env: napi_env = this.bridge.address
    const scope = this.ctx.openScope(this)
    try {
      this.callbackIntoModule(Boolean(forceUncaught), () => { f(env, data, hint) })
    } finally {
      this.ctx.closeScope(this, scope)
    }
  }

  public override enqueueFinalizer (finalizer: RefTracker): void {
    super.enqueueFinalizer(finalizer)
    if (!this.finalizationScheduled && !this.destructing) {
      this.finalizationScheduled = true
      this.ref()
      this.ctx.features.setImmediate(() => {
        this.finalizationScheduled = false
        this.unref()
        this.drainFinalizerQueue()
      })
    }
  }

  public drainFinalizerQueue (): void {
    while (this.pendingFinalizers.length > 0) {
      const refTracker = this.pendingFinalizers.shift()!
      refTracker.finalize()
    }
  }
}
