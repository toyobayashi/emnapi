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

function __emnapi_call_into_module (env: napi_env, callback: number, data: number, close_scope_if_throw: int): void {
  const envObject = emnapiCtx.envStore.get(env)!
  const scope = emnapiCtx.openScope(envObject)
  try {
    envObject.callIntoModule(() => {
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

function __emnapi_ctx_increase_waiting_request_counter (): void {
  emnapiCtx.increaseWaitingRequestCounter()
}

function __emnapi_ctx_decrease_waiting_request_counter (): void {
  emnapiCtx.decreaseWaitingRequestCounter()
}

emnapiImplementInternal('_emnapi_set_immediate', 'vpp', __emnapi_set_immediate)
emnapiImplementInternal('_emnapi_next_tick', 'vpp', __emnapi_next_tick)
emnapiImplementInternal('_emnapi_call_into_module', 'vpppi', __emnapi_call_into_module)
emnapiImplementInternal('_emnapi_ctx_increase_waiting_request_counter', 'v', __emnapi_ctx_increase_waiting_request_counter)
emnapiImplementInternal('_emnapi_ctx_decrease_waiting_request_counter', 'v', __emnapi_ctx_decrease_waiting_request_counter)
