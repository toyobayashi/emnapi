/** @__deps $external */
export function x() {}

/**
 * @__deps emscripten_resize_heap
 * @__deps $runtimeKeepalivePush
 * @__deps $runtimeKeepalivePop
 * @__sig v
 * @__postset
 * ```
 * console.log(42);
 * console.log(_y);
 * ```
 *
 * @returns {void}
 */
export function y() {
  runtimeKeepalivePush()
  runtimeKeepalivePop()
  _emscripten_resize_heap()
  return x()
}
