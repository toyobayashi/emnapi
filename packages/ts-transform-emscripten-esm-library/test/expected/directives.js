function _getPointerSize() {
    let result;
#if MEMORY64
    result = 8;
#else
    result = 4;
#endif
    return result;
}
(typeof addToLibrary === "function" ? addToLibrary : (...args) => mergeInto(LibraryManager.library, ...args))({
    getPointerSize: _getPointerSize
});
