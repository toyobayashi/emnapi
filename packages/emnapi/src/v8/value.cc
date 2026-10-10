#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN bool _v8_value_strict_equals(const Value*, Value*);
  V8_EXTERN int _v8_value_equals(const Value*, Context*, Value*, int* result);
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
  V8_EXTERN bool _v8_value_is_number(const Value*);
  V8_EXTERN bool _v8_value_is_array_buffer_view(const Value*);
  V8_EXTERN bool _v8_value_is_object(const Value*);
}

void Value::CheckCast(Data*) {}

bool Value::StrictEquals(Local<Value> that) const {
  return _v8_value_strict_equals(
      v8impl::HandleValuePointer(this),
      v8impl::HandleValuePointer(*that));
}

Maybe<bool> Value::Equals(Local<Context> context, Local<Value> that) const {
  int result = 0;
  int r = _v8_value_equals(v8impl::HandleValuePointer(this),
                           v8impl::HandleValuePointer(*context),
                           v8impl::HandleValuePointer(*that), &result);
  if (r != 0) return Nothing<bool>();
  return Just<bool>(result != 0);
}

Local<Boolean> Value::ToBoolean(Isolate* isolate) const {
  return v8impl::V8LocalValueFromAddress(_v8_value_to_boolean(v8impl::HandleValuePointer(this), isolate)).As<Boolean>();
}

MaybeLocal<Number> Value::ToNumber(Local<Context> context) const {
  internal::Address value = _v8_value_to_number(v8impl::HandleValuePointer(this), v8impl::HandleValuePointer(*context));
  if (!value) return MaybeLocal<Number>();
  return v8impl::V8LocalValueFromAddress(value).As<Number>();
}

MaybeLocal<String> Value::ToString(Local<Context> context) const {
  internal::Address value = _v8_value_to_string(v8impl::HandleValuePointer(this), v8impl::HandleValuePointer(*context));
  if (!value) return MaybeLocal<String>();
  return v8impl::V8LocalValueFromAddress(value).As<String>();
}

MaybeLocal<String> Value::ToDetailString(Local<Context> context) const {
  return ToString(context);
}

bool Value::FullIsUndefined() const {
  return _v8_value_is_undefined(v8impl::HandleValuePointer(this));
}

bool Value::FullIsNull() const {
  return _v8_value_is_null(v8impl::HandleValuePointer(this));
}

bool Value::FullIsTrue() const {
  return _v8_value_is_true(v8impl::HandleValuePointer(this));
}

bool Value::FullIsFalse() const {
  return _v8_value_is_false(v8impl::HandleValuePointer(this));
}

bool Value::FullIsString() const {
  return _v8_value_is_string(v8impl::HandleValuePointer(this));
}

bool Value::IsFunction() const {
  return _v8_value_is_function(v8impl::HandleValuePointer(this));
}

bool Value::IsNumber() const {
  return _v8_value_is_number(v8impl::HandleValuePointer(this));
}

bool Value::IsArrayBufferView() const {
  return _v8_value_is_array_buffer_view(v8impl::HandleValuePointer(this));
}

bool Value::IsObject() const {
  return _v8_value_is_object(v8impl::HandleValuePointer(this));
}

MaybeLocal<Object> Value::ToObject(Local<Context> context) const {
  internal::Address value = _v8_value_to_object(v8impl::HandleValuePointer(this), v8impl::HandleValuePointer(*context));
  if (!value) return MaybeLocal<Object>();
  return v8impl::V8LocalValueFromAddress(value).As<Object>();
}

MaybeLocal<Integer> Value::ToInteger(Local<Context> context) const {
  internal::Address value = _v8_value_to_integer(v8impl::HandleValuePointer(this), v8impl::HandleValuePointer(*context));
  if (!value) return MaybeLocal<Integer>();
  return v8impl::V8LocalValueFromAddress(value).As<Integer>();
}

MaybeLocal<Uint32> Value::ToUint32(Local<Context> context) const {
  internal::Address value = _v8_value_to_uint32(v8impl::HandleValuePointer(this), v8impl::HandleValuePointer(*context));
  if (!value) return MaybeLocal<Uint32>();
  return v8impl::V8LocalValueFromAddress(value).As<Uint32>();
}

MaybeLocal<Int32> Value::ToInt32(Local<Context> context) const {
  internal::Address value = _v8_value_to_int32(v8impl::HandleValuePointer(this), v8impl::HandleValuePointer(*context));
  if (!value) return MaybeLocal<Int32>();
  return v8impl::V8LocalValueFromAddress(value).As<Int32>();
}

MaybeLocal<Uint32> Value::ToArrayIndex(Local<Context> context) const {
  internal::Address value = _v8_value_to_array_index(v8impl::HandleValuePointer(this), v8impl::HandleValuePointer(*context));
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
