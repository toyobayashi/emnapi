import { CallbackInfoStore } from './CallbackInfo'
import { DeferredStore } from './Deferred'
import { HandleStore } from './Handle'
import { ScopeStore, IHandleScope, HandleScope } from './HandleScope'
import { RefStore } from './Reference'
import { IStoreValue, Store } from './Store'
import { TryCatch, envStore, isReferenceType } from './util'

export interface ILastError {
  setErrorMessage: (ptr: number) => void
  getErrorCode: () => number
  setErrorCode: (code: number) => void
  data: Pointer<napi_extended_error_info>
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

  public handleStore!: HandleStore
  public scopeStore!: ScopeStore
  public cbInfoStore!: CallbackInfoStore
  public refStore!: RefStore
  public deferredStore!: DeferredStore

  private _rootScope!: HandleScope
  private currentScope: IHandleScope | null = null

  public lastError: ILastError

  public tryCatch = new TryCatch()

  public static create (
    malloc: (size: number) => number,
    free: (ptr: number) => void,
    call_iii: (ptr: number, ...args: [number, number]) => number,
    call_viii: (ptr: number, ...args: [number, number, number]) => void,
    Module: any
  ): Env {
    const env = new Env(malloc, free, call_iii, call_viii, Module)
    envStore.add(env)
    env.refStore = new RefStore()
    env.handleStore = new HandleStore(env)
    env.deferredStore = new DeferredStore()
    env.scopeStore = new ScopeStore()
    env.cbInfoStore = new CallbackInfoStore()

    env._rootScope = HandleScope.create(env, null)
    return env
  }

  private constructor (
    public malloc: (size: number) => number,
    public free: (ptr: number) => void,
    public call_iii: (ptr: number, ...args: [number, number]) => number,
    public call_viii: (ptr: number, ...args: [number, number, number]) => void,
    public Module: any
  ) {
    this.id = 0
    const napiExtendedErrorInfoPtr = malloc(16)
    this.lastError = {
      data: napiExtendedErrorInfoPtr,
      getErrorCode: () => Module.HEAP32[(napiExtendedErrorInfoPtr >> 2) + 3],
      setErrorCode: (code) => {
        Module.HEAP32[(napiExtendedErrorInfoPtr >> 2) + 3] = code
      },
      setErrorMessage: (ptr) => {
        Module.HEAP32[napiExtendedErrorInfoPtr >> 2] = ptr
      }
    }
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
      const handle = this.handleStore.getObjectHandle(value)
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
      Store.prototype.add.call(this.handleStore, handle)
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
    this.deferredStore.dispose()
    this.refStore.dispose()
    this.scopeStore.dispose()
    this.handleStore.dispose()
    this.tryCatch.extractException()
    try {
      this.free(this.lastError.data)
      this.lastError.data = NULL
    } catch (_) {}
    this.lastError = null!
    envStore.remove(this.id)
  }
}
