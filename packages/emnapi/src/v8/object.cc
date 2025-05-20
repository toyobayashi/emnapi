#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN int _v8_object_set(Object* obj, Context* context, internal::Address key, internal::Address value, int* success);
  V8_EXTERN void _v8_object_set_internal_field(Object* obj, int index, internal::Address data);
  V8_EXTERN internal::Address _v8_object_get_internal_field(Object* obj, int index);
}

Maybe<bool> Object::Set(v8::Local<v8::Context> context, v8::Local<v8::Value> key, v8::Local<v8::Value> value) {
  int success = 0;
  int r = _v8_object_set(this, *context,
    v8impl::AddressFromV8LocalValue(key), v8impl::AddressFromV8LocalValue(value), &success);
  if (r != 0) return Nothing<bool>();
  return Just<bool>(success);
}
void Object::SetInternalField(int index, v8::Local<v8::Data> data) {
  _v8_object_set_internal_field(this, index, reinterpret_cast<internal::Address>(*data));
}

Local<Data> Object::SlowGetInternalField(int index) {
  internal::Address data_value = _v8_object_get_internal_field(this, index);
  if (!data_value) return Local<Data>();
  return v8impl::V8LocalValueFromAddress(data_value).As<Data>();
}

}
