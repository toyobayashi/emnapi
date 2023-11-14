/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

function $CHECK_ENV (env: napi_env): any {
  if (!env) return napi_status.napi_invalid_arg
}

function $CHECK_ARG (env: Env, arg: void_p): any {
  if (!arg) return env.setLastError(napi_status.napi_invalid_arg)
}

function $PREAMBLE (env: napi_env, fn: (envObject: Env) => napi_status): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  envObject.checkGCAccess()
  if (envObject.tryCatch.hasCaught()) return envObject.setLastError(napi_status.napi_pending_exception)
  if (!envObject.canCallIntoJs()) {
    return envObject.setLastError(
      envObject.moduleApiVersion === Version.NAPI_VERSION_EXPERIMENTAL
        ? napi_status.napi_cannot_run_js
        : napi_status.napi_pending_exception
    )
  }
  envObject.clearLastError()
  try {
    return fn(envObject)
  } catch (err) {
    envObject.tryCatch.setError(err)
    return envObject.setLastError(napi_status.napi_pending_exception)
  }
}
