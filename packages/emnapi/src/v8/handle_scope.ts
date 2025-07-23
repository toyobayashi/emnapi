import { from64 } from 'emscripten:parse-tools'

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_open_handle_scope (_isolate: Pointer<unknown>): napi_handle_scope {
  return emnapiCtx.isolate.openScope().id
}

/**
 * @__deps $emnapiCtx
 * @__sig v
 */
export function _v8_close_handle_scope (): void {
  return emnapiCtx.isolate.closeScope()
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
