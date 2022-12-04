import type { Handle } from './Handle'
import type { Context } from './Context'
import { IStoreValue, Store } from './Store'
import { TryCatch, isReferenceType } from './util'
import { RefTracker } from './RefTracker'
import { HandleScope } from './HandleScope'
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

  public static create (
    ctx: Context,
    emnapiGetDynamicCalls: IDynamicCalls,
    lastError: ILastError
  ): Env {
    const env = new Env(ctx, emnapiGetDynamicCalls, lastError)
    ctx.envStore.add(env)
    return env
  }

  private constructor (
    public readonly ctx: Context,
    public emnapiGetDynamicCalls: IDynamicCalls,
    public lastError: ILastError
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

  public ensureHandle (value: any): Handle<any> {
    if (isReferenceType(value)) {
      const handle = this.ctx.handleStore.getObjectHandle(value)
      if (!handle) {
        // not exist in handle store
        return this.ctx.currentScope!.add(this, value)
      }
      if (handle.value === value) {
        // exist in handle store
        if (!handle.inScope) {
          this.ctx.currentScope!.addHandle(handle)
        }
        return handle
      }
      // alive, go back to handle store
      handle.value = value
      Store.prototype.add.call(this.ctx.handleStore, handle)
      this.ctx.currentScope!.addHandle(handle)
      return handle
    }

    return this.ctx.currentScope!.add(this, value)
  }

  public ensureHandleId (value: any): napi_value {
    return this.ensureHandle(value).id
  }

  public clearLastError (): napi_status {
    this.lastError.setErrorCode(napi_status.napi_ok)
    this.lastError.setErrorMessage(0)

    return napi_status.napi_ok
  }

  public setLastError (error_code: napi_status, _engine_error_code: uint32_t = 0, _engine_reserved: void_p = 0): napi_status {
    this.lastError.setErrorCode(error_code)
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
      if (this.lastError.getErrorCode() === napi_status.napi_pending_exception) {
        this.clearLastError()
      }
      throw err
    }
    return r
  }

  public callFinalizer (cb: napi_finalize, data: void_p, hint: void_p): void {
    const scope = this.ctx.openScope(this, HandleScope)
    try {
      this.callIntoModule((envObject) => {
        this.emnapiGetDynamicCalls.call_vppp(cb, envObject.id, data, hint)
      })
    } catch (err) {
      this.ctx.closeScope(this, scope)
      throw err
    }
    this.ctx.closeScope(this, scope)
  }

  public dispose (): void {
    // this.scopeList.clear()
    RefBase.finalizeAll(this.finalizing_reflist)
    RefBase.finalizeAll(this.reflist)

    this.tryCatch.extractException()
    try {
      this.lastError.dispose()
    } catch (_) {}
    this.lastError = null!
    this.ctx.envStore.remove(this.id)
  }
}
