const _exportedVar = 10;
function f() {
    console.log(_exportedVar);
}
function _exportedFunc() {
    f();
    console.log(_exportedVar);
}
mergeInto(LibraryManager.library, {
    exportedVar: "10",
    $f: f,
    $f__deps: ["exportedVar"],
    exportedFunc: _exportedFunc,
    exportedFunc__deps: ["$f", "exportedVar"]
});
