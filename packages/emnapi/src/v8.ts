import { from64, makeSetValue, makeGetValue, SIZE_TYPE, POINTER_SIZE, makeDynCall } from 'emscripten:parse-tools'

declare var emnapiString: typeof import('./string').emnapiString
declare var emnapiCtx: Context
declare function emnapiGetHandle (value: napi_value): { status: napi_status; value?: any }

const finalizerRegistry = new FinalizationRegistry((value: {
  finalize_data: Pointer<unknown>
  finalize_cb: (data: Pointer<unknown>, hint: Pointer<unknown>) => void
  finalize_hint: Pointer<unknown>
}) => {
  const { finalize_data, finalize_cb, finalize_hint } = value
  finalize_cb(finalize_data, finalize_hint)
})

/**
 * @__sig p
 */
export function _v8_isolate_get_current (): number {
  return 0
}

/**
 * @__sig p
 */
export function _v8_isolate_get_current_context (): number {
  return 5
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_open_handle_scope (_isolate: Pointer<unknown>): napi_handle_scope {
  return emnapiCtx.openScopeRaw().id
}

/**
 * @__deps $emnapiCtx
 * @__sig v
 */
export function _v8_close_handle_scope (): void {
  return emnapiCtx.closeScopeRaw()
}

/**
 * @__deps $emnapiCtx
 * @__sig ippppp
 */
export function _v8_get_cb_info (cbinfo: napi_callback_info, argc: Pointer<size_t>, argv: Pointer<napi_value>, this_arg: Pointer<napi_value>, data: void_pp): napi_status {
  if (!cbinfo) return 1
  const cbinfoValue = emnapiCtx.getCallbackInfo(cbinfo)

  from64('argc')
  from64('argv')

  if (argv) {
    if (!argc) return 1
    let argcValue = makeGetValue('argc', 0, SIZE_TYPE)
    from64('argcValue')

    const len = cbinfoValue.args.length
    const arrlen = argcValue < len ? argcValue : len
    let i = 0

    for (; i < arrlen; i++) {
      const argVal = emnapiCtx.napiValueFromJsValue(cbinfoValue.args[i])
      makeSetValue('argv', 'i * ' + POINTER_SIZE, 'argVal', '*')
    }
    if (i < argcValue) {
      for (; i < argcValue; i++) {
        makeSetValue('argv', 'i * ' + POINTER_SIZE, '1', '*')
      }
    }
  }
  if (argc) {
    makeSetValue('argc', 0, 'cbinfoValue.args.length', SIZE_TYPE)
  }
  if (this_arg) {
    from64('this_arg')

    const v = emnapiCtx.napiValueFromJsValue(cbinfoValue.thiz)
    makeSetValue('this_arg', 0, 'v', '*')
  }
  if (data) {
    from64('data')
    const localData = emnapiCtx.napiValueFromJsValue(cbinfoValue.data)
    makeSetValue('data', 0, 'localData', '*')
  }
  return 0
}

/**
 * @__deps $emnapiCtx
 * @__sig ppppppiiipiii
 */
export function _v8_function_template_new (
  isolate: Pointer<unknown>,
  callback: Pointer<unknown>,
  cb: Pointer<unknown>,
  data: Pointer<unknown>,
  signature: Pointer<unknown>,
  length: number,
  behavior: number,
  side_effect_type: number,
  c_function: Pointer<unknown>,
  instance_type: number,
  allowed_receiver_instance_type_range_start: number,
  allowed_receiver_instance_type_range_end: number
): Pointer<unknown> {
  const jsCb = makeDynCall('ppp', 'callback')
  const tpl = emnapiCtx.createFunctionTemplate(jsCb, cb, emnapiCtx.jsValueFromNapiValue(data))
  return emnapiCtx.napiValueFromJsValue(tpl)
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_cbinfo_rv (info: napi_callback_info): Pointer<unknown> {
  return 1
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_cbinfo_new_target (info: napi_callback_info): Pointer<unknown> {
  const cbinfoValue = emnapiCtx.getCallbackInfo(info)
  const { thiz, fn } = cbinfoValue

  const value = thiz == null || thiz.constructor == null
    ? 0
    : thiz instanceof fn
      ? emnapiCtx.napiValueFromJsValue(thiz.constructor)
      : 0

  return value
}

/**
 * @__deps $emnapiGetHandle
 * @__deps $emnapiCtx
 * @__sig ipppp
 */
export function _v8_add_finalizer (js_object: void_p, finalize_data: void_p, finalize_cb: void_p, finalize_hint: void_p): number {
  if (!emnapiCtx.features.finalizer) {
    return 9
  }

  if (!js_object) return 1
  if (!finalize_cb) return 1

  const handleResult = emnapiGetHandle(js_object)
  if (handleResult.status !== napi_status.napi_ok) {
    return handleResult.status
  }

  const value = handleResult.value!

  from64('finalize_data')
  from64('finalize_cb')
  from64('finalize_hint')
  finalizerRegistry.register(value!, {
    finalize_data,
    finalize_cb: makeDynCall('vpp', 'finalize_cb'),
    finalize_hint
  }, value!)

  return 0
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_function_template_get_function (template: Ptr, context: Ptr) {
  const tpl = emnapiCtx.jsValueFromNapiValue<FunctionTemplate>(template)
  if (!tpl) return 0
  return emnapiCtx.napiValueFromJsValue(tpl.getFunction())
}

export function _v8_function_template_set_class_name (template: Ptr, name: Ptr): void {
  const tpl = emnapiCtx.jsValueFromNapiValue<FunctionTemplate>(template)
  const nameValue = emnapiCtx.jsValueFromNapiValue(name)
  if (!tpl || nameValue == null) return
  tpl.setClassName(nameValue)
}

/**
 * @__deps $emnapiCtx
 * @__deps $emnapiString
 * @__sig pppii
 */
export function _v8_string_new_from_utf8 (isolate: Ptr, data: Ptr, type: number, length: number): Ptr {
  from64('data')
  from64('length')
  const str = emnapiString.UTF8ToString(data as number, length)
  return emnapiCtx.napiValueFromJsValue(str)
}

/**
 * @__deps $emnapiCtx
 * @__sig vpp
 */
export function _v8_function_set_name (fn: Ptr, name: Ptr): void {
  if (!emnapiCtx.features.setFunctionName) {
    return
  }
  const str = emnapiCtx.jsValueFromNapiValue(name)
  const func = emnapiCtx.jsValueFromNapiValue(fn)
  emnapiCtx.features.setFunctionName(func, str)
}

/**
 * @__deps $emnapiCtx
 * @__sig ippppp
 */
export function _v8_object_set (obj: Ptr, context: Ptr, key: Ptr, value: Ptr, success: Ptr): number {
  let r = false
  try {
    r = Reflect.set(emnapiCtx.jsValueFromNapiValue(obj), emnapiCtx.jsValueFromNapiValue(key), emnapiCtx.jsValueFromNapiValue(value))
  } catch (_) {
    return 10
  }
  from64('success')
  if (success) {
    const v = r ? 1 : 0
    makeSetValue('success', 0, 'v', 'i32')
  }
  return 0
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_handle_scope_escape (scope: Pointer<unknown>, value: Pointer<unknown>): Pointer<unknown> {
  const scopeValue = emnapiCtx.getHandleScope(scope)!
  from64('value')
  return scopeValue.escape(value as number)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_object_template_new (
  isolate: Ptr,
  constructor: Ptr
): Ptr {
  const tpl = emnapiCtx.createObjectTemplate(emnapiCtx.jsValueFromNapiValue(constructor))
  return emnapiCtx.napiValueFromJsValue(tpl)
}

/**
 * @__deps $emnapiCtx
 * @__sig vpi
 */
export function _v8_object_template_set_internal_field_count (
  tpl: Ptr,
  value: number
): void {
  const templateObject = emnapiCtx.jsValueFromNapiValue(tpl)
  templateObject.setInternalFieldCount(value)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_external_new (
  isolate: Ptr,
  data: number
): Ptr {
  const external = emnapiCtx.createExternal(data)
  return emnapiCtx.napiValueFromJsValue(external)
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_external_value (
  external: Ptr
): Ptr {
  const obj = emnapiCtx.jsValueFromNapiValue(external)
  return emnapiCtx.getExternalValue(obj)
}

/**
 * @__deps $emnapiCtx
 * @__sig vpip
 */
export function _v8_object_set_internal_field (
  obj: Ptr,
  index: number,
  data: Ptr
): void {
  const objValue = emnapiCtx.jsValueFromNapiValue(obj)
  const dataValue = emnapiCtx.jsValueFromNapiValue(data)
  emnapiCtx.setInternalField(objValue, index, dataValue)
}

/**
 * @__deps $emnapiCtx
 * @__sig pip
 */
export function _v8_object_get_internal_field (
  obj: Ptr,
  index: number
): Ptr {
  const objValue = emnapiCtx.jsValueFromNapiValue(obj)
  return emnapiCtx.napiValueFromJsValue(emnapiCtx.getInternalField(objValue, index))
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_object_template_new_instance (
  obj_tpl: Ptr,
  context: Ptr
): Ptr {
  const objTemplate = emnapiCtx.jsValueFromNapiValue(obj_tpl)
  return emnapiCtx.napiValueFromJsValue(objTemplate.newInstance(context))
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_boolean (value: Ptr, isolate: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  const boolValue = Boolean(jsValue)
  return emnapiCtx.napiValueFromJsValue(boolValue)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_number (value: Ptr, context: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  const numValue = Number(jsValue)
  return emnapiCtx.napiValueFromJsValue(numValue)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_string (value: Ptr, context: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  const strValue = String(jsValue)
  return emnapiCtx.napiValueFromJsValue(strValue)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_object (value: Ptr, context: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  if (jsValue === null || jsValue === undefined) return 0
  const objValue = Object(jsValue)
  return emnapiCtx.napiValueFromJsValue(objValue)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_integer (value: Ptr, context: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  const intValue = Number(jsValue) | 0
  return emnapiCtx.napiValueFromJsValue(intValue)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_uint32 (value: Ptr, context: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  const uint32Value = Number(jsValue) >>> 0
  return emnapiCtx.napiValueFromJsValue(uint32Value)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_int32 (value: Ptr, context: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  const int32Value = Number(jsValue) | 0
  return emnapiCtx.napiValueFromJsValue(int32Value)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_value_to_array_index (value: Ptr, context: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  // V8: ToArrayIndex returns uint32 if possible, else undefined
  const n = Number(jsValue)
  if (
    typeof n === 'number' &&
    isFinite(n) &&
    n >= 0 &&
    n <= 0xffffffff &&
    Math.floor(n) === n
  ) {
    return emnapiCtx.napiValueFromJsValue(n >>> 0)
  }
  return 0
}

/**
 * @__deps $emnapiCtx
 * @__sig pi
 */
export function _v8_value_is_function (value: Ptr): number {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  if (jsValue == null) return 0
  const isFunction = typeof jsValue === 'function'
  return isFunction ? 1 : 0
}

/**
 * @__deps $emnapiCtx
 * @__sig pi
 */
export function _v8_boolean_value (value: Ptr): number {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  return jsValue ? 1 : 0
}

/**
 * @__deps $emnapiCtx
 * @__sig dp
 */
export function _v8_number_value (value: Ptr): number {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  return Number(jsValue)
}

/**
 * @__deps $emnapiCtx
 * @__sig vpp
 */
export function _v8_integer_value (value: Ptr, out: Ptr): void {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  // Use BigInt if available, else fallback to Number
  let v: bigint | number
  if (typeof jsValue === 'bigint') {
    v = jsValue
  } else {
    v = Math.trunc(Number(jsValue))
  }
  from64('out')
  makeSetValue('out', 0, 'v', 'i64')
}

/**
 * @__deps $emnapiCtx
 * @__sig ip
 */
export function _v8_uint32_value (value: Ptr): number {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  return Number(jsValue) >>> 0
}

/**
 * @__deps $emnapiCtx
 * @__sig ip
 */
export function _v8_int32_value (value: Ptr): number {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  return Number(jsValue) | 0
}

/**
 * @__deps $emnapiCtx
 * @__sig ppd
 */
export function _v8_number_new (isolate: Ptr, value: number): Ptr {
  return emnapiCtx.napiValueFromJsValue(value)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppi
 */
export function _v8_integer_new (isolate: Ptr, value: number): Ptr {
  return emnapiCtx.napiValueFromJsValue(value | 0)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppi
 */
export function _v8_integer_new_from_unsigned (isolate: Ptr, value: number): Ptr {
  return emnapiCtx.napiValueFromJsValue(value >>> 0)
}
