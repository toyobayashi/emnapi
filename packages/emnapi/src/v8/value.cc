#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_value_to_boolean(const Value*, Isolate*);
  V8_EXTERN internal::Address _v8_value_to_number(const Value*, Context*);
  V8_EXTERN internal::Address _v8_value_to_string(const Value*, Context*);
  V8_EXTERN internal::Address _v8_value_to_object(const Value*, Context*);
  V8_EXTERN internal::Address _v8_value_to_integer(const Value*, Context*);
  V8_EXTERN internal::Address _v8_value_to_uint32(const Value*, Context*);
  V8_EXTERN internal::Address _v8_value_to_int32(const Value*, Context*);
  V8_EXTERN internal::Address _v8_value_to_array_index(const Value*, Context*);
  V8_EXTERN bool _v8_value_is_function(const Value*);
  V8_EXTERN bool _v8_value_is_undefined(const Value*);
  V8_EXTERN bool _v8_value_is_null(const Value*);
  V8_EXTERN bool _v8_value_is_true(const Value*);
  V8_EXTERN bool _v8_value_is_false(const Value*);
  V8_EXTERN bool _v8_value_is_string(const Value*);
}

Local<Boolean> Value::ToBoolean(Isolate* isolate) const {
  return v8impl::V8LocalValueFromAddress(_v8_value_to_boolean(this, isolate)).As<Boolean>();
}

MaybeLocal<Number> Value::ToNumber(Local<Context> context) const {
  internal::Address value = _v8_value_to_number(this, *context);
  if (!value) return MaybeLocal<Number>();
  return v8impl::V8LocalValueFromAddress(value).As<Number>();
}

MaybeLocal<String> Value::ToString(Local<Context> context) const {
  internal::Address value = _v8_value_to_string(this, *context);
  if (!value) return MaybeLocal<String>();
  return v8impl::V8LocalValueFromAddress(value).As<String>();
}

MaybeLocal<String> Value::ToDetailString(Local<Context> context) const {
  return ToString(context);
}

bool Value::FullIsUndefined() const {
  return _v8_value_is_undefined(this);
}

bool Value::FullIsNull() const {
  return _v8_value_is_null(this);
}

bool Value::FullIsTrue() const {
  return _v8_value_is_true(this);
}

bool Value::FullIsFalse() const {
  return _v8_value_is_false(this);
}

bool Value::FullIsString() const {
  return _v8_value_is_string(this);
}

bool Value::IsFunction() const {
  return _v8_value_is_function(this);
}

MaybeLocal<Object> Value::ToObject(Local<Context> context) const {
  internal::Address value = _v8_value_to_object(this, *context);
  if (!value) return MaybeLocal<Object>();
  return v8impl::V8LocalValueFromAddress(value).As<Object>();
}

MaybeLocal<Integer> Value::ToInteger(Local<Context> context) const {
  internal::Address value = _v8_value_to_integer(this, *context);
  if (!value) return MaybeLocal<Integer>();
  return v8impl::V8LocalValueFromAddress(value).As<Integer>();
}

MaybeLocal<Uint32> Value::ToUint32(Local<Context> context) const {
  internal::Address value = _v8_value_to_uint32(this, *context);
  if (!value) return MaybeLocal<Uint32>();
  return v8impl::V8LocalValueFromAddress(value).As<Uint32>();
}

MaybeLocal<Int32> Value::ToInt32(Local<Context> context) const {
  internal::Address value = _v8_value_to_int32(this, *context);
  if (!value) return MaybeLocal<Int32>();
  return v8impl::V8LocalValueFromAddress(value).As<Int32>();
}

MaybeLocal<Uint32> Value::ToArrayIndex(Local<Context> context) const {
  internal::Address value = _v8_value_to_array_index(this, *context);
  if (!value) return MaybeLocal<Uint32>();
  return v8impl::V8LocalValueFromAddress(value).As<Uint32>();
}

bool Value::BooleanValue(Isolate* isolate) const {
  return ToBoolean(isolate)->Value();
}

Maybe<double> Value::NumberValue(Local<Context> context) const {
  auto maybe = ToNumber(context);
  if (maybe.IsEmpty()) return Nothing<double>();
  return Just<double>(maybe.ToLocalChecked()->Value());
}

Maybe<int64_t> Value::IntegerValue(Local<Context> context) const {
  auto maybe = ToInteger(context);
  if (maybe.IsEmpty()) return Nothing<int64_t>();
  return Just<int64_t>(maybe.ToLocalChecked()->Value());
}

Maybe<uint32_t> Value::Uint32Value(Local<Context> context) const {
  auto maybe = ToUint32(context);
  if (maybe.IsEmpty()) return Nothing<uint32_t>();
  return Just<uint32_t>(maybe.ToLocalChecked()->Value());
}

Maybe<int32_t> Value::Int32Value(Local<Context> context) const {
  auto maybe = ToInt32(context);
  if (maybe.IsEmpty()) return Nothing<int32_t>();
  return Just<int32_t>(maybe.ToLocalChecked()->Value());
}



}
