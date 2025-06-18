#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN void _v8_function_set_name(Function* func, internal::Address name);
}

void Function::CheckCast(v8::Value*) {}

void Function::SetName(v8::Local<v8::String> name) {
  _v8_function_set_name(this, v8impl::AddressFromV8LocalValue(name));
}

}
