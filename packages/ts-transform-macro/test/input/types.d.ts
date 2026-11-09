type napi_env = number
type void_p = number
type const_char_p = number
type napi_value = number
type Pointer<T> = number

declare const enum napi_status {
  napi_ok = 0,
  napi_invalid_arg = 1,
  napi_name_expected = 4,
  napi_pending_exception = 10,
  napi_cannot_run_js = 23
}

interface Env {
  lastException: {
    isEmpty (): boolean
    resetTo (value: unknown): void
  }
  canCallIntoJs (): boolean
  moduleApiVersion: number
  clearLastError (): napi_status
  setLastError (status: napi_status): napi_status
  checkGCAccess (): void
}

interface ArrayBufferPointer {
  address: number
  ownership: number
  runtimeAllocated: number
}

declare const emnapiExternalMemory: {
  isSharedArrayBuffer (value: any): boolean
  getArrayBufferPointer (value: ArrayBuffer, shouldCopy: boolean): ArrayBufferPointer
  getViewPointer (value: ArrayBufferView, shouldCopy: boolean): ArrayBufferPointer
}
