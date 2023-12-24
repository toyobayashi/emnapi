const fortyTwo = 42;
const bar = fortyTwo;
function x() {
    return fortyTwo;
}
function foo() {
    return fortyTwo;
}
function _z() {
    return foo();
}
(typeof addToLibrary === "function" ? addToLibrary : (...args) => mergeInto(LibraryManager.library, ...args))({
    $fortyTwo: "42",
    $x: x,
    $x__deps: ["$fortyTwo"],
    $foo: foo,
    $foo__deps: ["$fortyTwo"],
    z: _z,
    z__deps: ["$foo"],
    $bar: "fortyTwo",
    $bar__deps: ["$fortyTwo"]
});
