function napi_create_function (env: napi_env, utf8name: Pointer<const_char>, length: size_t, cb: napi_callback, data: Pointer<any>, result: Pointer<napi_value>): emnapi.napi_status {
  if (result === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  if (cb === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)

  const _a = (() => function (this: any): any {
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
      const napiValue = makeDynCall('iii', 'cb')(env, cbinfoHandle.id)
      return emnapi.Handle.store[napiValue].value
    })
    if (emnapi.tryCatch.hasCaught()) {
      const err = emnapi.tryCatch.extractException()
      throw err!
    }
    return ret
  })()

  if (emnapi.canSetFunctionName) {
    Object.defineProperty(_a, 'name', {
      value: (utf8name === 0 || length === 0) ? '' : (length === -1 ? UTF8ToString(utf8name) : UTF8ToString(utf8name, length))
    })
  }

  const valueHandle = emnapi.getCurrentScope().add(_a)

  HEAP32[result >> 2] = valueHandle.id
  return emnapi.getReturnStatus(env)
}

emnapiImplement('napi_create_function', napi_create_function)
