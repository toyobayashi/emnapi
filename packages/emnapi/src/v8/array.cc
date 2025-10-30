#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_array_new(Isolate* isolate, int length);
  V8_EXTERN uint32_t _v8_array_length(const Array* array);
}

Local<Array> Array::New(Isolate* isolate, int length) {
  auto n = _v8_array_new(isolate, length);
  return v8impl::V8LocalValueFromAddress(n).As<Array>();
}

uint32_t Array::Length() const {
  return _v8_array_length(this);
}

}
