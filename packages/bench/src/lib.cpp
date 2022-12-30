#include <napi.h>
#include "fib.h"

namespace {

Napi::Value EmptyFunction(const Napi::CallbackInfo& info) {
  return Napi::Value();
}

Napi::Value ReturnParam(const Napi::CallbackInfo& info) {
  return info[0];
}

Napi::Value JsFib(const Napi::CallbackInfo& info) {
  int32_t input = info[0].As<Napi::Number>().Int32Value();
  return Napi::Number::New(info.Env(), fib(input));
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  Napi::Maybe<bool> maybeResult = exports.Set("emptyFunction",
    Napi::Function::New(env, EmptyFunction));
  if (maybeResult.IsNothing()) {
    Napi::Error e = env.GetAndClearPendingException();
    e.ThrowAsJavaScriptException();
  }

  maybeResult = exports.Set("returnParam",
    Napi::Function::New(env, ReturnParam));
  if (maybeResult.IsNothing()) {
    Napi::Error e = env.GetAndClearPendingException();
    e.ThrowAsJavaScriptException();
  }

  maybeResult = exports.Set("fib",
    Napi::Function::New(env, JsFib));
  if (maybeResult.IsNothing()) {
    Napi::Error e = env.GetAndClearPendingException();
    e.ThrowAsJavaScriptException();
  }
  return exports;
}

}  // namespace

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
