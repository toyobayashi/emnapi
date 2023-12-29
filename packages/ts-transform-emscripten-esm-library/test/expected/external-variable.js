const fortyTwo = 42;
const arr = new Uint8Array(fortyTwo);
function _x(param) {
    const ret = arr;
    return param + ret;
}
(typeof addToLibrary === "function" ? addToLibrary : (...args) => mergeInto(LibraryManager.library, ...args))({
    $fortyTwo: "42",
    $arr: "new Uint8Array(fortyTwo)",
    $arr__deps: ["$fortyTwo"],
    x: _x,
    x__deps: ["$arr"]
});
