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
  char data_[1024];

 public:
  explicit Isolate();

  V8_INLINE HandleScopeData* handle_scope_data() {
    return reinterpret_cast<HandleScopeData*>(data_ + internal::Internals::kIsolateHandleScopeDataOffset);
  }
};

}

}

#endif
