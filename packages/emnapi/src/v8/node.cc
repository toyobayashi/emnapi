#include "node.h"
#include "v8_impl.h"

namespace node {

extern "C" {
  V8_EXTERN v8::internal::Address _node_encode(v8::Isolate*, const void* buf, size_t len, int encoding);
}

v8::Local<v8::Value> Encode(v8::Isolate* isolate,
                            const char* buf,
                            size_t len,
                            enum encoding encoding) {
  return v8::v8impl::V8LocalValueFromAddress(
      _node_encode(isolate, buf, len, static_cast<int>(encoding)));
}

v8::Local<v8::Value> Encode(v8::Isolate* isolate,
                            const uint16_t* buf,
                            size_t len) {
  return v8::v8impl::V8LocalValueFromAddress(_node_encode(isolate, buf, len, -1));
}

}
