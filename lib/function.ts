function napi_create_function (env: napi_env, utf8name: Pointer<const_char>, length: size_t, cb: napi_callback, data: void_p, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [result, cb], () => {
      const _a = (() => function (this: any): any {
        const callbackInfo = {
          _this: this,
          _data: data,
          _length: arguments.length,
          _args: Array.prototype.slice.call(arguments),
          _newTarget: new.target,
          _isConstructCall: !!new.target
        }
        const ret = envObject.callInNewHandleScope((scope) => {
          const cbinfoHandle = scope.add(callbackInfo)
          const napiValue = makeDynCall('iii', 'cb')(env, cbinfoHandle.id)
          return (!napiValue) ? undefined : envObject.handleStore.get(napiValue)!.value
        })
        if (envObject.tryCatch.hasCaught()) {
          const err = envObject.tryCatch.extractException()!
          throw err
        }
        return ret
      })()

      if (emnapi.canSetFunctionName) {
        Object.defineProperty(_a, 'name', {
          value: (utf8name === emnapi.NULL || length === 0) ? '' : (length === -1 ? UTF8ToString(utf8name) : UTF8ToString(utf8name, length))
        })
      }

      const valueHandle = envObject.getCurrentScope().add(_a)
      HEAP32[result >> 2] = valueHandle.id
      return emnapi.getReturnStatus(env)
    })
  })
}

function napi_get_cb_info (env: napi_env, cbinfo: napi_callback_info, argc: Pointer<size_t>, argv: Pointer<napi_value>, this_arg: Pointer<napi_value>, data: void_pp): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [cbinfo], () => {
      try {
        const cbinfoValue: ICallbackInfo = envObject.handleStore.get(cbinfo)!.value
        if (argv !== emnapi.NULL) {
          if (argc === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
          const argcValue = HEAPU32[argc >> 2]
          const arrlen = argcValue < cbinfoValue._length ? argcValue : cbinfoValue._length
          for (let i = 0; i < arrlen; i++) {
            HEAP32[(argv >> 2) + i] = envObject.getCurrentScope().add(cbinfoValue._args[i]).id
          }
        }
        if (argc !== emnapi.NULL) {
          HEAPU32[argc >> 2] = cbinfoValue._length
        }
        if (this_arg !== emnapi.NULL) {
          HEAP32[this_arg >> 2] = envObject.getCurrentScope().add(cbinfoValue._this).id
        }
        if (data !== emnapi.NULL) {
          HEAP32[data >> 2] = cbinfoValue._data
        }
        return emnapi.napi_clear_last_error(env)
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
    })
  })
}

emnapiImplement('napi_create_function', napi_create_function)
emnapiImplement('napi_get_cb_info', napi_get_cb_info)
