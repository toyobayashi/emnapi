mergeInto(LibraryManager.library, {
  napi_create_function: function (_env, utf8name: Pointer, length: number, cb: Pointer, data: Pointer, result: Pointer) {
    const fn = function () {
      const callbackInfo = {
        _this: this,
        _data: data,
        _length: arguments.length,
        _args: Array.prototype.slice.call(arguments)
      }
      const handleId = emnapi.callInNewEscapableHandleScope((scope) => {
        const cbinfoHandle = new emnapi.Handle(callbackInfo)
        scope.handles.push(cbinfoHandle)
        const napiValue = dynCall_iii(cb, _env, cbinfoHandle.id)
        const handle = emnapi.findHandleById(napiValue)
        if (scope.handles.indexOf(handle) !== -1) {
          return scope.escape(handle).id
        } else {
          return handle.id
        }
      })

      return emnapi.Handle.store[handleId]
    }
    fn.name = length === 0xffffffff ? UTF8ToString(utf8name) : UTF8ToString(utf8name, length)

    const valueHandle = new emnapi.Handle(fn)
    emnapi.getCurrentScope().handles.push(valueHandle)

    HEAPU32[result >> 2] = valueHandle.id
    return 0
  },
  napi_create_function__deps: [
    '$emnapi'
  ]
})
