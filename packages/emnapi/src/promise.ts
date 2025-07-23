import { emnapiCtx } from 'emnapi:shared'
import { from64, makeSetValue } from 'emscripten:parse-tools'
import { $PREAMBLE, $CHECK_ARG, $CHECK_ENV_NOT_IN_GC, $GET_RETURN_STATUS } from './macro'

/** @__sig ippp */
export function napi_create_promise (env: napi_env, deferred: Pointer<napi_deferred>, promise: Pointer<napi_value>): napi_status {
  let deferredObjectId: number, value: napi_value

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, deferred)
    $CHECK_ARG!(envObject, promise)

    const resolver = emnapiCtx.createResolver()
    deferredObjectId = emnapiCtx.isolate.createReference(resolver).id

    from64('deferred')
    makeSetValue('deferred', 0, 'deferredObjectId', '*')

    value = emnapiCtx.napiValueFromJsValue(resolver.promise)
    from64('promise')
    makeSetValue('promise', 0, 'value', '*')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/** @__sig ippp */
export function napi_resolve_deferred (env: napi_env, deferred: napi_deferred, resolution: napi_value): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, deferred)
    $CHECK_ARG!(envObject, resolution)
    const deferredRef = emnapiCtx.getRef(deferred)!
    const resolver = deferredRef.deref() as Resolver<any>
    resolver.resolve(emnapiCtx.jsValueFromNapiValue(resolution)!)
    deferredRef.dispose()
    return $GET_RETURN_STATUS!(envObject)
  })
}

/** @__sig ippp */
export function napi_reject_deferred (env: napi_env, deferred: napi_deferred, resolution: napi_value): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, deferred)
    $CHECK_ARG!(envObject, resolution)
    const deferredRef = emnapiCtx.getRef(deferred)!
    const resolver = deferredRef.deref() as Resolver<any>
    resolver.reject(emnapiCtx.jsValueFromNapiValue(resolution)!)
    deferredRef.dispose()
    return $GET_RETURN_STATUS!(envObject)
  })
}

/** @__sig ippp */
export function napi_is_promise (env: napi_env, value: napi_value, is_promise: Pointer<bool>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, is_promise)
  const promise = emnapiCtx.jsValueFromNapiValue(value)!
  from64('is_promise')

  const r = promise instanceof Promise ? 1 : 0
  makeSetValue('is_promise', 0, 'r', 'i8')
  return envObject.clearLastError()
}
