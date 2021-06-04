mergeInto(LibraryManager.library, {
  napi_create_function: function (_env: napi_env, utf8name: Pointer<const_char>, length: size_t, cb: napi_callback, data: Pointer<any>, result: Pointer<napi_value>) {
    const fn = function () {
      const callbackInfo = {
        _this: this,
        _data: data,
        _length: arguments.length,
        _args: Array.prototype.slice.call(arguments),
        _newTarget: new.target,
        _isConstructCall: !!new.target
      }
      return emnapi.callInNewHandleScope((scope) => {
        const cbinfoHandle = scope.add(callbackInfo)
        const napiValue = dynCall_iii(cb, _env, cbinfoHandle.id)
        return emnapi.Handle.store[napiValue].value
      })
    }
    fn.name = length === 0xffffffff ? UTF8ToString(utf8name) : UTF8ToString(utf8name, length)

    const valueHandle = emnapi.getCurrentScope().add(fn)

    HEAPU32[result >> 2] = valueHandle.id
    return 0
  },
  napi_create_function__deps: [
    '$emnapi'
  ]
})
