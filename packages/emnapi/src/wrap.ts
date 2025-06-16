import { emnapiCtx } from 'emnapi:shared'
import { wasmMemory } from 'emscripten:runtime'
import { from64, POINTER_SIZE, makeGetValue, POINTER_WASM_TYPE, makeSetValue } from 'emscripten:parse-tools'
import { emnapiString } from './string'
import { emnapiCreateFunction, emnapiDefineProperty, emnapiWrap, emnapiUnwrap, emnapiGetHandle } from './internal'
import { $CHECK_ARG, $CHECK_ENV, $CHECK_ENV_NOT_IN_GC, $GET_RETURN_STATUS, $PREAMBLE } from './macro'

/**
 * @__sig ipppppppp
 */
export function napi_define_class (
  env: napi_env,
  utf8name: Pointer<const_char>,
  length: size_t,
  constructor: napi_callback,
  callback_data: void_p,
  property_count: size_t,
  properties: Const<Pointer<napi_property_descriptor>>,
  result: Pointer<napi_value>
): napi_status {
  let propPtr: number, valueHandleId: napi_value, attributes: number

  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    $CHECK_ARG!(envObject, constructor)
    from64('length')
    from64('properties')
    from64('property_count')

    property_count = property_count >>> 0

    if (property_count > 0) {
      if (!properties) return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    if ((length < -1) || (length > 2147483647) || (!utf8name)) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const fresult = emnapiCreateFunction(envObject, utf8name, length, constructor, callback_data)
    if (fresult.status !== napi_status.napi_ok) return envObject.setLastError(fresult.status)
    const F = fresult.f

    let propertyName: string | symbol

    for (let i = 0; i < property_count; i++) {
      propPtr = (properties as number) + (i * (POINTER_SIZE * 8))
      const utf8Name = makeGetValue('propPtr', 0, '*')
      const name = makeGetValue('propPtr', POINTER_SIZE, '*')
      const method = makeGetValue('propPtr', POINTER_SIZE * 2, '*')
      const getter = makeGetValue('propPtr', POINTER_SIZE * 3, '*')
      const setter = makeGetValue('propPtr', POINTER_SIZE * 4, '*')
      const value = makeGetValue('propPtr', POINTER_SIZE * 5, '*')
      attributes = makeGetValue('propPtr', POINTER_SIZE * 6, POINTER_WASM_TYPE) as number
      from64('attributes')
      const data = makeGetValue('propPtr', POINTER_SIZE * 7, '*')

      if (utf8Name) {
        propertyName = emnapiString.UTF8ToString(utf8Name, -1)
      } else {
        if (!name) {
          return envObject.setLastError(napi_status.napi_name_expected)
        }
        propertyName = emnapiCtx.jsValueFromNapiValue(name)!
        if (typeof propertyName !== 'string' && typeof propertyName !== 'symbol') {
          return envObject.setLastError(napi_status.napi_name_expected)
        }
      }

      if ((attributes & napi_property_attributes.napi_static) !== 0) {
        emnapiDefineProperty(envObject, F, propertyName, method, getter, setter, value, attributes, data)
        continue
      }
      emnapiDefineProperty(envObject, F.prototype, propertyName, method, getter, setter, value, attributes, data)
    }

    valueHandleId = emnapiCtx.napiValueFromJsValue(F)
    from64('result')
    makeSetValue('result', 0, 'valueHandleId', '*')
    return $GET_RETURN_STATUS!(envObject)
  })
}

/**
 * @__sig ipppppp
 */
export function napi_wrap (env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): napi_status {
  return emnapiWrap(env, js_object, native_object, finalize_cb, finalize_hint, result)
}

/**
 * @__sig ippp
 */
export function napi_unwrap (env: napi_env, js_object: napi_value, result: void_pp): napi_status {
  return emnapiUnwrap(env, js_object, result, UnwrapAction.KeepWrap)
}

/**
 * @__sig ippp
 */
export function napi_remove_wrap (env: napi_env, js_object: napi_value, result: void_pp): napi_status {
  return emnapiUnwrap(env, js_object, result, UnwrapAction.RemoveWrap)
}

/**
 * @__sig ippp
 */
