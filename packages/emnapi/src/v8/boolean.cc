#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN bool _v8_boolean_value(const Boolean*);
  V8_EXTERN int _v8_boolean_object_value_of(const BooleanObject*);
  V8_EXTERN internal::Address _v8_boolean_object_new(Isolate* isolate, int value);
}

void Boolean::CheckCast(v8::Data*) {}

bool Boolean::Value() const {
  return _v8_boolean_value(this);
}

Local<Value> BooleanObject::New(Isolate* isolate, bool value) {
  auto n = _v8_boolean_object_new(isolate, static_cast<int>(value));
  return v8impl::V8LocalValueFromAddress(n);
}

bool BooleanObject::ValueOf() const {
  return static_cast<bool>(_v8_boolean_object_value_of(this));
}

}
