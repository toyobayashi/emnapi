/* eslint-disable @typescript-eslint/indent */

function _napi_set_last_error (env: napi_env, error_code: napi_status, engine_error_code: uint32_t, engine_reserved: void_p): napi_status {
  const envObject = emnapiCtx.envStore.get(env)!
  return envObject.setLastError(error_code, engine_error_code, engine_reserved)
}

function _napi_clear_last_error (env: napi_env): napi_status {
  const envObject = emnapiCtx.envStore.get(env)!
  return envObject.clearLastError()
}

declare const process: any
function __emnapi_get_node_version (major: number, minor: number, patch: number): void {
  $from64('major')
  $from64('minor')
  $from64('patch')

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const versions: [number, number, number] =
    (
      typeof process === 'object' && process !== null &&
      typeof process.versions === 'object' && process.versions !== null &&
      typeof process.versions.node === 'string'
    )
      ? process.versions.node.split('.').map((n: string) => Number(n))
      : [0, 0, 0]

  $makeSetValue('major', 0, 'versions[0]', 'u32')
  $makeSetValue('minor', 0, 'versions[1]', 'u32')
  $makeSetValue('patch', 0, 'versions[2]', 'u32')
}

emnapiImplementInternal('napi_set_last_error', 'ipiip', _napi_set_last_error)
emnapiImplementInternal('napi_clear_last_error', 'ip', _napi_clear_last_error)
emnapiImplementInternal('_emnapi_get_node_version', 'vp', __emnapi_get_node_version)

function __emnapi_runtime_keepalive_push (): void {
  if (typeof runtimeKeepalivePush === 'function') runtimeKeepalivePush()
}

function __emnapi_runtime_keepalive_pop (): void {
  if (typeof runtimeKeepalivePop === 'function') runtimeKeepalivePop()
}

emnapiImplementInternal('_emnapi_runtime_keepalive_push', 'v', __emnapi_runtime_keepalive_push, ['$runtimeKeepalivePush'])
emnapiImplementInternal('_emnapi_runtime_keepalive_pop', 'v', __emnapi_runtime_keepalive_pop, ['$runtimeKeepalivePop'])

function __emnapi_set_immediate (callback: number, data: number): void {
  emnapiCtx.feature.setImmediate(() => {
    $makeDynCall('vp', 'callback')(data)
  })
}

function __emnapi_next_tick (callback: number, data: number): void {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  Promise.resolve().then(() => {
    $makeDynCall('vp', 'callback')(data)
  })
}

function __emnapi_callback_into_module (forceUncaught: int, env: napi_env, callback: number, data: number, close_scope_if_throw: int): void {
  const envObject = emnapiCtx.envStore.get(env)!
  const scope = emnapiCtx.openScope(envObject)
  try {
    (envObject as NodeEnv).callbackIntoModule(Boolean(forceUncaught), () => {
      $makeDynCall('vpp', 'callback')(env, data)
    })
  } catch (err) {
    emnapiCtx.closeScope(envObject, scope)
    if (close_scope_if_throw) {
      emnapiCtx.closeScope(envObject)
    }
    throw err
  }
  emnapiCtx.closeScope(envObject, scope)
}

function __emnapi_call_finalizer (forceUncaught: int, env: napi_env, callback: number, data: number, hint: number): void {
  const envObject = emnapiCtx.envStore.get(env)!
  $from64('callback')
  ;(envObject as NodeEnv).callFinalizerInternal(forceUncaught, callback, data, hint)
}

function __emnapi_ctx_increase_waiting_request_counter (): void {
  emnapiCtx.increaseWaitingRequestCounter()
}

function __emnapi_ctx_decrease_waiting_request_counter (): void {
  emnapiCtx.decreaseWaitingRequestCounter()
}

emnapiImplementInternal('_emnapi_set_immediate', 'vpp', __emnapi_set_immediate)
emnapiImplementInternal('_emnapi_next_tick', 'vpp', __emnapi_next_tick)
emnapiImplementInternal('_emnapi_callback_into_module', 'vipppi', __emnapi_callback_into_module)
emnapiImplementInternal('_emnapi_call_finalizer', 'vipppp', __emnapi_call_finalizer)
emnapiImplementInternal('_emnapi_ctx_increase_waiting_request_counter', 'v', __emnapi_ctx_increase_waiting_request_counter)
emnapiImplementInternal('_emnapi_ctx_decrease_waiting_request_counter', 'v', __emnapi_ctx_decrease_waiting_request_counter)
