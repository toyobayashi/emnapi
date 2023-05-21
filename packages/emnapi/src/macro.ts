/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

declare function $$escape<T> (code: () => T): T

function $CHECK_ENV (env: napi_env): any {
  if (env == 0) return napi_status.napi_invalid_arg
}

function $CHECK_ARG (env: Env, arg: void_p): any {
  if (arg == 0) return env.setLastError(napi_status.napi_invalid_arg)
}

function $PREAMBLE (env: number, fn: (envObject: Env) => napi_status): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
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
    return $$escape!(fn as any) as napi_status
  } catch (err) {
    envObject.tryCatch.setError(err)
    return envObject.setLastError(napi_status.napi_pending_exception)
  }
}

function $INLINE_SET_ERROR_CODE (
  env: Env,
  error: Error & { code?: string },
  code_value: napi_value,
  code_string: const_char_p
): void {
  // @ts-expect-error

  $$escape!(() => {
    if (code_value) {
      const codeValue = emnapiCtx.handleStore.get(code_value)!.value
      if (typeof codeValue !== 'string') {
        return env.setLastError(napi_status.napi_string_expected)
      }
      error.code = codeValue
    } else if (code_string) {
      error.code = emnapiString.UTF8ToString(code_string, -1)
    }
  })
}
