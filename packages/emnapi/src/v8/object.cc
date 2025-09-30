#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN int _v8_object_set(Object* obj, Context* context, internal::Address key, internal::Address value, int* success);
  V8_EXTERN void _v8_object_set_internal_field(Object* obj, int index, internal::Address data);
  V8_EXTERN void _v8_object_set_aligned_pointer_in_internal_field(Object* obj, int index, void* data);
  V8_EXTERN void* _v8_object_get_aligned_pointer_in_internal_field(Object* obj, int index);
  V8_EXTERN internal::Address _v8_object_get_internal_field(Object* obj, int index);
  V8_EXTERN internal::Address _v8_object_get_key(Object* obj, Context* context, internal::Address index);
  V8_EXTERN internal::Address _v8_object_get_index(Object* obj, Context* context, uint32_t index);
  V8_EXTERN int _v8_object_internal_field_count(const Object* obj);
  V8_EXTERN int _v8_object_set_private(Object* obj, Context* context, internal::Address key, internal::Address value, int* success);
  V8_EXTERN int _v8_object_has_private(Object* obj, Context* context, internal::Address key, int* has);
  V8_EXTERN internal::Address _v8_object_get_private(Object* obj, Context* context, internal::Address key);
  V8_EXTERN int _v8_object_delete_private(Object* obj, Context* context, internal::Address key, int* success);
  V8_EXTERN internal::Address _v8_object_new(Isolate* isolate);
  V8_EXTERN internal::Address _v8_private_for_api(Isolate* isolate, internal::Address name);
}

void Object::CheckCast(v8::Value*) {}

MaybeLocal<Value> Object::Get(v8::Local<v8::Context> context, uint32_t index) {
  internal::Address value_address = _v8_object_get_index(this, *context, index);
  if (!value_address) return MaybeLocal<Value>();
  return v8impl::V8LocalValueFromAddress(value_address).As<Value>();
}

MaybeLocal<Value> Object::Get(v8::Local<v8::Context> context, v8::Local<v8::Value> key) {
  internal::Address value_address = _v8_object_get_key(this, *context, v8impl::AddressFromV8LocalValue(key));
  if (!value_address) return MaybeLocal<Value>();
  return v8impl::V8LocalValueFromAddress(value_address).As<Value>();
}

Maybe<bool> Object::Set(v8::Local<v8::Context> context, v8::Local<v8::Value> key, v8::Local<v8::Value> value) {
  int success = 0;
  int r = _v8_object_set(this, *context,
    v8impl::AddressFromV8LocalValue(key), v8impl::AddressFromV8LocalValue(value), &success);
  if (r != 0) return Nothing<bool>();
  return Just<bool>(success);
}

Maybe<bool> Object::SetPrivate(Local<Context> context, Local<Private> key, Local<Value> value) {
  int success = 0;
  int r = _v8_object_set_private(this, *context, reinterpret_cast<internal::Address>(*key), reinterpret_cast<internal::Address>(*value), &success);
  if (r != 0) return Nothing<bool>();
  return Just<bool>(success);
}

Maybe<bool> Object::HasPrivate(Local<Context> context, Local<Private> key) {
  int has = 0;
  int r = _v8_object_has_private(this, *context, reinterpret_cast<internal::Address>(*key), &has);
  if (r != 0) return Nothing<bool>();
  return Just<bool>(has != 0);
}

MaybeLocal<Value> Object::GetPrivate(Local<Context> context, Local<Private> key) {
  internal::Address value_address = _v8_object_get_private(this, *context, reinterpret_cast<internal::Address>(*key));
  if (!value_address) return MaybeLocal<Value>();
  return v8impl::V8LocalValueFromAddress(value_address).As<Value>();
}

Maybe<bool> Object::DeletePrivate(Local<Context> context, Local<Private> key) {
  int success = 0;
  int r = _v8_object_delete_private(this, *context, reinterpret_cast<internal::Address>(*key), &success);
  if (r != 0) return Nothing<bool>();
  return Just<bool>(success);
}

Local<Object> Object::New(Isolate* isolate) {
  internal::Address v = _v8_object_new(isolate);
  return v8impl::V8LocalValueFromAddress(v).As<Object>();
}

Local<Private> Private::ForApi(Isolate* isolate, Local<String> name) {
  internal::Address addr = _v8_private_for_api(isolate, v8impl::AddressFromV8LocalValue(name));
  if (!addr) return Local<Private>();
  return v8impl::V8LocalValueFromAddress(addr).As<Private>();
}

void Object::SetInternalField(int index, v8::Local<v8::Data> data) {
  _v8_object_set_internal_field(this, index, reinterpret_cast<internal::Address>(*data));
}

void Object::SetAlignedPointerInInternalField(int index, void* data) {
  _v8_object_set_aligned_pointer_in_internal_field(this, index, data);
}

void* Object::SlowGetAlignedPointerFromInternalField(int index) {
  return _v8_object_get_aligned_pointer_in_internal_field(this, index);
}

int Object::InternalFieldCount() const {
  return _v8_object_internal_field_count(this);
}

Local<Data> Object::SlowGetInternalField(int index) {
  internal::Address data_value = _v8_object_get_internal_field(this, index);
  Local<Data> data;
  if (!data_value) return data;
  memcpy(static_cast<void*>(&data), &data_value, sizeof(data_value));
  return data;
}

}
