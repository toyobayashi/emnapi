function _emnapi_node_emit_async_init (
  async_resource: napi_value,
  async_resource_name: napi_value,
  trigger_async_id: double,
  result: Pointer<[double, double]>
): void {
  if (!emnapiNodeBinding) return
  const resource = emnapiCtx.handleStore.get(async_resource)!.value
  const resource_name = emnapiCtx.handleStore.get(async_resource_name)!.value

  const asyncContext = emnapiNodeBinding.node.emitAsyncInit(resource, resource_name, trigger_async_id)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const asyncId = asyncContext.asyncId; const triggerAsyncId = asyncContext.triggerAsyncId
  if (result) {
    $from64('result')
    $makeSetValue('result', 0, 'asyncId', 'double')
    $makeSetValue('result', 8, 'triggerAsyncId', 'double')
  }
}

function _emnapi_node_emit_async_destroy (async_id: double, trigger_async_id: double): void {
  if (!emnapiNodeBinding) return
  emnapiNodeBinding.node.emitAsyncDestroy({
    asyncId: async_id,
    triggerAsyncId: trigger_async_id
  })
}

/* function _emnapi_node_open_callback_scope (async_resource: napi_value, async_id: double, trigger_async_id: double, result: Pointer<int64_t>): void {
  if (!emnapiNodeBinding || !result) return
  const resource = emnapiCtx.handleStore.get(async_resource)!.value
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const nativeCallbackScopePointer = emnapiNodeBinding.node.openCallbackScope(resource, {
    asyncId: async_id,
    triggerAsyncId: trigger_async_id
  })

  $from64('result')
  $makeSetValue('result', 0, 'nativeCallbackScopePointer', 'i64')
}

function _emnapi_node_close_callback_scope (scope: Pointer<int64_t>): void {
  if (!emnapiNodeBinding || !scope) return
  $from64('scope')
  const nativeCallbackScopePointer = $makeGetValue('scope', 0, 'i64')
  emnapiNodeBinding.node.closeCallbackScope(BigInt(nativeCallbackScopePointer))
} */

function _emnapi_node_make_callback (env: napi_env, async_resource: napi_value, cb: napi_value, argv: Pointer<napi_value>, size: size_t, async_id: double, trigger_async_id: double, result: Pointer<napi_value>): void {
  let i = 0
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let v: number

  if (!emnapiNodeBinding) return
  const resource = emnapiCtx.handleStore.get(async_resource)!.value
  const callback = emnapiCtx.handleStore.get(cb)!.value
  $from64('argv')
  $from64('size')
  size = size >>> 0
  const arr = Array(size)
  for (; i < size; i++) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/restrict-plus-operands
    const argVal = $makeGetValue('argv', 'i * ' + POINTER_SIZE, '*')
    arr[i] = emnapiCtx.handleStore.get(argVal)!.value
  }
  const ret = emnapiNodeBinding.node.makeCallback(resource, callback, arr, {
    asyncId: async_id,
    triggerAsyncId: trigger_async_id
  })
  if (result) {
    $from64('result')
    const envObject = emnapiCtx.envStore.get(env)!
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    v = envObject.ensureHandleId(ret)
    $makeSetValue('result', 0, 'v', '*')
  }
}

function _emnapi_async_init_js (async_resource: napi_value, async_resource_name: napi_value, result: Pointer<int64_t>): napi_status {
  if (!emnapiNodeBinding) {
    return napi_status.napi_generic_failure
  }

  let resource: object | undefined

  if (async_resource) {
    resource = Object(emnapiCtx.handleStore.get(async_resource)!.value)
  }

  const name = emnapiCtx.handleStore.get(async_resource_name)!.value
  const ret = emnapiNodeBinding.napi.asyncInit(resource, name)
  if (ret.status !== 0) return ret.status

  let numberValue = ret.value
  if (!((numberValue >= (BigInt(-1) * (BigInt(1) << BigInt(63)))) && (numberValue < (BigInt(1) << BigInt(63))))) {
    numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1))
    if (numberValue >= (BigInt(1) << BigInt(63))) {
      numberValue = numberValue - (BigInt(1) << BigInt(64))
    }
  }
  const low = Number(numberValue & BigInt(0xffffffff))
  const high = Number(numberValue >> BigInt(32))
  $from64('result')
  HEAP32[result >> 2] = low
  HEAP32[result + 4 >> 2] = high

  return napi_status.napi_ok
}

function _emnapi_async_destroy_js (async_context: Pointer<int64_t>): napi_status {
  if (!emnapiNodeBinding) {
    return napi_status.napi_generic_failure
  }
  $from64('async_context')
  const low = $makeGetValue('async_context', 0, 'i32')
  const high = $makeGetValue('async_context', 4, 'i32')

  const pointer = BigInt((low as number) >>> 0) | (BigInt(high) << BigInt(32))

  const ret = emnapiNodeBinding.napi.asyncDestroy(pointer)
  if (ret.status !== 0) return ret.status

  return napi_status.napi_ok
}

// @ts-expect-error
function napi_make_callback (env: napi_env, async_context: Pointer<int64_t>, recv: napi_value, func: napi_value, argc: size_t, argv: Pointer<napi_value>, result: Pointer<napi_value>): napi_status {
  let i = 0
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let v: number

  $PREAMBLE!(env, (envObject) => {
    if (!emnapiNodeBinding) {
      return envObject.setLastError(napi_status.napi_generic_failure)
    }
    $CHECK_ARG!(envObject, recv)
    if (argc > 0) {
      $CHECK_ARG!(envObject, argv)
    }

    const v8recv = Object(emnapiCtx.handleStore.get(recv)!.value)
    const v8func = emnapiCtx.handleStore.get(func)!.value
    if (typeof v8func !== 'function') {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }

    $from64('async_context')
    const low = $makeGetValue('async_context', 0, 'i32')
    const high = $makeGetValue('async_context', 4, 'i32')
    const ctx = BigInt((low as number) >>> 0) | (BigInt(high) << BigInt(32))

    $from64('argv')
    $from64('argc')
    argc = argc >>> 0
    const arr = Array(argc)
    for (; i < argc; i++) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/restrict-plus-operands
      const argVal = $makeGetValue('argv', 'i * ' + POINTER_SIZE, '*')
      arr[i] = emnapiCtx.handleStore.get(argVal)!.value
    }
    const ret = emnapiNodeBinding.napi.makeCallback(ctx, v8recv, v8func, arr)
    if (ret.error) {
      throw ret.error
    }

    if (ret.status !== napi_status.napi_ok) return envObject.setLastError(ret.status)

    if (result) {
      $from64('result')
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      v = envObject.ensureHandleId(ret.value)
      $makeSetValue('result', 0, 'v', '*')
    }
    return envObject.clearLastError()
  })
}

emnapiImplement('_emnapi_node_emit_async_init', 'vppdp', _emnapi_node_emit_async_init)
emnapiImplement('_emnapi_node_emit_async_destroy', 'vdd', _emnapi_node_emit_async_destroy)
// emnapiImplement('_emnapi_node_open_callback_scope', 'vpddp', _emnapi_node_open_callback_scope)
// emnapiImplement('_emnapi_node_close_callback_scope', 'vp', _emnapi_node_close_callback_scope)
emnapiImplement('_emnapi_node_make_callback', 'ipppppddp', _emnapi_node_make_callback)

emnapiImplement('_emnapi_async_init_js', 'ippp', _emnapi_async_init_js)
emnapiImplement('_emnapi_async_destroy_js', 'ip', _emnapi_async_destroy_js)
emnapiImplement('napi_make_callback', 'ippppppp', napi_make_callback)
