import type { Handle } from './Handle'
import type { Context } from './Context'
import type { IStoreValue } from './Store'
import { TryCatch, _setImmediate } from './util'
import { RefTracker } from './RefTracker'
import { RefBase } from './RefBase'

/** @internal */
export interface ILastError {
  setErrorMessage: (ptr: number | bigint) => void
  getErrorCode: () => number
  setErrorCode: (code: number) => void
  data: number
  dispose (): void
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

  public lastError = {
    errorCode: napi_status.napi_ok,
    engineErrorCode: 0 as uint32_t,
    engineReserved: 0 as Ptr
  }

  public static create (
    ctx: Context,
    makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void
  ): Env {
    const env = new Env(ctx, makeDynCall_vppp)
    ctx.envStore.add(env)
    return env
  }

  private constructor (
    public readonly ctx: Context,
    public makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void
  ) {
    this.id = 0
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
    this.drainFinalizerQueue()
    // this.scopeList.clear()
    RefBase.finalizeAll(this.finalizing_reflist)
    RefBase.finalizeAll(this.reflist)

    this.tryCatch.extractException()
    this.ctx.envStore.remove(this.id)
  }
}
