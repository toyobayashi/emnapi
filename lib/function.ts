function napi_create_function (env: napi_env, utf8name: Pointer<const_char>, length: size_t, cb: napi_callback, data: void_p, result: Pointer<napi_value>): emnapi.napi_status {
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
      return (!napiValue) ? undefined : emnapi.Handle.store[napiValue].value
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

function napi_get_cb_info (env: napi_env, cbinfo: napi_callback_info, argc: Pointer<size_t>, argv: Pointer<napi_value>, this_arg: Pointer<napi_value>, data: void_pp): emnapi.napi_status {
  if (cbinfo === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)

  const cbinfoValue: ICallbackInfo = emnapi.Handle.store[cbinfo].value
  if (argv !== 0) {
    if (argc === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
    const argcValue = HEAPU32[argc >> 2]
    const arrlen = argcValue < cbinfoValue._length ? argcValue : cbinfoValue._length
    for (let i = 0; i < arrlen; i++) {
      HEAP32[(argv >> 2) + i] = emnapi.getCurrentScope().add(cbinfoValue._args[i]).id
    }
  }
  if (argc !== 0) {
    HEAPU32[argc >> 2] = cbinfoValue._length
  }
  if (this_arg !== 0) {
    HEAP32[this_arg >> 2] = emnapi.getCurrentScope().add(cbinfoValue._this).id
  }
  if (data !== 0) {
    HEAP32[data >> 2] = cbinfoValue._data
  }
  return emnapi.napi_clear_last_error(env)
}

emnapiImplement('napi_create_function', napi_create_function)
emnapiImplement('napi_get_cb_info', napi_get_cb_info)
