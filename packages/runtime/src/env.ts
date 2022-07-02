import { handleStore } from './Handle'
import type { Handle } from './Handle'
import { envStore } from './EnvStore'
import { IStoreValue, Store } from './Store'
import { TryCatch, isReferenceType } from './util'
import { closeScope, currentScope, openScope } from './scope'
import { RefTracker } from './RefTracker'
import { HandleScope } from './HandleScope'
import { RefBase } from './RefBase'

export interface ILastError {
  setErrorMessage: (ptr: number) => void
  getErrorCode: () => number
  setErrorCode: (code: number) => void
  data: Pointer<napi_extended_error_info>
  dispose (): void
}

export interface IInstanceData {
  data: number
  finalize_cb: number
  finalize_hint: number
}

export class Env implements IStoreValue {
  public id: number

  public openHandleScopes: number = 0

  public instanceData: IInstanceData | null = null

  public tryCatch = new TryCatch()

  public refs = 1

  public reflist = new RefTracker()
  public finalizing_reflist = new RefTracker()

  public static create (
    emnapiGetDynamicCalls: IDynamicCalls,
    lastError: ILastError
  ): Env {
    const env = new Env(emnapiGetDynamicCalls, lastError)
    envStore.add(env)
    return env
  }

  private constructor (
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
      const handle = handleStore.getObjectHandle(value)
      if (!handle) {
        // not exist in handle store
        return currentScope!.add(this, value)
      }
      if (handle.value === value) {
        // exist in handle store
        return handle
      }
      // alive, go back to handle store
      handle.value = value
      Store.prototype.add.call(handleStore, handle)
      currentScope!.addHandle(handle)
      return handle
    }

    return currentScope!.add(this, value)
  }

  public ensureHandleId (value: any): napi_value {
    return this.ensureHandle(value).id
  }

  public clearLastError (): napi_status {
    this.lastError.setErrorCode(napi_status.napi_ok)
    this.lastError.setErrorMessage(NULL)

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
    const scope = openScope(this, HandleScope)
    try {
      this.callIntoModule((envObject) => {
        this.emnapiGetDynamicCalls.call_viii(cb, envObject.id, data, hint)
      })
    } catch (err) {
      closeScope(this, scope)
      throw err
    }
    closeScope(this, scope)
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
    envStore.remove(this.id)
  }
}
