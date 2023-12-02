function _x() {
    return 42;
}
mergeInto(LibraryManager.library, {
    x: _x
});
