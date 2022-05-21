import { CallbackInfoStore } from './CallbackInfo'
import { DeferredStore } from './Deferred'
import { HandleStore } from './Handle'
import { ScopeStore, IHandleScope, HandleScope } from './HandleScope'
import { RefStore } from './Reference'
import { IStoreValue, Store } from './Store'
import { TypedArray, supportFinalizer, TryCatch, envStore, isReferenceType } from './util'

export interface ILastError {
  errorMessage: Int32Array
  engineReserved: Int32Array
  engineErrorCode: Uint32Array
  errorCode: Int32Array
  data: Pointer<napi_extended_error_info>
}

export class Env implements IStoreValue {
  public id: number

  typedArrayMemoryMap = new WeakMap<TypedArray | DataView, void_p>()
  arrayBufferMemoryMap = new WeakMap<ArrayBuffer, void_p>()
  memoryPointerDeleter: FinalizationRegistry<void_p> = supportFinalizer
    ? new FinalizationRegistry<void_p>((heldValue) => {
      this.free(heldValue)
    })
    : null!

  public openHandleScopes: number = 0

  public instanceData = {
    data: 0,
    finalize_cb: 0,
    finalize_hint: 0
  }

  public handleStore!: HandleStore
  public scopeStore!: ScopeStore
  public cbInfoStore!: CallbackInfoStore
  public refStore!: RefStore
  public deferredStore!: DeferredStore

  private currentScope: IHandleScope | null = null

  public lastError: ILastError

  public tryCatch = new TryCatch()

  public static create (
    malloc: (size: number) => number,
    free: (ptr: number) => void,
    call_iii: (ptr: number, ...args: [number, number]) => number,
    call_viii: (ptr: number, ...args: [number, number, number]) => void,
    HEAPU8: Uint8Array
  ): Env {
    const env = new Env(malloc, free, call_iii, call_viii, HEAPU8)
    envStore.add(env)
    env.refStore = new RefStore()
    env.handleStore = new HandleStore()
    env.handleStore.addGlobalConstants(env)
    env.deferredStore = new DeferredStore()
    env.scopeStore = new ScopeStore()
    env.cbInfoStore = new CallbackInfoStore()
    return env
  }

  private constructor (
    public malloc: (size: number) => number,
    public free: (ptr: number) => void,
    public call_iii: (ptr: number, ...args: [number, number]) => number,
    public call_viii: (ptr: number, ...args: [number, number, number]) => void,
    public HEAPU8: Uint8Array
  ) {
    this.id = 0
    const napiExtendedErrorInfoPtr = malloc(16)
    this.lastError = {
      data: napiExtendedErrorInfoPtr,
      errorMessage: new Int32Array(HEAPU8.buffer, napiExtendedErrorInfoPtr, 4),
      engineReserved: new Int32Array(HEAPU8.buffer, napiExtendedErrorInfoPtr + 4, 4),
      engineErrorCode: new Uint32Array(HEAPU8.buffer, napiExtendedErrorInfoPtr + 8, 4),
      errorCode: new Int32Array(HEAPU8.buffer, napiExtendedErrorInfoPtr + 12, 4)
    }
  }

  public openScope<Scope extends HandleScope> (ScopeConstructor = HandleScope): Scope {
    const scope = ScopeConstructor.create(this, this.currentScope)
    if (this.currentScope) {
      this.currentScope.child = scope
    }
    this.currentScope = scope
    // this.scopeList.push(scope)
    this.openHandleScopes++
    return scope as Scope
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
    scope.dispose()
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
    this.lastError.errorCode[0] = napi_status.napi_ok
    this.lastError.engineErrorCode[0] = 0
    this.lastError.engineReserved[0] = 0
    this.lastError.errorMessage[0] = 0

    return napi_status.napi_ok
  }

  public setLastError (error_code: napi_status, engine_error_code: uint32_t = 0, engine_reserved: void_p = 0): napi_status {
    this.lastError.errorCode[0] = error_code
    this.lastError.engineErrorCode[0] = engine_error_code
    this.lastError.engineReserved[0] = engine_reserved

    return error_code
  }

  public getReturnStatus (): napi_status {
    return !this.tryCatch.hasCaught() ? napi_status.napi_ok : this.setLastError(napi_status.napi_pending_exception)
  }

  public callIntoModule<T> (fn: (env: Env) => T): T {
    this.clearLastError()
    let r: T
    try {
      r = fn(this)
    } catch (err) {
      this.tryCatch.setError(err)
    }
    if (this.tryCatch.hasCaught()) {
      const err = this.tryCatch.extractException()!
      throw err
    }
    return r!
  }

  public getViewPointer (view: TypedArray | DataView): void_p {
    if (!supportFinalizer) {
      return NULL
    }
    if (view.buffer === this.HEAPU8.buffer) {
      return view.byteOffset
    }

    let pointer: void_p
    if (this.typedArrayMemoryMap.has(view)) {
      pointer = this.typedArrayMemoryMap.get(view)!
      this.HEAPU8.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength), pointer)
      return pointer
    }

    pointer = this.malloc(view.byteLength)
    this.HEAPU8.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength), pointer)
    this.typedArrayMemoryMap.set(view, pointer)
    this.memoryPointerDeleter.register(view, pointer)
    return pointer
  }

  public getArrayBufferPointer (arrayBuffer: ArrayBuffer): void_p {
    if ((!supportFinalizer) || (arrayBuffer === this.HEAPU8.buffer)) {
      return NULL
    }

    let pointer: void_p
    if (this.arrayBufferMemoryMap.has(arrayBuffer)) {
      pointer = this.arrayBufferMemoryMap.get(arrayBuffer)!
      this.HEAPU8.set(new Uint8Array(arrayBuffer), pointer)
      return pointer
    }

    pointer = this.malloc(arrayBuffer.byteLength)
    this.HEAPU8.set(new Uint8Array(arrayBuffer), pointer)
    this.arrayBufferMemoryMap.set(arrayBuffer, pointer)
    this.memoryPointerDeleter.register(arrayBuffer, pointer)
    return pointer
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
