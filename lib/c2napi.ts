mergeInto(LibraryManager.library, {
  napi_create_int32: function (_env: napi_env, value: int32_t, result: Pointer<napi_value>) {
    const valueHandle = new emnapi.Handle(value)
    emnapi.getCurrentScope().handles.push(valueHandle)
    HEAPU32[result >> 2] = valueHandle.id
    return 0
  },
  napi_create_int32__deps: ['$emnapi']
})
