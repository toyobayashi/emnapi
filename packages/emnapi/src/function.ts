function napi_create_function (env: napi_env, utf8name: Pointer<const_char>, length: size_t, cb: napi_callback, data: void_p, result: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let value: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    $CHECK_ARG!(envObject, cb)

    $from64('length')

    const fresult = emnapiCreateFunction(envObject, utf8name, length, cb, data)
    if (fresult.status !== napi_status.napi_ok) return envObject.setLastError(fresult.status)
    const f = fresult.f
    const valueHandle = emnapiCtx.addToCurrentScope(f)
    $from64('result')

    value = valueHandle.id
    $makeSetValue('result', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}

function napi_get_cb_info (env: napi_env, _cbinfo: napi_callback_info, argc: Pointer<size_t>, argv: Pointer<napi_value>, this_arg: Pointer<napi_value>, data: void_pp): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!

  const cbinfoValue = emnapiCtx.cbinfoStack.current!

  $from64('argc')
  $from64('argv')

  if (argv) {
    $CHECK_ARG!(envObject, argc)
    const argcValue = $makeGetValue('argc', 0, SIZE_TYPE)
    $from64('argcValue')

    const len = cbinfoValue.args.length
    const arrlen = argcValue < len ? argcValue : len
    let i = 0

    for (; i < arrlen; i++) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const argVal = envObject.ensureHandleId(cbinfoValue.args[i])
      $makeSetValue('argv', 'i * ' + POINTER_SIZE, 'argVal', '*')
    }
    if (i < argcValue) {
      for (; i < argcValue; i++) {
        $makeSetValue('argv', 'i * ' + POINTER_SIZE, '1', '*')
      }
    }
  }
  if (argc) {
    $makeSetValue('argc', 0, 'cbinfoValue.args.length', SIZE_TYPE)
  }
  if (this_arg) {
    $from64('this_arg')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const v = envObject.ensureHandleId(cbinfoValue.thiz)
    $makeSetValue('this_arg', 0, 'v', '*')
  }
  if (data) {
    $from64('data')
    $makeSetValue('data', 0, 'cbinfoValue.data', '*')
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
  let i = 0
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let v: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, recv)

    $from64('argc')
    $from64('argv')
    $from64('result')

    argc = argc >>> 0
    if (argc > 0) {
      if (!argv) return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const v8recv = emnapiCtx.handleStore.get(recv)!.value
    if (!func) return envObject.setLastError(napi_status.napi_invalid_arg)
    const v8func = emnapiCtx.handleStore.get(func)!.value as Function
    if (typeof v8func !== 'function') return envObject.setLastError(napi_status.napi_invalid_arg)
    const args = []
    for (; i < argc; i++) {
      const argVal = $makeGetValue('argv', 'i * ' + POINTER_SIZE, '*')
      args.push(emnapiCtx.handleStore.get(argVal)!.value)
    }
    const ret = v8func.apply(v8recv, args)
    if (result) {
      v = envObject.ensureHandleId(ret)
      $makeSetValue('result', 0, 'v', '*')
    }
    return envObject.clearLastError()
  })
}

function napi_new_instance (
  env: napi_env,
  constructor: napi_value,
  argc: size_t,
  argv: Pointer<napi_value>,
  result: Pointer<napi_value>
): napi_status {
  let i: number
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let v: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, constructor)
    $from64('argc')
    $from64('argv')
    $from64('result')

    argc = argc >>> 0
    if (argc > 0) {
      if (!argv) return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)

    const Ctor: new (...args: any[]) => any = emnapiCtx.handleStore.get(constructor)!.value
    if (typeof Ctor !== 'function') return envObject.setLastError(napi_status.napi_invalid_arg)
    let ret: any
    if (emnapiCtx.feature.supportReflect) {
      const argList = Array(argc)
      for (i = 0; i < argc; i++) {
        const argVal = $makeGetValue('argv', 'i * ' + POINTER_SIZE, '*')
        argList[i] = emnapiCtx.handleStore.get(argVal)!.value
      }
      ret = Reflect.construct(Ctor, argList, Ctor)
    } else {
      const args = Array(argc + 1) as [undefined, ...any[]]
      args[0] = undefined
      for (i = 0; i < argc; i++) {
        const argVal = $makeGetValue('argv', 'i * ' + POINTER_SIZE, '*')
        args[i + 1] = emnapiCtx.handleStore.get(argVal)!.value
      }
      const BoundCtor = Ctor.bind.apply(Ctor, args) as new () => any
      ret = new BoundCtor()
    }
    if (result) {
      v = envObject.ensureHandleId(ret)
      $makeSetValue('result', 0, 'v', '*')
    }
    return envObject.getReturnStatus()
  })
}

function napi_get_new_target (
  env: napi_env,
  _cbinfo: napi_callback_info,
  result: Pointer<napi_value>
): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  // if (!cbinfo) return envObject.setLastError(napi_status.napi_invalid_arg)
  $CHECK_ARG!(envObject, result)

  $from64('result')

  const cbinfoValue = emnapiCtx.cbinfoStack.current!
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const value = cbinfoValue.getNewTarget(envObject)
  $makeSetValue('result', 0, 'value', '*')
  return envObject.clearLastError()
}

emnapiImplement('napi_create_function', 'ipppppp', napi_create_function, ['$emnapiCreateFunction'])
emnapiImplement('napi_get_cb_info', 'ipppppp', napi_get_cb_info)
emnapiImplement('napi_call_function', 'ipppppp', napi_call_function)
emnapiImplement('napi_new_instance', 'ippppp', napi_new_instance)
emnapiImplement('napi_get_new_target', 'ippp', napi_get_new_target)
