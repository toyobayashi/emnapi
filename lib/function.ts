function napi_create_function (env: napi_env, utf8name: Pointer<const_char>, length: size_t, cb: napi_callback, data: Pointer<any>, result: Pointer<napi_value>) {
  function executor (this: any, newTarget: any, ...args: any[]) {
    const callbackInfo = {
      _this: this,
      _data: data,
      _length: args.length,
      _args: args,
      _newTarget: newTarget,
      _isConstructCall: !!newTarget
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

  const valueHandle = emnapi.getCurrentScope().add(utf8name === 0
    ? function (this: any) {
        const args = Array.prototype.slice.call(arguments)
        args.unshift(new.target)
        return executor.apply(this, args as any)
      }
    : (function () {
      const functionName = length === -1 ? UTF8ToString(utf8name) : UTF8ToString(utf8name, length)
      try {
        return (new Function('executor', `return function ${functionName} () {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(new.target);
          return executor.apply(this, args);
        };`))(executor)
      } catch (_) {
        return function (this: any) {
          const args = Array.prototype.slice.call(arguments)
          args.unshift(new.target)
          return executor.apply(this, args as any)
        }
      }
    })()
  )

  HEAPU32[result >> 2] = valueHandle.id
  return emnapi.getReturnStatus(env)
}

emnapiImplement('napi_create_function', napi_create_function)
