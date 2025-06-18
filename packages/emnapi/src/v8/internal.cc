#include "v8_impl.h"
#include "internal.h"

namespace v8 {

namespace internal {

Isolate* IsolateFromNeverReadOnlySpaceObject(unsigned long obj) {
  return reinterpret_cast<Isolate*>(v8::Isolate::GetCurrent());
}

void Internals::CheckInitializedImpl(v8::Isolate*) {}

void VerifyHandleIsNonEmpty(bool is_empty) {
  if (is_empty) {
    abort();
  }
}

Isolate::Isolate(): data_{} {
  *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::kApiSystemPointerSize * v8::internal::Internals::kUndefinedValueRootIndex) = 1;
  *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::kApiSystemPointerSize * v8::internal::Internals::kTheHoleValueRootIndex) = 0;
  *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::kApiSystemPointerSize * v8::internal::Internals::kNullValueRootIndex) = 2;
  *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::kApiSystemPointerSize * v8::internal::Internals::kFalseValueRootIndex) = 3;
  *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::kApiSystemPointerSize * v8::internal::Internals::kTrueValueRootIndex) = 4;
  *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::kApiSystemPointerSize * v8::internal::Internals::kEmptyStringRootIndex) = 6;
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
