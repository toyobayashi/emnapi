#include "v8_impl.h"
#include "internal.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_isolate_get_current_context(const Isolate* isolate);
  V8_EXTERN internal::Address _v8_isolate_throw_exception(v8::internal::Address);
}

void Context::CheckCast(v8::Data*) {}

Isolate* Context::GetIsolate() {
  return v8::Isolate::GetCurrent();
}

Isolate* Isolate::GetCurrent() {
  static internal::Isolate current_isolate;
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
