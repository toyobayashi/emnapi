#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_integer_new(Isolate*, int32_t);
  V8_EXTERN internal::Address _v8_integer_new_from_unsigned(Isolate*, uint32_t);
  V8_EXTERN internal::Address _v8_number_new(Isolate*, double);
  V8_EXTERN double _v8_number_value(const Number*);
  V8_EXTERN void _v8_integer_value(const Integer*, int64_t*);
  V8_EXTERN uint32_t _v8_uint32_value(const Uint32*);
  V8_EXTERN int32_t _v8_int32_value(const Int32*);
}

double Number::Value() const {
  return _v8_number_value(this);
}

int64_t Integer::Value() const {
  int64_t ret = 0;
  _v8_integer_value(this, &ret);
  return ret;
}

uint32_t Uint32::Value() const {
  return _v8_uint32_value(this);
}

int32_t Int32::Value() const {
  return _v8_int32_value(this);
}

Local<Number> Number::New(Isolate* isolate, double value) {
  internal::Address number_value = _v8_number_new(isolate, value);
  if (!number_value) return Local<Number>();
  return v8impl::V8LocalValueFromAddress(number_value).As<Number>();
}

Local<Integer> Integer::NewFromUnsigned(Isolate* isolate, uint32_t value) {
  internal::Address number_value = _v8_integer_new_from_unsigned(isolate, value);
  if (!number_value) return Local<Integer>();
  return v8impl::V8LocalValueFromAddress(number_value).As<Integer>();
}

Local<Integer> Integer::New(Isolate* isolate, int32_t value) {
  internal::Address number_value = _v8_integer_new(isolate, value);
  if (!number_value) return Local<Integer>();
  return v8impl::V8LocalValueFromAddress(number_value).As<Integer>();
}

}
