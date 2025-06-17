#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_external_new(Isolate* isolate, void* data);
  V8_EXTERN void* _v8_external_value(const External* obj);
}

void External::CheckCast(v8::Value* that) {}

Local<External> External::New(v8::Isolate* isolate, void* value) {
  internal::Address obj_value = _v8_external_new(isolate, value);
  if (!obj_value) return Local<External>();
  auto obj = v8impl::V8LocalValueFromAddress(obj_value).As<External>();
  return obj;
}

void* External::Value() const {
  return _v8_external_value(this);
}

}
