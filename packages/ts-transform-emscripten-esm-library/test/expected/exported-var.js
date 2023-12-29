const _x = getX();
function getX() {
    return 42;
}
(typeof addToLibrary === "function" ? addToLibrary : (...args) => mergeInto(LibraryManager.library, ...args))({
    $getX: getX,
    x: "getX()",
    x__deps: ["$getX"]
});
