const fortyTwo = 42;
function _x() {
    console.log(fortyTwo);
}
const _y = () => fortyTwo;
(typeof addToLibrary === "function" ? addToLibrary : (...args) => mergeInto(LibraryManager.library, ...args))({
    $fortyTwo: "42",
    x: _x,
    x__deps: ["$fortyTwo"],
    y: _y,
    y__deps: ["$fortyTwo"]
});
