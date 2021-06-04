mergeInto(LibraryManager.library, {
  napi_create_int32: function (_env: Pointer, value: number, result: Pointer) {
    const valueHandle = new emnapi.Handle(value)
    emnapi.getCurrentScope().handles.push(valueHandle)
    HEAPU32[result >> 2] = valueHandle.id
    return 0
  },
  napi_create_int32__deps: ['$emnapi']
})
