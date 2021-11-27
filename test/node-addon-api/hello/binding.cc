#include <napi.h>
#include <iostream>

Napi::String Method(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "world");
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  Napi::Maybe<bool> maybeResult = exports.Set(Napi::String::New(env, "hello"),
    Napi::Function::New(env, Method));
  if (maybeResult.IsNothing()) {
    Napi::Error e = env.GetAndClearPendingException();
    std::cerr << "Caught JavaScript exception: " + e.Message();
  }
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
