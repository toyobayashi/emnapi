#include "v8_impl.h"
#include "internal.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_globalize_reference(
    internal::Isolate* isolate, internal::Address value);
  V8_EXTERN internal::Address _v8_copy_global_reference(internal::Address from);
  V8_EXTERN internal::Address _v8_local_from_global_reference(internal::Address ref);
  V8_EXTERN void _v8_move_global_reference(internal::Address from,
                                           internal::Address to);
  V8_EXTERN void _v8_dispose_global(internal::Address global_handle);
  V8_EXTERN void _v8_make_weak(internal::Address location,
                               void* data,
                               void (*callback)(
                                WeakCallbackInfo<void>::Callback weak_callback,
                                void* data, WeakCallbackType type,
                                void* internal_field1, void* internal_field2),
                               WeakCallbackInfo<void>::Callback weak_callback,
                               WeakCallbackType type);
  V8_EXTERN void* _v8_clear_weak(internal::Address location);
}

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
  internal::Address ref_id = _v8_globalize_reference(isolate, value);
  return new internal::Address(ref_id);
}

void DisposeGlobal(internal::Address* global_handle) {
  _v8_dispose_global(*global_handle);
  delete global_handle;
}

internal::Address* CopyGlobalReference(internal::Address* from) {
  internal::Address ref_id = _v8_copy_global_reference(*from);
  return new internal::Address(ref_id);
}

internal::Address LocalFromGlobalReference(internal::Address global_handle) {
  return _v8_local_from_global_reference(global_handle);
}

void MoveGlobalReference(internal::Address** from, internal::Address** to) {
  if (*from == *to) {
    return;
  }
  *to = *from;
  *from = nullptr;
  // _v8_move_global_reference(**from, **to);
}

namespace {
static void WeakCallback(WeakCallbackInfo<void>::Callback weak_callback,
                         void* data,
                         WeakCallbackType type,
                         void* internal_field1,
                         void* internal_field2) {
  void* embedder_fields[kEmbedderFieldsInWeakCallback] = {
    internal_field1, internal_field2
  };
  WeakCallbackInfo<void>::Callback second = nullptr;
  WeakCallbackInfo<void> info(
    Isolate::GetCurrent(), data,
    embedder_fields, &second);
  weak_callback(info);
  if (second != nullptr) {
    second(info);
  }
}
}

void MakeWeak(internal::Address* location, void* data,
              WeakCallbackInfo<void>::Callback weak_callback,
              WeakCallbackType type) {
  _v8_make_weak(*location, data, WeakCallback, weak_callback, type);
}

void* ClearWeak(internal::Address* location) {
  return _v8_clear_weak(*location);
};

}  // namespace api_internal

}  // namespace v8
