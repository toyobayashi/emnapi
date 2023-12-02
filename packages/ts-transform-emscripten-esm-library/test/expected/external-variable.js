const fortyTwo = 42;
const arr = new Uint8Array(fortyTwo);
function _x(param) {
    const ret = arr;
    return param + ret;
}
mergeInto(LibraryManager.library, {
    $fortyTwo: "42",
    $arr: "new Uint8Array(fortyTwo)",
    $arr__deps: ["$fortyTwo"],
    x: _x,
    x__deps: ["$arr"]
});
