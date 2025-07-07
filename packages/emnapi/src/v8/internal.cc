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
  *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::kApiSystemPointerSize * v8::internal::Internals::kUndefinedValueRootIndex) = static_cast<internal::Address>(v8impl::GlobalHandle::kUndefined);
  *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::kApiSystemPointerSize * v8::internal::Internals::kTheHoleValueRootIndex) = static_cast<internal::Address>(v8impl::GlobalHandle::kHole);
  *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::kApiSystemPointerSize * v8::internal::Internals::kNullValueRootIndex) = static_cast<internal::Address>(v8impl::GlobalHandle::kNull);
  *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::kApiSystemPointerSize * v8::internal::Internals::kFalseValueRootIndex) = static_cast<internal::Address>(v8impl::GlobalHandle::kFalse);
  *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::kApiSystemPointerSize * v8::internal::Internals::kTrueValueRootIndex) = static_cast<internal::Address>(v8impl::GlobalHandle::kTrue);
  *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::kApiSystemPointerSize * v8::internal::Internals::kEmptyStringRootIndex) = static_cast<internal::Address>(v8impl::GlobalHandle::kEmptyString);
}

}

namespace api_internal {

void ToLocalEmpty() {
  abort();
}

void FromJustIsNothing() {
  abort();
}

internal::Address* GlobalizeReference(internal::Isolate* isolate,
                                      internal::Address value) {
  // TODO
  return nullptr;
}

void DisposeGlobal(internal::Address* global_handle) {
  // TODO
}

void MakeWeak(internal::Address* location, void* data,
              WeakCallbackInfo<void>::Callback weak_callback,
              WeakCallbackType type) {
  // TODO
}

void* ClearWeak(internal::Address* location) {
  // TODO
  return nullptr;
};

}  // namespace api_internal

}  // namespace v8
