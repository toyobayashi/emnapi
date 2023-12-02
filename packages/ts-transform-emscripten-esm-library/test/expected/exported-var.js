const _x = getX();
function getX() {
    return 42;
}
mergeInto(LibraryManager.library, {
    $getX: getX,
    x: "getX()",
    x__deps: ["$getX"]
});
