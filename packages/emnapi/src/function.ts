function napi_create_function (env: napi_env, utf8name: Pointer<const_char>, length: size_t, cb: napi_callback, data: void_p, result: Pointer<napi_value>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result, cb], () => {
      const fresult = emnapiCreateFunction(envObject, utf8name, length, cb, data)
      if (fresult.status !== napi_status.napi_ok) return envObject.setLastError(fresult.status)
      const f = fresult.f
      const valueHandle = emnapi.addToCurrentScope(envObject, f)
      HEAP32[result >> 2] = valueHandle.id
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_cb_info (env: napi_env, cbinfo: napi_callback_info, argc: Pointer<size_t>, argv: Pointer<napi_value>, this_arg: Pointer<napi_value>, data: void_pp): napi_status {
  if (env === NULL) return napi_status.napi_invalid_arg
  const envObject = emnapi.envStore.get(env)!
  if (cbinfo === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)

  const cbinfoValue: emnapi.CallbackInfo = emnapi.cbInfoStore.get(cbinfo)!
  if (argv !== NULL) {
    if (argc === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
    const argcValue = HEAPU32[argc >> 2]
    const arrlen = argcValue < cbinfoValue._length ? argcValue : cbinfoValue._length
    let i = 0
    const argvI32Index = argv >> 2
    for (; i < arrlen; i++) {
      HEAP32[argvI32Index + i] = envObject.ensureHandleId(cbinfoValue._args[i])
    }
    if (i < argcValue) {
      for (; i < argcValue; i++) {
        HEAP32[argvI32Index + i] = 1 // emnapi.HandleStore.ID_UNDEFINED
      }
    }
  }
  if (argc !== NULL) {
    HEAPU32[argc >> 2] = cbinfoValue._length
  }
  if (this_arg !== NULL) {
    HEAP32[this_arg >> 2] = envObject.ensureHandleId(cbinfoValue._this)
  }
  if (data !== NULL) {
    HEAP32[data >> 2] = cbinfoValue._data
  }
  return envObject.clearLastError()
}

function napi_call_function (
  env: napi_env,
  recv: napi_value,
  func: napi_value,
  argc: size_t,
  argv: Const<Pointer<napi_value>>,
  result: Pointer<napi_value>
): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [recv], () => {
      argc = argc >>> 0
      if (argc > 0) {
        if (argv === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const v8recv = emnapi.handleStore.get(recv)!.value
      if (func === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
      const v8func = emnapi.handleStore.get(func)!.value as Function
      if (typeof v8func !== 'function') return envObject.setLastError(napi_status.napi_invalid_arg)
      const args = []
      for (let i = 0; i < argc; i++) {
        const argPtr = argv + (i * 4)
        args.push(emnapi.handleStore.get(HEAP32[argPtr >> 2])!.value)
      }
      const ret = v8func.apply(v8recv, args)
      if (result !== NULL) {
        HEAP32[result >> 2] = envObject.ensureHandleId(ret)
      }
      return envObject.clearLastError()
    })
  })
}

function napi_new_instance (
  env: napi_env,
  constructor: napi_value,
  argc: size_t,
  argv: Pointer<napi_value>,
  result: Pointer<napi_value>
): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [constructor], () => {
      argc = argc >>> 0
      if (argc > 0) {
        if (argv === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      if (result === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)

      const Ctor: new (...args: any[]) => any = emnapi.handleStore.get(constructor)!.value
      if (typeof Ctor !== 'function') return envObject.setLastError(napi_status.napi_invalid_arg)
      const args = Array(argc + 1) as [undefined, ...any[]]
      args[0] = undefined
      for (let i = 0; i < argc; i++) {
        const argPtr = argv + (i * 4)
        args[i + 1] = emnapi.handleStore.get(HEAP32[argPtr >> 2])!.value
      }
      const BoundCtor = Ctor.bind.apply(Ctor, args) as new () => any
      const ret = new BoundCtor()
      if (result !== NULL) {
        HEAP32[result >> 2] = envObject.ensureHandleId(ret)
      }
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_new_target (
  env: napi_env,
  cbinfo: napi_callback_info,
  result: Pointer<napi_value>
): napi_status {
  if (env === NULL) return napi_status.napi_invalid_arg
  const envObject = emnapi.envStore.get(env)!
  if (cbinfo === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)
  if (result === NULL) return envObject.setLastError(napi_status.napi_invalid_arg)

  const cbinfoValue: emnapi.CallbackInfo = emnapi.cbInfoStore.get(cbinfo)!
  if (cbinfoValue._newTarget) {
    HEAP32[result >> 2] = envObject.ensureHandleId(cbinfoValue._newTarget)
  } else {
    HEAP32[result >> 2] = 0
  }
  return envObject.clearLastError()
}

emnapiImplement('napi_create_function', napi_create_function, ['$emnapiCreateFunction'])
emnapiImplement('napi_get_cb_info', napi_get_cb_info)
emnapiImplement('napi_call_function', napi_call_function)
emnapiImplement('napi_new_instance', napi_new_instance)
emnapiImplement('napi_get_new_target', napi_get_new_target)
