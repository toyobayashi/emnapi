#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_string_new_from_utf8(Isolate* isolate, const char* data, v8::NewStringType type, int length);
  V8_EXTERN internal::Address _v8_string_new_from_one_byte(Isolate* isolate, const uint8_t* data, v8::NewStringType type, int length);
  V8_EXTERN internal::Address _v8_string_new_from_two_byte(Isolate* isolate, const uint16_t* data, v8::NewStringType type, int length);
  V8_EXTERN internal::Address _v8_string_new_external_one_byte(Isolate* isolate, const char* data, int length);
  V8_EXTERN internal::Address _v8_string_new_external_two_byte(Isolate* isolate, const uint16_t* data, int length);
  V8_EXTERN int _v8_string_utf8_length(const String* self, Isolate* isolate);
  V8_EXTERN int _v8_string_length(const String* self);
  V8_EXTERN int _v8_string_write_utf8(const String* self, Isolate* isolate, char* buffer, int length, int* nchars_ref, int options);
  V8_EXTERN internal::Address _v8_regex_new(Context* context, internal::Address pattern, int flags);
  V8_EXTERN internal::Address _v8_string_object_new(Isolate* isolate, internal::Address value);
  V8_EXTERN internal::Address _v8_string_object_value_of(const StringObject* self);
}

void String::CheckCast(v8::Data*) {}

MaybeLocal<String> String::NewFromUtf8(v8::Isolate* isolate, char const* data, v8::NewStringType type, int length) {
  auto str = _v8_string_new_from_utf8(isolate, data, type, length);
  if (!str) return MaybeLocal<String>();
  return v8impl::V8LocalValueFromAddress(str).As<String>();
}

MaybeLocal<String> String::NewFromOneByte(Isolate* isolate, const uint8_t* data, NewStringType type, int length) {
  auto str = _v8_string_new_from_one_byte(isolate, reinterpret_cast<const uint8_t*>(data), type, length);
  if (!str) return MaybeLocal<String>();
  return v8impl::V8LocalValueFromAddress(str).As<String>();
}

MaybeLocal<String> String::NewFromTwoByte(Isolate* isolate, const uint16_t* data, NewStringType type, int length) {
  auto str = _v8_string_new_from_two_byte(isolate, data, type, length);
  if (!str) return MaybeLocal<String>();
  return v8impl::V8LocalValueFromAddress(str).As<String>();
}

MaybeLocal<String> String::NewExternalOneByte(Isolate* isolate, ExternalOneByteStringResource* resource) {
  auto str = _v8_string_new_external_one_byte(isolate, resource->data(), static_cast<int>(resource->length()));
  if (!str) return MaybeLocal<String>();
  return v8impl::V8LocalValueFromAddress(str).As<String>();
}

MaybeLocal<String> String::NewExternalTwoByte(Isolate* isolate, ExternalStringResource* resource) {
  auto str = _v8_string_new_external_two_byte(isolate, resource->data(), static_cast<int>(resource->length()));
  if (!str) return MaybeLocal<String>();
  return v8impl::V8LocalValueFromAddress(str).As<String>();
}

MaybeLocal<RegExp> RegExp::New(Local<Context> context,
                               Local<String> pattern,
                               Flags flags) {
  auto regex = _v8_regex_new(*context, v8impl::AddressFromV8LocalValue(pattern), flags);
  if (!regex) return MaybeLocal<RegExp>();
  return v8impl::V8LocalValueFromAddress(regex).As<RegExp>();
}

Local<Value> StringObject::New(Isolate* isolate, Local<String> value) {
  auto str = _v8_string_object_new(isolate, v8impl::AddressFromV8LocalValue(value));
  return v8impl::V8LocalValueFromAddress(str);
}

Local<String> StringObject::ValueOf() const {
  auto str = _v8_string_object_value_of(this);
  return v8impl::V8LocalValueFromAddress(str).As<String>();
}

int String::Utf8Length(v8::Isolate* isolate) const {
  return _v8_string_utf8_length(this, isolate);
}

int String::Length() const {
  return _v8_string_length(this);
}

int String::WriteUtf8(Isolate* isolate, char* buffer, int length,
                int* nchars_ref, int options) const {
  return _v8_string_write_utf8(
      this, isolate, buffer, length, nchars_ref, options);
}

String::Utf8Value::Utf8Value(Isolate* isolate, Local<v8::Value> obj) {
  if (obj.IsEmpty() || !obj->IsString()) {
    str_ = nullptr;
    length_ = 0;
    return;
  }

  Local<String> str = obj.As<String>();
  length_ = str->Utf8Length(isolate);
  str_ = new char[length_ + 1];
  str->WriteUtf8(isolate, str_, length_ + 1);
  str_[length_] = '\0';
}

String::Utf8Value::~Utf8Value() {
  if (str_ == nullptr) return;
  delete[] str_;
  str_ = nullptr;
  length_ = 0;
}

}
