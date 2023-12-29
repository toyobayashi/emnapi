function _getPointerSize(ret) {
    {{{ from64('ret') }}};
    {{{ makeSetValue('ret', 0, POINTER_SIZE, SIZE_TYPE) }}};
    console.log(HEAPU8.buffer === wasmMemory.buffer);
    return {{{ POINTER_SIZE }}};
}
(typeof addToLibrary === "function" ? addToLibrary : (...args) => mergeInto(LibraryManager.library, ...args))({
    getPointerSize: _getPointerSize
});
