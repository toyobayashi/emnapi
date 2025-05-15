import { emnapiNodeBinding, emnapiCtx } from 'emnapi:shared'
import { from64, makeSetValue, makeGetValue, POINTER_SIZE } from 'emscripten:parse-tools'
import { $PREAMBLE, $CHECK_ARG } from './macro'

/** @__sig vppdp */
export function _emnapi_node_emit_async_init (
  async_resource: napi_value,
  async_resource_name: napi_value,
  trigger_async_id: double,
  result: Pointer<[double, double]>
): void {
  if (!emnapiNodeBinding) return
  const resource = emnapiCtx.jsValueFromNapiValue(async_resource)!
  const resource_name = emnapiCtx.jsValueFromNapiValue<string>(async_resource_name)!

  const asyncContext = emnapiNodeBinding.node.emitAsyncInit(resource, resource_name, trigger_async_id)

  const asyncId = asyncContext.asyncId; const triggerAsyncId = asyncContext.triggerAsyncId
  if (result) {
    from64('result')
    makeSetValue('result', 0, 'asyncId', 'double')
    makeSetValue('result', 8, 'triggerAsyncId', 'double')
  }
}

/** @__sig vdd */
export function _emnapi_node_emit_async_destroy (async_id: double, trigger_async_id: double): void {
  if (!emnapiNodeBinding) return
  emnapiNodeBinding.node.emitAsyncDestroy({
    asyncId: async_id,
    triggerAsyncId: trigger_async_id
  })
}

/* vpddp export function _emnapi_node_open_callback_scope (async_resource: napi_value, async_id: double, trigger_async_id: double, result: Pointer<int64_t>): void {
  if (!emnapiNodeBinding || !result) return
  const resource = emnapiCtx.jsValueFromNapiValue(async_resource)!
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const nativeCallbackScopePointer = emnapiNodeBinding.node.openCallbackScope(resource, {
    asyncId: async_id,
    triggerAsyncId: trigger_async_id
  })

  from64('result')
  $_TODO_makeSetValue('result', 0, 'nativeCallbackScopePointer', 'i64')
}

vp
export function _emnapi_node_close_callback_scope (scope: Pointer<int64_t>): void {
  if (!emnapiNodeBinding || !scope) return
  from64('scope')
  const nativeCallbackScopePointer = $_TODO_makeGetValue('scope', 0, 'i64')
  emnapiNodeBinding.node.closeCallbackScope(BigInt(nativeCallbackScopePointer))
} */

/** @__sig ipppppddp */
export function _emnapi_node_make_callback (env: napi_env, async_resource: napi_value, cb: napi_value, argv: Pointer<napi_value>, size: size_t, async_id: double, trigger_async_id: double, result: Pointer<napi_value>): void {
  let i = 0

  let v: napi_value

  if (!emnapiNodeBinding) return
  const resource = emnapiCtx.jsValueFromNapiValue(async_resource)!
  const callback = emnapiCtx.jsValueFromNapiValue<any>(cb)!
  from64('argv')
  from64('size')
  size = size >>> 0
  const arr = Array(size)
  for (; i < size; i++) {
    const argVal = makeGetValue('argv', 'i * ' + POINTER_SIZE, '*')
    arr[i] = emnapiCtx.jsValueFromNapiValue(argVal)!
  }
  const ret = emnapiNodeBinding.node.makeCallback(resource, callback, arr, {
    asyncId: async_id,
    triggerAsyncId: trigger_async_id
  })
  if (result) {
    from64('result')
    const envObject = emnapiCtx.getEnv(env)!

    v = emnapiCtx.napiValueFromJsValue(ret)
    makeSetValue('result', 0, 'v', '*')
  }
}

