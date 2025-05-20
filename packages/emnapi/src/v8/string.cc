#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_string_new_from_utf8(Isolate* isolate, const char* data, v8::NewStringType type, int length);
}

MaybeLocal<String> String::NewFromUtf8(v8::Isolate* isolate, char const* data, v8::NewStringType type, int length) {
  auto str = _v8_string_new_from_utf8(isolate, data, type, length);
  if (!str) return MaybeLocal<String>();
  return v8impl::V8LocalValueFromAddress(str).As<String>();
}

}
