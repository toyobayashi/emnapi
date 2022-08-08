/* eslint-disable @typescript-eslint/restrict-plus-operands */
function napi_create_function (env: napi_env, utf8name: Pointer<const_char>, length: size_t, cb: napi_callback, data: void_p, result: Pointer<napi_value>): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result, cb], () => {
      const fresult = emnapiCreateFunction(envObject, utf8name, length, cb, data)
      if (fresult.status !== napi_status.napi_ok) return envObject.setLastError(fresult.status)
      const f = fresult.f
      const valueHandle = emnapi.addToCurrentScope(envObject, f)
      // #if MEMORY64
      result = Number(result)
      // #endif

      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const value = valueHandle.id
      $makeSetValue('result', 0, 'value', '*')
      return envObject.getReturnStatus()
    })
  })
}

function napi_get_cb_info (env: napi_env, cbinfo: napi_callback_info, argc: Pointer<size_t>, argv: Pointer<napi_value>, this_arg: Pointer<napi_value>, data: void_pp): napi_status {
  if (!env) return napi_status.napi_invalid_arg
  const envObject = emnapi.envStore.get(env)!
  if (!cbinfo) return envObject.setLastError(napi_status.napi_invalid_arg)

  const cbinfoValue: emnapi.CallbackInfo = emnapi.cbInfoStore.get(cbinfo)!

  // #if MEMORY64
  argc = Number(argc)
  argv = Number(argv)
  // #endif

  if (argv) {
    if (!argc) return envObject.setLastError(napi_status.napi_invalid_arg)
    let argcValue = 0
    // #if MEMORY64
    argcValue = Number(HEAPU64[Number(argc) >> 3])
    // #else
    argcValue = HEAPU32[argc >> 2]
    // #endif
    const arrlen = argcValue < cbinfoValue._length ? argcValue : cbinfoValue._length
    let i = 0

    for (; i < arrlen; i++) {
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const argVal = envObject.ensureHandleId(cbinfoValue._args[i])
      $makeSetValue('argv', 'i * ' + POINTER_SIZE, 'argVal', '*')
    }
    if (i < argcValue) {
      for (; i < argcValue; i++) {
        $makeSetValue('argv', 'i * ' + POINTER_SIZE, '1', '*')
      }
    }
  }
  if (argc) {
    $makeSetValue('argc', 0, 'cbinfoValue._length', SIZE_TYPE)
  }
  if (this_arg) {
    // #if MEMORY64
    this_arg = Number(this_arg)
    // #endif

    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const v = envObject.ensureHandleId(cbinfoValue._this)
    $makeSetValue('this_arg', 0, 'v', '*')
  }
  if (data) {
    // #if MEMORY64
    data = Number(data)
    // #endif
    $makeSetValue('data', 0, 'cbinfoValue._data', '*')
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
      // #if MEMORY64
      argc = Number(argc) >>> 0
      argv = Number(argv)
      result = Number(result)
      // #else
      argc = argc >>> 0
      // #endif
      if (argc > 0) {
        if (!argv) return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      const v8recv = emnapi.handleStore.get(recv)!.value
      if (!func) return envObject.setLastError(napi_status.napi_invalid_arg)
      const v8func = emnapi.handleStore.get(func)!.value as Function
      if (typeof v8func !== 'function') return envObject.setLastError(napi_status.napi_invalid_arg)
      const args = []
      for (let i = 0; i < argc; i++) {
        const argVal = $makeGetValue('argv', 'i * ' + POINTER_SIZE, '*')
        args.push(emnapi.handleStore.get(argVal)!.value)
      }
      const ret = v8func.apply(v8recv, args)
      if (result) {
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const v = envObject.ensureHandleId(ret)
        $makeSetValue('result', 0, 'v', '*')
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
      // #if MEMORY64
      argc = Number(argc) >>> 0
      argv = Number(argv)
      result = Number(result)
      // #else
      argc = argc >>> 0
      // #endif
      if (argc > 0) {
        if (!argv) return envObject.setLastError(napi_status.napi_invalid_arg)
      }
      if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)

      const Ctor: new (...args: any[]) => any = emnapi.handleStore.get(constructor)!.value
      if (typeof Ctor !== 'function') return envObject.setLastError(napi_status.napi_invalid_arg)
      const args = Array(argc + 1) as [undefined, ...any[]]
      args[0] = undefined
      for (let i = 0; i < argc; i++) {
        const argVal = $makeGetValue('argv', 'i * ' + POINTER_SIZE, '*')
        args[i + 1] = emnapi.handleStore.get(argVal)!.value
      }
      const BoundCtor = Ctor.bind.apply(Ctor, args) as new () => any
      const ret = new BoundCtor()
      if (result) {
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const v = envObject.ensureHandleId(ret)
        $makeSetValue('result', 0, 'v', '*')
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
  if (!env) return napi_status.napi_invalid_arg
  const envObject = emnapi.envStore.get(env)!
  if (!cbinfo) return envObject.setLastError(napi_status.napi_invalid_arg)
  if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)

  // #if MEMORY64
  result = Number(result)
  // #endif

  const cbinfoValue: emnapi.CallbackInfo = emnapi.cbInfoStore.get(cbinfo)!
  // @ts-expect-error
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = cbinfoValue._newTarget ? envObject.ensureHandleId(cbinfoValue._newTarget) : 0
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

emnapiImplement('napi_create_function', napi_create_function, ['$emnapiCreateFunction'])
emnapiImplement('napi_get_cb_info', napi_get_cb_info)
emnapiImplement('napi_call_function', napi_call_function)
emnapiImplement('napi_new_instance', napi_new_instance)
emnapiImplement('napi_get_new_target', napi_get_new_target)
