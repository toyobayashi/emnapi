import { emnapiCtx } from 'emnapi:shared'
import { from64, makeSetValue } from 'emscripten:parse-tools'
import { $PREAMBLE, $CHECK_ARG, $CHECK_ENV_NOT_IN_GC } from './macro'

/** @__sig ippp */
export function napi_create_promise (env: napi_env, deferred: Pointer<napi_deferred>, promise: Pointer<napi_value>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let deferredObjectId: number, value: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, deferred)
    $CHECK_ARG!(envObject, promise)

    const p = new Promise<any>((resolve, reject) => {
      const deferredObject = emnapiCtx.createDeferred({ resolve, reject })
      deferredObjectId = deferredObject.id
      from64('deferred')
      makeSetValue('deferred', 0, 'deferredObjectId', '*')
    })
    from64('promise')

    value = emnapiCtx.addToCurrentScope(p).id
    makeSetValue('promise', 0, 'value', '*')
    return envObject.getReturnStatus()
  })
}

/** @__sig ippp */
export function napi_resolve_deferred (env: napi_env, deferred: napi_deferred, resolution: napi_value): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, deferred)
    $CHECK_ARG!(envObject, resolution)
    const deferredObject = emnapiCtx.deferredStore.get(deferred)!
    deferredObject.resolve(emnapiCtx.handleStore.get(resolution)!.value)
    return envObject.getReturnStatus()
  })
}

/** @__sig ippp */
export function napi_reject_deferred (env: napi_env, deferred: napi_deferred, resolution: napi_value): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, deferred)
    $CHECK_ARG!(envObject, resolution)
    const deferredObject = emnapiCtx.deferredStore.get(deferred)!
    deferredObject.reject(emnapiCtx.handleStore.get(resolution)!.value)
    return envObject.getReturnStatus()
  })
}

/** @__sig ippp */
export function napi_is_promise (env: napi_env, value: napi_value, is_promise: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, is_promise)
  const h = emnapiCtx.handleStore.get(value)!
  from64('is_promise')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const r = h.isPromise() ? 1 : 0
  makeSetValue('is_promise', 0, 'r', 'i8')
  return envObject.clearLastError()
}
