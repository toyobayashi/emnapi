const _exportedVar = 10;
function f() {
    console.log(_exportedVar);
}
function _exportedFunc() {
    f();
    console.log(_exportedVar);
}
(typeof addToLibrary === "function" ? addToLibrary : (...args) => mergeInto(LibraryManager.library, ...args))({
    exportedVar: "10",
    $f: f,
    $f__deps: ["exportedVar"],
    exportedFunc: _exportedFunc,
    exportedFunc__deps: ["$f", "exportedVar"]
});
