#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_exception_error(internal::Address message, internal::Address options);
  V8_EXTERN internal::Address _v8_exception_type_error(internal::Address message, internal::Address options);
  V8_EXTERN internal::Address _v8_exception_range_error(internal::Address message, internal::Address options);
  V8_EXTERN internal::Address _v8_exception_reference_error(internal::Address message, internal::Address options);
  V8_EXTERN internal::Address _v8_exception_syntax_error(internal::Address message, internal::Address options);
}

Local<Value> Exception::Error(Local<String> message, Local<Value> options) {
  return v8impl::V8LocalValueFromAddress(
      _v8_exception_error(
          v8impl::AddressFromV8LocalValue(message),
          v8impl::AddressFromV8LocalValue(options)));
}

Local<Value> Exception::TypeError(Local<String> message, Local<Value> options) {
  return v8impl::V8LocalValueFromAddress(
      _v8_exception_type_error(
          v8impl::AddressFromV8LocalValue(message),
          v8impl::AddressFromV8LocalValue(options)));
}

Local<Value> Exception::RangeError(Local<String> message, Local<Value> options) {
  return v8impl::V8LocalValueFromAddress(
      _v8_exception_range_error(
          v8impl::AddressFromV8LocalValue(message),
          v8impl::AddressFromV8LocalValue(options)));
}

Local<Value> Exception::ReferenceError(Local<String> message, Local<Value> options) {
  return v8impl::V8LocalValueFromAddress(
      _v8_exception_reference_error(
          v8impl::AddressFromV8LocalValue(message),
          v8impl::AddressFromV8LocalValue(options)));
}

Local<Value> Exception::SyntaxError(Local<String> message, Local<Value> options) {
  return v8impl::V8LocalValueFromAddress(
      _v8_exception_syntax_error(
          v8impl::AddressFromV8LocalValue(message),
          v8impl::AddressFromV8LocalValue(options)));
}

}
