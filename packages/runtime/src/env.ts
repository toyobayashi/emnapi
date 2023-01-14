import type { Handle } from './Handle'
import type { Context } from './Context'
import type { IStoreValue } from './Store'
import { TryCatch, _setImmediate } from './util'
import { RefTracker } from './RefTracker'
import { Ownership, RefBase } from './RefBase'

/** @internal */
export interface IReferenceBinding {
  wrapped: number // wrapped Reference id
  tag: [number, number, number, number] | null
  data: void_p
}

/** @internal */
export interface ILastError {
  setErrorMessage: (ptr: number | bigint) => void
  getErrorCode: () => number
  setErrorCode: (code: number) => void
  data: number
  dispose (): void
}

class CleanupHookCallback {
  constructor (
    public fn: number,
    public arg: number,
    public order: number
  ) {}
}

class CleanupQueue {
  private readonly _cleanupHooks = [] as CleanupHookCallback[]
  private _cleanupHookCounter = 0

  constructor (private readonly makeDynCall_vp: (cb: Ptr) => (a: Ptr) => void) {}

  public empty (): boolean {
    return this._cleanupHooks.length === 0
  }

  public add (fn: number, arg: number): void {
    if (this._cleanupHooks.filter((hook) => (hook.fn === fn && hook.arg === arg)).length > 0) {
      throw new Error('Can not add same fn and arg twice')
    }
    this._cleanupHooks.push(new CleanupHookCallback(fn, arg, this._cleanupHookCounter++))
  }

  public remove (fn: number, arg: number): void {
    for (let i = 0; i < this._cleanupHooks.length; ++i) {
      const hook = this._cleanupHooks[i]
      if (hook.fn === fn && hook.arg === arg) {
        this._cleanupHooks.splice(i, 1)
        return
      }
    }
  }

  public drain (): void {
    while (this._cleanupHooks.length > 0) {
      const cb = this._cleanupHooks[this._cleanupHooks.length - 1]
      this.makeDynCall_vp(cb.fn)(cb.arg)
      this._cleanupHooks.pop()
    }
  }
}

/** @internal */
export class Env implements IStoreValue {
  public id: number

  public openHandleScopes: number = 0

  public instanceData: RefBase | null = null

  public tryCatch = new TryCatch()

  public refs = 1

  public reflist = new RefTracker()
  public finalizing_reflist = new RefTracker()

  public finalizationScheduled: boolean = false
  public pendingFinalizers: RefTracker[] = []

  private readonly cleanupQueue: CleanupQueue

  public lastError = {
    errorCode: napi_status.napi_ok,
    engineErrorCode: 0 as uint32_t,
    engineReserved: 0 as Ptr
  }

  public static create (
    ctx: Context,
    makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void,
    makeDynCall_vp: (cb: Ptr) => (a: Ptr) => void
  ): Env {
    const env = new Env(ctx, makeDynCall_vppp, makeDynCall_vp)
    ctx.envStore.add(env)
    return env
  }

  private constructor (
    public readonly ctx: Context,
    public makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void,
    makeDynCall_vp: (cb: Ptr) => (a: Ptr) => void
  ) {
    this.id = 0
    this.cleanupQueue = new CleanupQueue(makeDynCall_vp)

    if (typeof process === 'object' && process !== null && typeof process.once === 'function') {
      process.once('beforeExit', () => {
        this.dispose()
      })
    }
  }

  public addCleanupHook (fn: number, arg: number): void {
    this.cleanupQueue.add(fn, arg)
  }

  public removeCleanupHook (fn: number, arg: number): void {
    this.cleanupQueue.remove(fn, arg)
  }

  public runCleanup (): void {
    while (!this.cleanupQueue.empty()) {
      this.cleanupQueue.drain()
    }
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

  public ensureHandle<S> (value: S): Handle<S> {
    return this.ctx.ensureHandle(value)
  }

  public ensureHandleId (value: any): napi_value {
    return this.ensureHandle(value).id
  }

  public clearLastError (): napi_status {
    // this.lastError.setErrorCode(napi_status.napi_ok)

    const lastError = this.lastError
    lastError.errorCode = napi_status.napi_ok
    lastError.engineErrorCode = 0
    lastError.engineReserved = 0

    return napi_status.napi_ok
  }

  public setLastError (error_code: napi_status, engine_error_code: uint32_t = 0, engine_reserved: void_p = 0): napi_status {
    // this.lastError.setErrorCode(error_code)

    const lastError = this.lastError
    lastError.errorCode = error_code
    lastError.engineErrorCode = engine_error_code
    lastError.engineReserved = engine_reserved
    return error_code
  }

  public getReturnStatus (): napi_status {
    return !this.tryCatch.hasCaught() ? napi_status.napi_ok : this.setLastError(napi_status.napi_pending_exception)
  }

  public callIntoModule<T> (fn: (env: Env) => T): T {
    this.clearLastError()
    const r = fn(this)
    if (this.tryCatch.hasCaught()) {
      const err = this.tryCatch.extractException()!
      // if (this.lastError.getErrorCode() === napi_status.napi_pending_exception) {
      //   this.clearLastError()
      // }
      throw err
    }
    return r
  }

  public callFinalizer (cb: napi_finalize, data: void_p, hint: void_p): void {
    const f = this.makeDynCall_vppp(cb)
    const env: napi_env = this.id
    const scope = this.ctx.openScope(this)
    try {
      this.callIntoModule(() => { f(env, data, hint) })
    } finally {
      this.ctx.closeScope(this, scope)
    }
  }

  public enqueueFinalizer (finalizer: RefTracker): void {
    if (this.pendingFinalizers.indexOf(finalizer) === -1) {
      this.pendingFinalizers.push(finalizer)
    }
    if (!this.finalizationScheduled) {
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
    this.drainFinalizerQueue()
    // this.scopeList.clear()
    RefBase.finalizeAll(this.finalizing_reflist)
    RefBase.finalizeAll(this.reflist)

    this.tryCatch.extractException()
    this.ctx.envStore.remove(this.id)
    this.id = 0

    this.runCleanup()
  }

  // js object -> IReferenceBinding
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
