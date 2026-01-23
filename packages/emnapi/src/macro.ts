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
    envObject, envObject.lastException.isEmpty(), napi_status.napi_pending_exception)
  $RETURN_STATUS_IF_FALSE!(
    envObject,
    envObject.canCallIntoJs(),
    envObject.moduleApiVersion >= 10
      ? napi_status.napi_cannot_run_js
      : napi_status.napi_pending_exception
  )
  envObject.clearLastError()
  try {
    return fn(envObject)
  } catch (err) {
    envObject.lastException.resetTo(err)
    return envObject.setLastError(napi_status.napi_pending_exception)
  }
}

/** @macro */
export function $CHECK_ENV_NOT_IN_GC (env: napi_env): any {
  $CHECK_ENV!(env)
  // @ts-expect-error
  const envObject = emnapiEnv
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

/** @macro */
export const $GET_RETURN_STATUS = (envObject: Env): napi_status => (napi_status.napi_ok)
