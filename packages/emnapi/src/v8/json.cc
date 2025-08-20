#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_json_parse(Context* context, internal::Address json_string);
  V8_EXTERN internal::Address _v8_json_stringify(Context* context, internal::Address json_object, internal::Address gap);
}

MaybeLocal<Value> JSON::Parse(
      Local<Context> context, Local<String> json_string) {
  internal::Address value_address = _v8_json_parse(*context, v8impl::AddressFromV8LocalValue(json_string));
  if (!value_address) return MaybeLocal<Value>();
  return v8impl::V8LocalValueFromAddress(value_address);
}

MaybeLocal<String> JSON::Stringify(
      Local<Context> context, Local<Value> json_object,
      Local<String> gap) {
  internal::Address value_address = _v8_json_stringify(*context, v8impl::AddressFromV8LocalValue(json_object), v8impl::AddressFromV8LocalValue(gap));
  if (!value_address) return MaybeLocal<String>();
  return v8impl::V8LocalValueFromAddress(value_address).As<String>();
}

}
