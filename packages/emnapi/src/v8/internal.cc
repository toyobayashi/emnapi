#include "v8_impl.h"

namespace v8 {

namespace internal {
  Isolate* IsolateFromNeverReadOnlySpaceObject(unsigned long obj) {
    return reinterpret_cast<Isolate*>(v8::Isolate::GetCurrent());
  }
}

namespace api_internal {

void ToLocalEmpty() {
  abort();
}

void FromJustIsNothing() {
  abort();
}

}  // namespace api_internal

}  // namespace v8
