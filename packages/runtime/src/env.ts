import { IHandleScope, HandleScope } from './HandleScope'
import { handleStore } from './Handle'
import { envStore } from './EnvStore'
import { IStoreValue, Store } from './Store'
import { TryCatch, isReferenceType } from './util'

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

  private _rootScope!: HandleScope
  private currentScope: IHandleScope | null = null

  public tryCatch = new TryCatch()

  public static create (
    emnapiGetDynamicCalls: IDynamicCalls,
    lastError: ILastError
  ): Env {
    const env = new Env(emnapiGetDynamicCalls, lastError)
    envStore.add(env)

    env._rootScope = HandleScope.create(env, null)
    return env
  }

  private constructor (
    public emnapiGetDynamicCalls: IDynamicCalls,
    public lastError: ILastError
  ) {
    this.id = 0
  }

  public openScope<Scope extends HandleScope> (ScopeConstructor = HandleScope): Scope {
    if (this.currentScope) {
      const scope = ScopeConstructor.create(this, this.currentScope)
      this.currentScope.child = scope
      this.currentScope = scope
    } else {
      this.currentScope = this._rootScope
    }
    // this.scopeList.push(scope)
    this.openHandleScopes++
    return this.currentScope as Scope
  }

  public closeScope (scope: IHandleScope): void {
    if (scope === this.currentScope) {
      this.currentScope = scope.parent
    }
    if (scope.parent) {
      scope.parent.child = scope.child
    }
    if (scope.child) {
      scope.child.parent = scope.parent
    }
    if (scope === this._rootScope) {
      scope.clearHandles()
      scope.child = null
    } else {
      scope.dispose()
    }
    // this.scopeList.pop()
    this.openHandleScopes--
  }

  public getCurrentScope (): IHandleScope {
    return this.currentScope!
  }

  public ensureHandleId (value: any): napi_value {
    if (isReferenceType(value)) {
      const handle = handleStore.getObjectHandle(value)
      if (!handle) {
        // not exist in handle store
        return this.currentScope!.add(value).id
      }
      if (handle.value === value) {
        // exist in handle store
        return handle.id
      }
      // alive, go back to handle store
      handle.value = value
      Store.prototype.add.call(handleStore, handle)
      this.currentScope!.addHandle(handle)
      return handle.id
    }

    return this.currentScope!.add(value).id
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
      throw err
    }
    return r
  }

  public dispose (): void {
    // this.scopeList.clear()
    this.currentScope = null
    this.tryCatch.extractException()
    try {
      this.lastError.dispose()
    } catch (_) {}
    this.lastError = null!
    envStore.remove(this.id)
  }
}
