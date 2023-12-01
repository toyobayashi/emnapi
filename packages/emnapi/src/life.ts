import { emnapiCtx } from 'emnapi:shared'
import { $CHECK_ENV_NOT_IN_GC, $CHECK_ARG, $CHECK_ENV } from './macro'

/** @__sig ipp */
export function napi_open_handle_scope (env: napi_env, result: Pointer<napi_handle_scope>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const scope = emnapiCtx.openScope(envObject)
  $from64('result')
  $makeSetValue('result', 0, 'scope.id', '*')
  return envObject.clearLastError()
}

/** @__sig ipp */
export function napi_close_handle_scope (env: napi_env, scope: napi_handle_scope): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, scope)
  if ((envObject.openHandleScopes === 0)) {
    return napi_status.napi_handle_scope_mismatch
  }

  emnapiCtx.closeScope(envObject)
  return envObject.clearLastError()
}

/** @__sig ipp */
export function napi_open_escapable_handle_scope (env: napi_env, result: Pointer<napi_escapable_handle_scope>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, result)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const scope = emnapiCtx.openScope(envObject)
  $from64('result')
  $makeSetValue('result', 0, 'scope.id', '*')
  return envObject.clearLastError()
}

/** @__sig ipp */
export function napi_close_escapable_handle_scope (env: napi_env, scope: napi_escapable_handle_scope): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, scope)
  if ((envObject.openHandleScopes === 0)) {
    return napi_status.napi_handle_scope_mismatch
  }

  emnapiCtx.closeScope(envObject)
  return envObject.clearLastError()
}

/** @__sig ipppp */
export function napi_escape_handle (env: napi_env, scope: napi_escapable_handle_scope, escapee: napi_value, result: Pointer<napi_value>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, scope)
  $CHECK_ARG!(envObject, escapee)
  $CHECK_ARG!(envObject, result)
  const scopeObject = emnapiCtx.scopeStore.get(scope)!
  if (!scopeObject.escapeCalled()) {
    $from64('escapee')
    $from64('result')

    const newHandle = scopeObject.escape(escapee)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const value = newHandle ? newHandle.id : 0
    $makeSetValue('result', 0, 'value', '*')
    return envObject.clearLastError()
  }
  return envObject.setLastError(napi_status.napi_escape_called_twice)
}

/** @__sig ippip */
export function napi_create_reference (
  env: napi_env,
  value: napi_value,
  initial_refcount: uint32_t,
  result: Pointer<napi_ref>
): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, value)
  $CHECK_ARG!(envObject, result)

  const handle = emnapiCtx.handleStore.get(value)!
  if (envObject.moduleApiVersion !== Version.NAPI_VERSION_EXPERIMENTAL) {
    if (!(handle.isObject() || handle.isFunction() || handle.isSymbol())) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const ref = emnapiCtx.createReference(envObject, handle.id, initial_refcount >>> 0, Ownership.kUserland as any)
  $from64('result')
  $makeSetValue('result', 0, 'ref.id', '*')
  return envObject.clearLastError()
}

/** @__sig ipp */
export function napi_delete_reference (
  env: napi_env,
  ref: napi_ref
): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, ref)
  emnapiCtx.refStore.get(ref)!.dispose()
  return envObject.clearLastError()
}

/** @__sig ippp */
export function napi_reference_ref (
  env: napi_env,
  ref: napi_ref,
  result: Pointer<uint32_t>
): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, ref)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const count = emnapiCtx.refStore.get(ref)!.ref()
  if (result) {
    $from64('result')
    $makeSetValue('result', 0, 'count', 'u32')
  }
  return envObject.clearLastError()
}

/** @__sig ippp */
export function napi_reference_unref (
  env: napi_env,
  ref: napi_ref,
  result: Pointer<uint32_t>
): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, ref)
  const reference = emnapiCtx.refStore.get(ref)!
  const refcount = reference.refCount()

  if (refcount === 0) {
    return envObject.setLastError(napi_status.napi_generic_failure)
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const count = reference.unref()
  if (result) {
    $from64('result')
    $makeSetValue('result', 0, 'count', 'u32')
  }
  return envObject.clearLastError()
}

/** @__sig ippp */
export function napi_get_reference_value (
  env: napi_env,
  ref: napi_ref,
  result: Pointer<napi_value>
): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
  $CHECK_ARG!(envObject, ref)
  $CHECK_ARG!(envObject, result)
  const reference = emnapiCtx.refStore.get(ref)!
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleId = reference.get()
  $from64('result')
  $makeSetValue('result', 0, 'handleId', '*')
  return envObject.clearLastError()
}

/** @__sig ippp */
export function napi_add_env_cleanup_hook (env: napi_env, fun: number, arg: number): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, fun)

  $from64('fun')
  $from64('arg')

  emnapiCtx.addCleanupHook(envObject, fun, arg)

  return napi_status.napi_ok
}

/** @__sig ippp */
export function napi_remove_env_cleanup_hook (env: napi_env, fun: number, arg: number): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, fun)

  $from64('fun')
  $from64('arg')

  emnapiCtx.removeCleanupHook(envObject, fun, arg)

  return napi_status.napi_ok
}

/** @__sig vp */
export function _emnapi_env_ref (env: napi_env): void {
  const envObject = emnapiCtx.envStore.get(env)!
  envObject.ref()
}

/** @__sig vp */
export function _emnapi_env_unref (env: napi_env): void {
  const envObject = emnapiCtx.envStore.get(env)!
  envObject.unref()
}
