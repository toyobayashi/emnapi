#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_isolate_get_current_context(const Isolate* isolate);
  V8_EXTERN internal::Address _v8_isolate_throw_exception(v8::internal::Address);
}

namespace {

struct IsolateImpl {
  char data_[2048];

  IsolateImpl(): data_{} {
    memset(data_, 0, sizeof(data_));

    *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::Internals::kUndefinedValueRootIndex * v8::internal::kApiSystemPointerSize) = 1;
    *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::Internals::kTheHoleValueRootIndex * v8::internal::kApiSystemPointerSize) = 0;
    *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::Internals::kNullValueRootIndex * v8::internal::kApiSystemPointerSize) = 2;
    *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::Internals::kFalseValueRootIndex * v8::internal::kApiSystemPointerSize) = 3;
    *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::Internals::kTrueValueRootIndex * v8::internal::kApiSystemPointerSize) = 4;
    *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::Internals::kEmptyStringRootIndex * v8::internal::kApiSystemPointerSize) = 6;
  }
};

};

Isolate* Isolate::GetCurrent() {
  static IsolateImpl current_isolate;
  return reinterpret_cast<Isolate*>(&current_isolate);
}

Local<Context> Isolate::GetCurrentContext() {
  return v8impl::V8LocalValueFromAddress(_v8_isolate_get_current_context(this)).As<Context>();
}

Local<Value> Isolate::ThrowException(Local<Value> error) {
  return v8impl::V8LocalValueFromAddress(
    _v8_isolate_throw_exception(v8impl::AddressFromV8LocalValue(error)));
}

}
