#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_array_new(Isolate* isolate, int length);
}

Local<Array> Array::New(Isolate* isolate, int length) {
  auto n = _v8_array_new(isolate, length);
  return v8impl::V8LocalValueFromAddress(n).As<Array>();
}

}