/** @__sig ippp */
export function _emnapi_async_init_js (async_resource: napi_value, async_resource_name: napi_value, result: Pointer<int64_t>): napi_status {
  if (!emnapiNodeBinding) {
    return napi_status.napi_generic_failure
  }

  let resource: object | undefined

  if (async_resource) {
    resource = Object(emnapiCtx.jsValueFromNapiValue(async_resource)!)
  }

  const name = emnapiCtx.jsValueFromNapiValue<string>(async_resource_name)!
  const ret = emnapiNodeBinding.napi.asyncInit(resource, name)
  if (ret.status !== 0) return ret.status

  let numberValue = ret.value
  if (!((numberValue >= (BigInt(-1) * (BigInt(1) << BigInt(63)))) && (numberValue < (BigInt(1) << BigInt(63))))) {
    numberValue = numberValue & ((BigInt(1) << BigInt(64)) - BigInt(1))
    if (numberValue >= (BigInt(1) << BigInt(63))) {
      numberValue = numberValue - (BigInt(1) << BigInt(64))
    }
  }

  const low = Number(numberValue & BigInt(0xffffffff))

  const high = Number(numberValue >> BigInt(32))
  from64('result')
  makeSetValue('result', 0, 'low', 'i32')
  makeSetValue('result', 4, 'high', 'i32')

  return napi_status.napi_ok
}

/** @__sig ip */
export function _emnapi_async_destroy_js (async_context: Pointer<int64_t>): napi_status {
  if (!emnapiNodeBinding) {
    return napi_status.napi_generic_failure
  }
  from64('async_context')
  const low = makeGetValue('async_context', 0, 'i32')
  const high = makeGetValue('async_context', 4, 'i32')

  const pointer = BigInt((low as number) >>> 0) | (BigInt(high) << BigInt(32))

  const ret = emnapiNodeBinding.napi.asyncDestroy(pointer)
  if (ret.status !== 0) return ret.status

  return napi_status.napi_ok
}

// https://github.com/nodejs/node-addon-api/pull/1283

/** @__sig ipppp */
export function napi_open_callback_scope (env: napi_env, ignored: napi_value, async_context_handle: number, result: number): napi_status {
  throw new Error('napi_open_callback_scope has not been implemented yet')
}

/** @__sig ipp */
export function napi_close_callback_scope (env: napi_env, scope: number): napi_status {
  throw new Error('napi_close_callback_scope has not been implemented yet')
}

/** @__sig ippppppp */
export function napi_make_callback (env: napi_env, async_context: Pointer<int64_t>, recv: napi_value, func: napi_value, argc: size_t, argv: Pointer<napi_value>, result: Pointer<napi_value>): napi_status {
  let i = 0

  let v: napi_value

  return $PREAMBLE!(env, (envObject) => {
    if (!emnapiNodeBinding) {
      return envObject.setLastError(napi_status.napi_generic_failure)
    }
    $CHECK_ARG!(envObject, recv)
    if (argc > 0) {
      $CHECK_ARG!(envObject, argv)
    }

    const v8recv = Object(emnapiCtx.jsValueFromNapiValue(recv)!)
    const v8func = emnapiCtx.jsValueFromNapiValue<any>(func)!
    if (typeof v8func !== 'function') {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }

    from64('async_context')
    const low = makeGetValue('async_context', 0, 'i32')
    const high = makeGetValue('async_context', 4, 'i32')
    const ctx = BigInt((low as number) >>> 0) | (BigInt(high) << BigInt(32))

    from64('argv')
    from64('argc')
    argc = argc >>> 0
    const arr = Array(argc)
    for (; i < argc; i++) {
      const argVal = makeGetValue('argv', 'i * ' + POINTER_SIZE, '*')
      arr[i] = emnapiCtx.jsValueFromNapiValue(argVal)!
    }
    const ret = emnapiNodeBinding.napi.makeCallback(ctx, v8recv, v8func, arr)
    if (ret.error) {
      throw ret.error
    }

    if (ret.status !== napi_status.napi_ok) return envObject.setLastError(ret.status)

    if (result) {
      from64('result')

      v = emnapiCtx.napiValueFromJsValue(ret.value)
      makeSetValue('result', 0, 'v', '*')
    }
    return envObject.getReturnStatus()
  })
}

/** @__sig vp */
export function _emnapi_env_check_gc_access (env: napi_env): void {
  const envObject = emnapiCtx.getEnv(env)!
  envObject.checkGCAccess()
}
