#include <napi.h>
#include "fib.h"

namespace {

Napi::Value EmptyFunction(const Napi::CallbackInfo& info) {
  return Napi::Value();
}

Napi::Value ReturnParam(const Napi::CallbackInfo& info) {
  return info[0];
}

Napi::Value ConvertInteger(const Napi::CallbackInfo& info) {
  int32_t input = info[0].As<Napi::Number>().Int32Value();
  return Napi::Number::New(info.Env(), input);
}

Napi::Value ConvertString(const Napi::CallbackInfo& info) {
  std::string input = info[0].As<Napi::String>().Utf8Value();
  return Napi::String::New(info.Env(), input);
}

Napi::Value ObjectGet(const Napi::CallbackInfo& info) {
  return info[0].As<Napi::Object>().Get("length").Unwrap();
}

Napi::Value ObjectSet(const Napi::CallbackInfo& info) {
  info[0].As<Napi::Object>().Set(info[1], info[2]).Check();
  return Napi::Value();
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

  maybeResult = exports.Set("convertInteger",
    Napi::Function::New(env, ConvertInteger));
  if (maybeResult.IsNothing()) {
    Napi::Error e = env.GetAndClearPendingException();
    e.ThrowAsJavaScriptException();
  }

  maybeResult = exports.Set("convertString",
    Napi::Function::New(env, ConvertString));
  if (maybeResult.IsNothing()) {
    Napi::Error e = env.GetAndClearPendingException();
    e.ThrowAsJavaScriptException();
  }

  maybeResult = exports.Set("objectGet",
    Napi::Function::New(env, ObjectGet));
  if (maybeResult.IsNothing()) {
    Napi::Error e = env.GetAndClearPendingException();
    e.ThrowAsJavaScriptException();
  }

  maybeResult = exports.Set("objectSet",
    Napi::Function::New(env, ObjectSet));
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
