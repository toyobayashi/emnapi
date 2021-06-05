// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {

  export const instanceData = {
    data: 0,
    finalize_cb: 0,
    finalize_hint: 0
  }

  export enum napi_status {
    napi_ok,
    napi_invalid_arg,
    napi_object_expected,
    napi_string_expected,
    napi_name_expected,
    napi_function_expected,
    napi_number_expected,
    napi_boolean_expected,
    napi_array_expected,
    napi_generic_failure,
    napi_pending_exception,
    napi_cancelled,
    napi_escape_called_twice,
    napi_handle_scope_mismatch,
    napi_callback_scope_mismatch,
    napi_queue_full,
    napi_closing,
    napi_bigint_expected,
    napi_date_expected,
    napi_arraybuffer_expected,
    napi_detachable_arraybuffer_expected,
    napi_would_deadlock // unused
  }

  export const errorMessages = [
    '',
    'Invalid argument',
    'An object was expected',
    'A string was expected',
    'A string or symbol was expected',
    'A function was expected',
    'A number was expected',
    'A boolean was expected',
    'An array was expected',
    'Unknown failure',
    'An exception is pending',
    'The async work item was cancelled',
    'napi_escape_handle already called on scope',
    'Invalid handle scope usage',
    'Invalid callback scope usage',
    'Thread-safe function queue is full',
    'Thread-safe function handle is closing',
    'A bigint was expected',
    'A date was expected',
    'An arraybuffer was expected',
    'A detachable arraybuffer was expected',
    'Main thread would deadlock'
  ]

  export let errorMessagesPtr: char_p[]

  export const napiExtendedErrorInfo = {
    error_message: 0,
    engine_reserved: 0,
    engine_error_code: 0,
    error_code: napi_status.napi_ok
  }
  export let napiExtendedErrorInfoPtr: Pointer<napi_extended_error_info>

  function initErrorMemory (): void {
    if (!errorMessagesPtr) {
      errorMessagesPtr = errorMessages.map(msg => msg ? allocateUTF8(msg) : 0)
      napiExtendedErrorInfoPtr = _malloc(16)
    }
  }

  addOnInit(initErrorMemory)

  export function napi_set_last_error (_env: napi_env, error_code: napi_status, engine_error_code: uint32_t = 0, engine_reserved: void_p = 0): napi_status {
    napiExtendedErrorInfo.error_code = error_code
    napiExtendedErrorInfo.engine_error_code = engine_error_code
    napiExtendedErrorInfo.engine_reserved = engine_reserved

    HEAPU32[(napiExtendedErrorInfoPtr >> 2) + 1] = napiExtendedErrorInfo.engine_reserved
    HEAPU32[(napiExtendedErrorInfoPtr >> 2) + 2] = napiExtendedErrorInfo.engine_error_code
    HEAPU32[(napiExtendedErrorInfoPtr >> 2) + 3] = napiExtendedErrorInfo.error_code
    return error_code
  }

  export function napi_clear_last_error (_env: napi_env): napi_status {
    napiExtendedErrorInfo.error_code = napi_status.napi_ok
    napiExtendedErrorInfo.engine_error_code = 0
    napiExtendedErrorInfo.engine_reserved = 0

    HEAPU32[(napiExtendedErrorInfoPtr >> 2) + 1] = napiExtendedErrorInfo.engine_reserved
    HEAPU32[(napiExtendedErrorInfoPtr >> 2) + 2] = napiExtendedErrorInfo.engine_error_code
    HEAPU32[(napiExtendedErrorInfoPtr >> 2) + 3] = napiExtendedErrorInfo.error_code
    return napi_status.napi_ok
  }

  export function getReturnStatus (env: napi_env): napi_status {
    return !tryCatch.hasCaught() ? napi_status.napi_ok : napi_set_last_error(env, napi_status.napi_pending_exception)
  }

}
