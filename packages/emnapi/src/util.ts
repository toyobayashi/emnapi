import { ENVIRONMENT_IS_NODE, ENVIRONMENT_IS_PTHREAD, runtimeKeepalivePop, runtimeKeepalivePush } from 'emscripten:runtime'
import { from64, makeSetValue, makeDynCall } from 'emscripten:parse-tools'
import { emnapiCtx } from 'emnapi:shared'

/**
 * @__sig ipiip
 */
export function napi_set_last_error (env: napi_env, error_code: napi_status, engine_error_code: uint32_t, engine_reserved: void_p): napi_status {
  const envObject = emnapiCtx.getEnv(env)!
  return envObject.setLastError(error_code, engine_error_code, engine_reserved)
}

/**
 * @__sig ip
 */
export function napi_clear_last_error (env: napi_env): napi_status {
  const envObject = emnapiCtx.getEnv(env)!
  return envObject.clearLastError()
}

declare const process: any

/**
 * @__sig vppp
 */
export function _emnapi_get_node_version (major: number, minor: number, patch: number): void {
  from64('major')
  from64('minor')
  from64('patch')

  const versions: [number, number, number] =
    (
      typeof process === 'object' && process !== null &&
      typeof process.versions === 'object' && process.versions !== null &&
      typeof process.versions.node === 'string'
    )
      ? process.versions.node.split('.').map((n: string) => Number(n))
      : [0, 0, 0]

  makeSetValue('major', 0, 'versions[0]', 'u32')
  makeSetValue('minor', 0, 'versions[1]', 'u32')
  makeSetValue('patch', 0, 'versions[2]', 'u32')
}

/**
 * @__sig v
 * @__deps $runtimeKeepalivePush
 */
export function _emnapi_runtime_keepalive_push (): void {
  if (typeof runtimeKeepalivePush === 'function') runtimeKeepalivePush()
}

/**
 * @__sig v
 * @__deps $runtimeKeepalivePop
 */
export function _emnapi_runtime_keepalive_pop (): void {
  if (typeof runtimeKeepalivePop === 'function') runtimeKeepalivePop()
}

/**
 * @__sig vpp
 */
export function _emnapi_set_immediate (callback: number, data: number): void {
  emnapiCtx.features.setImmediate(() => {
    makeDynCall('vp', 'callback')(data)
  })
}

/**
 * @__sig vpp
 */
export function _emnapi_next_tick (callback: number, data: number): void {
  Promise.resolve().then(() => {
    makeDynCall('vp', 'callback')(data)
  })
}

/**
 * @__sig vipppi
 */
export function _emnapi_callback_into_module (forceUncaught: int, env: napi_env, callback: number, data: number, close_scope_if_throw: int): void {
  const envObject = emnapiCtx.getEnv(env)!
  const scope = emnapiCtx.openScope(envObject)
  try {
    (envObject as NodeEnv).callbackIntoModule(Boolean(forceUncaught), () => {
      makeDynCall('vpp', 'callback')(env, data)
    })
  } catch (err) {
    emnapiCtx.closeScope(envObject, scope)
    if (close_scope_if_throw) {
      emnapiCtx.closeScope(envObject)
    }
    throw err
  }
  emnapiCtx.closeScope(envObject, scope)
}

/**
 * @__sig vipppp
 */
export function _emnapi_call_finalizer (forceUncaught: int, env: napi_env, callback: number, data: number, hint: number): void {
  const envObject = emnapiCtx.getEnv(env)!
  from64('callback')
  ;(envObject as NodeEnv).callFinalizerInternal(forceUncaught, callback, data, hint)
}

/**
 * @__sig v
 */
export function _emnapi_ctx_increase_waiting_request_counter (): void {
  emnapiCtx.increaseWaitingRequestCounter()
}

/**
 * @__sig v
 */
export function _emnapi_ctx_decrease_waiting_request_counter (): void {
  emnapiCtx.decreaseWaitingRequestCounter()
}

/**
 * @__sig i
 */
export function _emnapi_is_main_runtime_thread (): number {
  return ENVIRONMENT_IS_PTHREAD ? 0 : 1
}

/**
 * @__sig i
 */
export function _emnapi_is_main_browser_thread (): number {
  return (typeof window !== 'undefined' && typeof document !== 'undefined' && !ENVIRONMENT_IS_NODE) ? 1 : 0
}

/**
 * @__sig v
 */
export function _emnapi_unwind (): never {
  throw 'unwind'
}

/**
 * @__sig d
 */
export function _emnapi_get_now (): double {
  return performance.timeOrigin + performance.now()
}

export function $emnapiSetValueI64 (result: Pointer<int64_t>, numberValue: number): void {
  let tempDouble: number

  const tempI64 = [
    numberValue >>> 0,
    (tempDouble = numberValue, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)
  ]
  makeSetValue('result', 0, 'tempI64[0]', 'i32')
  makeSetValue('result', 4, 'tempI64[1]', 'i32')
}

/**
 * @__deps $emnapiCtx
 * @__sig p
 */
export function _emnapi_open_handle_scope (): napi_handle_scope {
  return emnapiCtx.isolate.openScope().id
}

/**
 * @__deps $emnapiCtx
 * @__sig vp
 */
export function _emnapi_close_handle_scope (_scope: napi_handle_scope): void {
  return emnapiCtx.isolate.closeScope()
}
