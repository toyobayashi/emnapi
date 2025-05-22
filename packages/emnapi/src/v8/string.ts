import { from64 } from 'emscripten:parse-tools'

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
