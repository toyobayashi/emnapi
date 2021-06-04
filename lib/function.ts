function napi_create_function (env: napi_env, utf8name: Pointer<const_char>, length: size_t, cb: napi_callback, data: Pointer<any>, result: Pointer<napi_value>) {
  const fn = function (this: any) {
    const callbackInfo = {
      _this: this,
      _data: data,
      _length: arguments.length,
      _args: Array.prototype.slice.call(arguments),
      _newTarget: new.target,
      _isConstructCall: !!new.target
    }
    const ret = emnapi.callInNewHandleScope((scope) => {
      const cbinfoHandle = scope.add(callbackInfo)
      const napiValue = dynCall_iii(cb, env, cbinfoHandle.id)
      return emnapi.Handle.store[napiValue].value
    })
    if (emnapi.tryCatch.hasCaught()) {
      const err = emnapi.tryCatch.extractException()
      throw err
    }
    return ret
  }
  fn.name = length === 0xffffffff ? UTF8ToString(utf8name) : UTF8ToString(utf8name, length)

  const valueHandle = emnapi.getCurrentScope().add(fn)

  HEAPU32[result >> 2] = valueHandle.id
  return emnapi.getReturnStatus(env)
}

emnapiImplement('napi_create_function', napi_create_function)
