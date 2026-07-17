#ifndef EMNAPI_V8_INTERNAL_H_
#define EMNAPI_V8_INTERNAL_H_

#include "v8.h"

namespace v8 {

namespace internal {

struct HandleScopeData final {
  static constexpr uint32_t kSizeInBytes =
      2 * v8::internal::kApiSystemPointerSize + 2 * v8::internal::kApiInt32Size;

  Address* next;
  Address* limit;
  int level;
  int sealed_level;

  void Initialize() {
    next = limit = nullptr;
    sealed_level = level = 0;
  }
};

class Isolate {
 private:
  // The isolate data is accessed through `internal::Address*`
  // (e.g. `Internals::GetRootSlot`), so it must be at least
  // pointer-aligned. Without this, whether the static instance in
  // `Isolate::GetCurrent()` is sufficiently aligned depends on the
  // surrounding data layout, and misaligned wasm64 i64 loads trap
  // under SAFE_HEAP=1 (alignment fault).
  alignas(kApiSystemPointerSize) char data_[1024];

 public:
  explicit Isolate();

  V8_INLINE HandleScopeData* handle_scope_data() {
    return reinterpret_cast<HandleScopeData*>(data_ + internal::Internals::kIsolateHandleScopeDataOffset);
  }
};

}

}

#endif
