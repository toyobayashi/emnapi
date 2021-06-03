// value
mergeInto(LibraryManager.library, {
  napi_create_int32: function (_env, value, result) {
    console.log(value)
    console.log('napi_create_int32')
  },
  napi_create_int32__deps: ['$LinkedList']
})
