/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

declare function $CHECK_ENV (env: napi_env): any
declare function $CHECK_ARG (env: Env, arg: void_p): any
declare function $PREAMBLE (env: napi_env, fn: (envObject: Env) => napi_status): napi_status

// function $CHECK_ENV (env: napi_env): any {
//   if (env == 0) return napi_status.napi_invalid_arg
// }

// function $CHECK_ARG (env: Env, arg: void_p): any {
//   if (arg == 0) return env.setLastError(napi_status.napi_invalid_arg)
// }

// function $PREAMBLE (env: napi_env, fn: (envObject: Env) => napi_status): napi_status {
//   $CHECK_ENV!(env)
//   const envObject = emnapiCtx.envStore.get(env)!
//   if (envObject.tryCatch.hasCaught()) return envObject.setLastError(napi_status.napi_pending_exception)
//   if (!envObject.canCallIntoJs()) {
//     return envObject.setLastError(
//       envObject.moduleApiVersion === Version.NAPI_VERSION_EXPERIMENTAL
//         ? napi_status.napi_cannot_run_js
//         : napi_status.napi_pending_exception
//     )
//   }
//   envObject.clearLastError()
//   try {
//     return fn(envObject)
//   } catch (err) {
//     envObject.tryCatch.setError(err)
//     return envObject.setLastError(napi_status.napi_pending_exception)
//   }
// }
