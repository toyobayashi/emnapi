#include <napi.h>

namespace {

Napi::Value EmptyFunction(const Napi::CallbackInfo& info) {
  return Napi::Value();
}

Napi::Value ReturnParam(const Napi::CallbackInfo& info) {
  return info[0];
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
  return exports;
}

}  // namespace

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
