/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_json_parse (context: Ptr, json_string: Ptr): Ptr {
  const jsonStringValue = emnapiCtx.jsValueFromNapiValue(json_string)
  try {
    const parsedValue = JSON.parse(jsonStringValue)
    return emnapiCtx.napiValueFromJsValue(parsedValue)
  } catch (e) {
    emnapiCtx.isolate.throwException(e)
    return 0
  }
}

/**
 * @__deps $emnapiCtx
 * @__sig pppp
 */
export function _v8_json_stringify (context: Ptr, json_object: Ptr, gap: Ptr): Ptr {
  const jsonStringValue = emnapiCtx.jsValueFromNapiValue(json_object)
  try {
    const str = JSON.stringify(jsonStringValue, null, emnapiCtx.jsValueFromNapiValue(gap))
    return emnapiCtx.napiValueFromJsValue(str)
  } catch (e) {
    emnapiCtx.isolate.throwException(e)
    return 0
  }
}
