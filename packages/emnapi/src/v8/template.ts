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
  const tpl = emnapiCtx.createFunctionTemplate(
    jsCb, cb, emnapiCtx.jsValueFromNapiValue(data),
    emnapiCtx.jsValueFromNapiValue(signature)
  )
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
  const rcv = emnapiCtx.jsValueFromNapiValue(receiver)
  const sig = emnapiCtx.createSignature(rcv)
  return emnapiCtx.napiValueFromJsValue(sig)
}

/**
 * @__deps $emnapiCtx
 * @__sig vpppi
 */
export function _v8_template_set (
  tpl: Ptr,
  name: Ptr,
  value: Ptr,
  attr: number
): void {
  const templateObject = emnapiCtx.jsValueFromNapiValue(tpl)
  if (!templateObject) return

  const nameValue = emnapiCtx.jsValueFromNapiValue(name)
  const valueValue = emnapiCtx.jsValueFromNapiValue(value)

  if (nameValue == null) return

  templateObject.set(nameValue, valueValue, attr)
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_function_template_instance_template (
  tpl: Ptr
): Ptr {
  const templateObject = emnapiCtx.jsValueFromNapiValue(tpl)
  if (!templateObject) return 1
  return emnapiCtx.napiValueFromJsValue(templateObject.instanceTemplate())
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_function_template_prototype_template (
  tpl: Ptr
): Ptr {
  const templateObject = emnapiCtx.jsValueFromNapiValue(tpl)
  if (!templateObject) return 1
  return emnapiCtx.napiValueFromJsValue(templateObject.prototypeTemplate())
}

/**
 * @__deps $emnapiCtx
 * @__sig vpp
 */
export function _v8_get_property_cb_info (
  cbinfo: Ptr,
  args: Ptr
): void {
  if (!cbinfo) return
  const cbinfoValue = emnapiCtx.getCallbackInfo(cbinfo)

  /**
   * static constexpr int kShouldThrowOnErrorIndex = 0;
   * static constexpr int kHolderIndex = 1;
   * static constexpr int kIsolateIndex = 2;
   * static constexpr int kUnusedIndex = 3;
   * static constexpr int kReturnValueIndex = 4;
   * static constexpr int kDataIndex = 5;
   * static constexpr int kThisIndex = 6;
   * static constexpr int kArgsLength = 7;
   */
  from64('args')

  const thiz = emnapiCtx.napiValueFromJsValue(cbinfoValue.thiz)
  makeSetValue('args', '1 * ' + POINTER_SIZE, 'thiz', '*')
  makeSetValue('args', '6 * ' + POINTER_SIZE, 'thiz', '*')

  const localData = emnapiCtx.napiValueFromJsValue(cbinfoValue.data)
  makeSetValue('args', '5 * ' + POINTER_SIZE, 'localData', '*')
}

/**
 * @__deps $emnapiCtx
 * @__sig vpppppppiii
 */
export function _v8_object_template_set_accessor (
  tpl: Ptr,
  name: Ptr,
  getter_wrap: Ptr,
  setter_wrap: Ptr,
  getter: Ptr,
  setter: Ptr,
  data: Ptr,
  attribute: number,
  getter_side_effect_type: number,
  setter_side_effect_type: number
): void {
  const templateObject = emnapiCtx.jsValueFromNapiValue(tpl)
  if (!templateObject) return

  const nameValue = emnapiCtx.jsValueFromNapiValue(name)

  from64('getter_wrap')
  from64('setter_wrap')
  const getterWrap = makeDynCall('pppp', 'getter_wrap')
  const setterWrap = makeDynCall('ppppp', 'setter_wrap')

  templateObject.setAccessor(
    nameValue,
    getterWrap,
    setterWrap,
    getter,
    setter,
    emnapiCtx.jsValueFromNapiValue(data),
    attribute,
    getter_side_effect_type,
    setter_side_effect_type
  )
}
