import { from64, makeSetValue, makeGetValue, SIZE_TYPE, POINTER_SIZE, makeDynCall } from 'emscripten:parse-tools'

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
export function _v8_object_template_new_instance (
  obj_tpl: Ptr,
  context: Ptr
): Ptr {
  if (emnapiCtx.hasPendingException()) return 1
  const objTemplate = emnapiCtx.jsValueFromNapiValue(obj_tpl)
  return emnapiCtx.napiValueFromJsValue(objTemplate.newInstance(context))
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_signature_new (
  isolate: Ptr,
  receiver: Ptr
): Ptr {
  // TODO
  return 1
}
