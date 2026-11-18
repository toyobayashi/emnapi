function _getPointerSizeFromMarkers() {
    let result;
#if MEMORY64
    {{{ makeSetValue('result', 0, '8', 'i32') }}};
#elif MEMORY64 == 0
    {{{ makeSetValue('result', 0, '4', 'i32') }}};
#else
    result = 0;
#endif
    return result;
}
(typeof addToLibrary === "function" ? addToLibrary : (...args) => mergeInto(LibraryManager.library, ...args))({
    getPointerSizeFromMarkers: _getPointerSizeFromMarkers
});
