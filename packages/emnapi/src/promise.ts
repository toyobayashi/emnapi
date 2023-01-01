// @ts-expect-error
function napi_create_promise (env: napi_env, deferred: Pointer<napi_deferred>, promise: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let deferredObjectId: number, value: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, deferred)
    $CHECK_ARG!(envObject, promise)

    const p = new Promise<any>((resolve, reject) => {
      const deferredObject = emnapiRt.Deferred.create<any>(envObject, { resolve, reject })
      deferredObjectId = deferredObject.id
      $from64('deferred')
      $makeSetValue('deferred', 0, 'deferredObjectId', '*')
    })
    $from64('promise')

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value = emnapiCtx.addToCurrentScope(p).id
    $makeSetValue('promise', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}

// @ts-expect-error
function napi_resolve_deferred (env: napi_env, deferred: napi_deferred, resolution: napi_value): napi_status {
  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, deferred)
    $CHECK_ARG!(envObject, resolution)
    const deferredObject = emnapiCtx.deferredStore.get(deferred)!
    deferredObject.resolve(emnapiCtx.handleStore.get(resolution)!.value)
    return envObject.getReturnStatus()
  })
}

// @ts-expect-error
function napi_reject_deferred (env: napi_env, deferred: napi_deferred, resolution: napi_value): napi_status {
  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, deferred)
    $CHECK_ARG!(envObject, resolution)
    const deferredObject = emnapiCtx.deferredStore.get(deferred)!
    deferredObject.reject(emnapiCtx.handleStore.get(resolution)!.value)
    return envObject.getReturnStatus()
  })
}

function napi_is_promise (env: napi_env, value: napi_value, is_promise: Pointer<bool>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, is_promise)
  const h = emnapiCtx.handleStore.get(value)!
  $from64('is_promise')
  HEAPU8[is_promise] = h.isPromise() ? 1 : 0
  return envObject.clearLastError()
}

emnapiImplement('napi_create_promise', 'ippp', napi_create_promise)
emnapiImplement('napi_resolve_deferred', 'ippp', napi_resolve_deferred)
emnapiImplement('napi_reject_deferred', 'ippp', napi_reject_deferred)
emnapiImplement('napi_is_promise', 'ippp', napi_is_promise)
