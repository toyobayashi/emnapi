/** @__deps $external */
function _x() { }
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
function _y() {
    runtimeKeepalivePush();
    runtimeKeepalivePop();
    _emscripten_resize_heap();
    return _x();
}
mergeInto(LibraryManager.library, {
    x: _x,
    x__deps: ["$external"],
    y: _y,
    y__deps: ["x", "emscripten_resize_heap", "$runtimeKeepalivePush", "$runtimeKeepalivePop"],
    y__sig: "v",
    y__postset: "console.log(42);\nconsole.log(_y);"
});
