/* eslint-disable @typescript-eslint/indent */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function _napi_set_last_error (env: napi_env, error_code: napi_status, engine_error_code: uint32_t, engine_reserved: void_p): napi_status

function napi_set_last_error (env: napi_env, error_code: napi_status, engine_error_code: uint32_t, engine_reserved: void_p): napi_status {
  const envObject = emnapiCtx.envStore.get(env)!
  return envObject.setLastError(error_code, engine_error_code, engine_reserved)
}

function napi_clear_last_error (env: napi_env): napi_status {
  const envObject = emnapiCtx.envStore.get(env)!
  return envObject.clearLastError()
}

declare const process: any
function __emnapi_get_node_version (major: number, minor: number, patch: number): void {
  $from64('major')
  $from64('minor')
  $from64('patch')

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const versions: [number, number, number] =
    (
      typeof process === 'object' && process !== null &&
      typeof process.versions === 'object' && process.versions !== null &&
      typeof process.versions.node === 'string'
    )
      ? process.versions.node.split('.').map((n: string) => Number(n))
      : [0, 0, 0]

  $makeSetValue('major', 0, 'versions[0]', 'u32')
  $makeSetValue('minor', 0, 'versions[1]', 'u32')
  $makeSetValue('patch', 0, 'versions[2]', 'u32')
}

emnapiImplement('napi_set_last_error', 'ipiip', napi_set_last_error)
emnapiImplement('napi_clear_last_error', 'ip', napi_clear_last_error)
emnapiImplementInternal('_emnapi_get_node_version', 'vp', __emnapi_get_node_version)

declare function runtimeKeepalivePush (): void
declare function runtimeKeepalivePop (): void

mergeInto(LibraryManager.library, {
  _emnapi_runtime_keepalive_push__sig: 'v',
  _emnapi_runtime_keepalive_push__deps: ['$runtimeKeepalivePush'],
  _emnapi_runtime_keepalive_push: function () {
    if (typeof runtimeKeepalivePush === 'function') runtimeKeepalivePush()
  },
  _emnapi_runtime_keepalive_pop__sig: 'v',
  _emnapi_runtime_keepalive_pop__deps: ['$runtimeKeepalivePop'],
  _emnapi_runtime_keepalive_pop: function () {
    if (typeof runtimeKeepalivePop === 'function') runtimeKeepalivePop()
  }
})
