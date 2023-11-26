/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

/** @macro */
export function $CHECK_ENV (env: napi_env): any {
  if (!env) return napi_status.napi_invalid_arg
}

/** @macro */
export function $RETURN_STATUS_IF_FALSE (env: Env, condition: any, status: napi_status): any {
  if (!condition) return env.setLastError(status)
}

/** @macro */
export function $CHECK_ARG (env: Env, arg: void_p) {
  $RETURN_STATUS_IF_FALSE!(env, arg, napi_status.napi_invalid_arg)
}

/** @macro */
export function $PREAMBLE (env: napi_env, fn: (envObject: Env) => napi_status): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
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

/** @macro */
export function $CHECK_ENV_NOT_IN_GC (env: napi_env): any {
  $CHECK_ENV!(env)
  // @ts-expect-error
  const envObject = emnapiCtx.envStore.get(env)!
  envObject.checkGCAccess()
}

/** @macro */
export function $CHECK_NEW_STRING_ARGS (env: napi_env, str: const_char_p, length: number, result: Pointer<napi_value>): any {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  const autoLength = length === -1
  const sizelength = length >>> 0
  if (length !== 0) {
    $CHECK_ARG!(envObject, str)
  }
  $CHECK_ARG!(envObject, result)
  $RETURN_STATUS_IF_FALSE!(
    envObject,
    autoLength || (sizelength <= 2147483647),
    napi_status.napi_invalid_arg
  )
}
