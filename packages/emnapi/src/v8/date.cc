#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_date_new(Context* context, double value);
}

MaybeLocal<Value> Date::New(Local<Context> context, double time) {
  auto n = _v8_date_new(*context, time);
  if (!n) return MaybeLocal<Value>();
  return v8impl::V8LocalValueFromAddress(n);
}

}
