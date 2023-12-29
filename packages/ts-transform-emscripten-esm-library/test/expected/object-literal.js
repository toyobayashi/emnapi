const fortyTwo = 42;
/**
 * @__sig ii
 * @param {number} _
 */
const _bar = _ => _;
/**
 * @__postset
 * ```
 * console.log(obj)
 * ```
 */
const obj = {
    foo: fortyTwo,
    bar(param) {
        _bar(param);
    }
};
const arr = [fortyTwo];
/**
 * @__sig i
 */
const _fe = function () {
    return obj.foo === arr[0];
};
/**
 * @__sig ii
 * @param {number} param
 */
const _af = (param) => {
    obj.bar(param);
};
(typeof addToLibrary === "function" ? addToLibrary : (...args) => mergeInto(LibraryManager.library, ...args))({
    bar: _bar,
    bar__sig: "ii",
    $fortyTwo: "42",
    $obj: obj,
    $obj__deps: ["$fortyTwo", "bar"],
    $obj__postset: "console.log(obj)",
    $arr: arr,
    $arr__deps: ["$fortyTwo"],
    fe: _fe,
    fe__deps: ["$obj", "$arr"],
    fe__sig: "i",
    af: _af,
    af__deps: ["$obj"],
    af__sig: "ii"
});
