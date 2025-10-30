#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN void _v8_function_set_name(Function* func, internal::Address name);
  V8_EXTERN internal::Address _v8_function_new_instance(
    const Function* func, Context* context, int argc, internal::Address* argv);
  V8_EXTERN internal::Address _v8_function_call(
    Function* func, Context* context, internal::Address recv, int argc,
    internal::Address* argv);
}

void Function::CheckCast(v8::Value*) {}

void Function::SetName(v8::Local<v8::String> name) {
  _v8_function_set_name(this, v8impl::AddressFromV8LocalValue(name));
}

MaybeLocal<Object> Function::NewInstance(
  Local<Context> context, int argc, Local<Value> argv[]) const {
  return v8impl::V8LocalValueFromAddress(
    _v8_function_new_instance(this, *context, argc, reinterpret_cast<internal::Address*>(argv))).As<Object>();
}

MaybeLocal<Value> Function::Call(Local<Context> context,
                                 Local<Value> recv, int argc,
                                 Local<Value> argv[]) {
  internal::Address result = _v8_function_call(
      this, *context, v8impl::AddressFromV8LocalValue(recv), argc,
      reinterpret_cast<internal::Address*>(argv));
  return v8impl::V8LocalValueFromAddress(result);
}

}