export function napi_type_tag_object (env: napi_env, object: napi_value, type_tag: Const<Pointer<unknown>>): napi_status {
  return $PREAMBLE!(env, (envObject) => {
    if (!object) {
      return envObject.setLastError(!envObject.lastException.isEmpty() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const value = emnapiCtx.jsValueFromNapiValue(object)!
    const type = typeof value
    if (!((type === 'object' && value !== null) || type === 'function')) {
      return envObject.setLastError(!envObject.lastException.isEmpty() ? napi_status.napi_pending_exception : napi_status.napi_object_expected)
    }
    from64('type_tag')
    if (!type_tag) {
      return envObject.setLastError(!envObject.lastException.isEmpty() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const binding = envObject.getObjectBinding(value)
    if (binding.tag !== null) {
      return envObject.setLastError(!envObject.lastException.isEmpty() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const tag = new Uint8Array(16)
    tag.set(new Uint8Array(wasmMemory.buffer, type_tag as number, 16))
    binding.tag = new Uint32Array(tag.buffer)

    return $GET_RETURN_STATUS!(envObject)
  })
}

/**
 * @__sig ipppp
 */
export function napi_check_object_type_tag (env: napi_env, object: napi_value, type_tag: Const<Pointer<unknown>>, result: Pointer<bool>): napi_status {
  // eslint-disable-next-line one-var
  let ret = true, i: number

  return $PREAMBLE!(env, (envObject) => {
    if (!object) {
      return envObject.setLastError(!envObject.lastException.isEmpty() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const value = emnapiCtx.jsValueFromNapiValue(object)!
    const type = typeof value
    if (!((type === 'object' && value !== null) || type === 'function')) {
      return envObject.setLastError(!envObject.lastException.isEmpty() ? napi_status.napi_pending_exception : napi_status.napi_object_expected)
    }
    if (!type_tag) {
      return envObject.setLastError(!envObject.lastException.isEmpty() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    if (!result) {
      return envObject.setLastError(!envObject.lastException.isEmpty() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const binding = envObject.getObjectBinding(value)
    if (binding.tag !== null) {
      from64('type_tag')
      const tag = binding.tag
      const typeTag = new Uint32Array(wasmMemory.buffer, type_tag as number, 4)
      ret = (
        tag[0] === typeTag[0] &&
        tag[1] === typeTag[1] &&
        tag[2] === typeTag[2] &&
        tag[3] === typeTag[3]
      )
    } else {
      ret = false
    }

    from64('result')
    makeSetValue('result', 0, 'ret ? 1 : 0', 'i8')

    return $GET_RETURN_STATUS!(envObject)
  })
}

/**
 * @__sig ipppppp
 */
export function napi_add_finalizer (env: napi_env, js_object: napi_value, finalize_data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): napi_status {
  const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)

  if (!emnapiCtx.features.finalizer) {
    return envObject.setLastError(napi_status.napi_generic_failure)
  }

  $CHECK_ARG!(envObject, js_object)
  $CHECK_ARG!(envObject, finalize_cb)

  const handleResult = emnapiGetHandle(js_object)
  if (handleResult.status !== napi_status.napi_ok) {
    return envObject.setLastError(handleResult.status)
  }
  const id = emnapiCtx.napiValueFromJsValue(handleResult.value!)

  const ownership: ReferenceOwnership = !result ? ReferenceOwnership.kRuntime : ReferenceOwnership.kUserland
  from64('finalize_data')
  from64('finalize_cb')
  from64('finalize_hint')
  const reference = emnapiCtx.createReferenceWithFinalizer(envObject, id, 0, ownership as any, finalize_cb, finalize_data, finalize_hint)
  if (result) {
    from64('result')

    const referenceId = reference.id
    makeSetValue('result', 0, 'referenceId', '*')
  }

  return envObject.clearLastError()
}

/**
 * @__sig ipppp
 */
export function node_api_post_finalizer (env: napi_env, finalize_cb: napi_finalize, finalize_data: void_p, finalize_hint: void_p): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.getEnv(env)!
  envObject.enqueueFinalizer(
    emnapiCtx.createTrackedFinalizer(
      envObject,
      finalize_cb,
      finalize_data,
      finalize_hint
    )
  )
  return envObject.clearLastError()
}
