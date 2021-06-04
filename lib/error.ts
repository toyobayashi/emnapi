mergeInto(LibraryManager.library, {
  napi_get_last_error_info: function (_env: napi_env, result: Pointer<Pointer<napi_extended_error_info>>): emnapi.napi_status {
    emnapi.napiExtendedErrorInfo.error_message = emnapi.errorMessagesPtr[emnapi.napiExtendedErrorInfo.error_code]
    HEAPU32[emnapi.napiExtendedErrorInfoPtr >> 2] = emnapi.napiExtendedErrorInfo.error_message
    
    HEAPU32[result >> 2] = emnapi.napiExtendedErrorInfoPtr
    return emnapi.napi_status.napi_ok
  },
  napi_get_last_error_info__deps: ['$emnapi'],
})
