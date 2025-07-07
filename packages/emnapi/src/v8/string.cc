#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_string_new_from_utf8(Isolate* isolate, const char* data, v8::NewStringType type, int length);
  V8_EXTERN int _v8_string_utf8_length(const String* self, Isolate* isolate);
  V8_EXTERN int _v8_string_length(const String* self);
  V8_EXTERN int _v8_string_write_utf8(const String* self, Isolate* isolate, char* buffer, int length, int* nchars_ref, int options);
}

void String::CheckCast(v8::Data*) {}

MaybeLocal<String> String::NewFromUtf8(v8::Isolate* isolate, char const* data, v8::NewStringType type, int length) {
  auto str = _v8_string_new_from_utf8(isolate, data, type, length);
  if (!str) return MaybeLocal<String>();
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
