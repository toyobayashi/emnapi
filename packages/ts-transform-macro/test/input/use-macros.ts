import {
  $CHECK_ARG,
  $CHECK_ENV,
  $CHECK_ENV_NOT_IN_GC,
  $CHECK_NEW_STRING_ARGS,
  $GET_RETURN_STATUS,
  $PREAMBLE,
  $RETURN_STATUS_IF_FALSE
} from './macros'

// Call forms copied from packages/emnapi/src/script.ts.
export function runScript (env: napi_env, script: napi_value, result: Pointer<napi_value>): napi_status {
  let status: napi_status
  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, script)
    $CHECK_ARG!(envObject, result)
    status = $GET_RETURN_STATUS!(envObject)
  })
  return status!
}

// The destructuring initializer and macro arguments follow packages/emnapi/src/string.ts.
export function checkStringArgs (env: napi_env, str: const_char_p, length: number, result: Pointer<napi_value>) {
  const {
    autoLength,
    sizelength,
    envObject
  }: {
    autoLength: boolean
    sizelength: number
    envObject: Env
  } = $CHECK_NEW_STRING_ARGS!(env, str, length, result)
  return autoLength ? sizelength : envObject.clearLastError()
}

// This direct call (without !) is from packages/emnapi/src/value/create.ts.
export function checkPropertyName (envObject: Env, name_value: string | symbol) {
  $RETURN_STATUS_IF_FALSE(envObject, typeof name_value === 'string' || typeof name_value === 'symbol', napi_status.napi_name_expected)
  return $GET_RETURN_STATUS!(envObject)
}

// These variable and statement forms are used throughout emnapi/src.
export function checkEnvironment (env: napi_env) {
  $CHECK_ENV!(env)
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  return envObject.clearLastError()
}

// This unannotated dollar helper follows packages/emnapi/src/emnapi.ts; it must survive macro removal.
export function $emnapiGetMemoryAddress (arrayBufferOrView: ArrayBuffer | ArrayBufferView): ArrayBufferPointer {
  const isArrayBuffer = arrayBufferOrView instanceof ArrayBuffer
  const isDataView = arrayBufferOrView instanceof DataView
  const isTypedArray = ArrayBuffer.isView(arrayBufferOrView) && !isDataView
  if (!isArrayBuffer && !isTypedArray && !isDataView && !emnapiExternalMemory.isSharedArrayBuffer(arrayBufferOrView)) {
    throw new TypeError('emnapiGetMemoryAddress expect ArrayBuffer or ArrayBufferView as first parameter')
  }

  let info: ArrayBufferPointer
  if (isArrayBuffer) {
    info = emnapiExternalMemory.getArrayBufferPointer(arrayBufferOrView as ArrayBuffer, false)
  } else {
    info = emnapiExternalMemory.getViewPointer(arrayBufferOrView as ArrayBufferView, false)
  }
  return {
    address: info.address,
    ownership: info.ownership,
    runtimeAllocated: info.runtimeAllocated
  }
}
