import { from64, makeSetValue, makeGetValue, SIZE_TYPE, POINTER_SIZE } from 'emscripten:parse-tools'

declare var emnapiCtx: Context

/**
 * @__sig p
 */
export function _v8_isolate_get_current (): number {
  return -1
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
    makeSetValue('data', 0, 'cbinfoValue.data', '*')
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
  return 0
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_cbinfo_rv (info: napi_callback_info): Pointer<unknown> {
  return 0
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
