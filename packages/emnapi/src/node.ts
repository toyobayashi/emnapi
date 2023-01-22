function _emnapi_node_binding_available (): int {
  return emnapiNodeBinding ? 1 : 0
}

function _emnapi_node_emit_async_init (
  async_resource: napi_value,
  async_resource_name: napi_value,
  trigger_async_id: double,
  result: Pointer<[double, double]>
): void {
  if (!emnapiNodeBinding) return
  const resource = emnapiCtx.handleStore.get(async_resource)!.value
  const resource_name = emnapiCtx.handleStore.get(async_resource_name)!.value

  const asyncContext = emnapiNodeBinding.emitAsyncInit(resource, resource_name, trigger_async_id)
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
  emnapiNodeBinding.emitAsyncDestroy({
    asyncId: async_id,
    triggerAsyncId: trigger_async_id
  })
}

/* function _emnapi_node_open_callback_scope (async_resource: napi_value, async_id: double, trigger_async_id: double, result: Pointer<int64_t>): void {
  if (!emnapiNodeBinding || !result) return
  const resource = emnapiCtx.handleStore.get(async_resource)!.value
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const nativeCallbackScopePointer = emnapiNodeBinding.openCallbackScope(resource, {
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
  emnapiNodeBinding.closeCallbackScope(BigInt(nativeCallbackScopePointer))
} */

// @ts-expect-error
function _emnapi_node_make_callback (env: napi_env, async_resource: napi_value, cb: napi_value, argv: Pointer<napi_value>, size: size_t, async_id: double, trigger_async_id: double, result: Pointer<napi_value>): napi_status {
  let i = 0
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let v: number

  $PREAMBLE!(env, (envObject) => {
    if (!emnapiNodeBinding) {
      return envObject.setLastError(napi_status.napi_generic_failure)
    }
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
    const ret = emnapiNodeBinding.makeCallback(resource, callback, arr, {
      asyncId: async_id,
      triggerAsyncId: trigger_async_id
    })
    if (result) {
      $from64('result')
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      v = envObject.ensureHandleId(ret)
      $makeSetValue('result', 0, 'v', '*')
    }
    return envObject.clearLastError()
  })
}

emnapiImplement('_emnapi_node_binding_available', 'i', _emnapi_node_binding_available)
emnapiImplement('_emnapi_node_emit_async_init', 'vppdp', _emnapi_node_emit_async_init)
emnapiImplement('_emnapi_node_emit_async_destroy', 'vdd', _emnapi_node_emit_async_destroy)
// emnapiImplement('_emnapi_node_open_callback_scope', 'vpddp', _emnapi_node_open_callback_scope)
// emnapiImplement('_emnapi_node_close_callback_scope', 'vp', _emnapi_node_close_callback_scope)
emnapiImplement('_emnapi_node_make_callback', 'ipppppddp', _emnapi_node_make_callback)
