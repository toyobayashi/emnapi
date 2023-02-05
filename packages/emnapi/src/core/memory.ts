function __emnapi_wasm_memory_grow (page_increase: size_t): int {
  $from64('page_increase')
  page_increase = page_increase >>> 0
  try {
    wasmMemory.grow(page_increase)
  } catch (_) {
    return 0
  }
  return 1
}

emnapiImplementInternal('_emnapi_wasm_memory_grow', 'ip', __emnapi_wasm_memory_grow)
