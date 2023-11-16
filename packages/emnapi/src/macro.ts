/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

/** @macro */
function $CHECK_ENV (env: napi_env): any {
  if (!env) return napi_status.napi_invalid_arg
}

/** @macro */
function $RETURN_STATUS_IF_FALSE (env: Env, condition: any, status: napi_status): any {
  if (!condition) return env.setLastError(status)
}

/** @macro */
function $CHECK_ARG (env: Env, arg: void_p) {
  $RETURN_STATUS_IF_FALSE!(env, arg, napi_status.napi_invalid_arg)
}

/** @macro */
function $PREAMBLE (env: napi_env, fn: (envObject: Env) => napi_status): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  envObject.checkGCAccess()
  $RETURN_STATUS_IF_FALSE!(
    envObject, envObject.tryCatch.isEmpty(), napi_status.napi_pending_exception)
  $RETURN_STATUS_IF_FALSE!(
    envObject,
    envObject.canCallIntoJs(),
    envObject.moduleApiVersion === Version.NAPI_VERSION_EXPERIMENTAL
      ? napi_status.napi_cannot_run_js
      : napi_status.napi_pending_exception
  )
  envObject.clearLastError()
  try {
    return fn(envObject)
  } catch (err) {
    envObject.tryCatch.setError(err)
    return envObject.setLastError(napi_status.napi_pending_exception)
  }
}
