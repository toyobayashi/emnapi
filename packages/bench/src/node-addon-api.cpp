#include <napi.h>
#ifdef __wasm__
#include <emnapi.h>
#endif
#include "foo.h"

namespace {

using namespace Napi;

int counter = 0;

Value EmptyFunction(const CallbackInfo& info) {
  return Value();
}

Value IncrementCounter(const CallbackInfo& info) {
  ++counter;
  return Value();
}

Value SumI32(const CallbackInfo& info) {
  int32_t v1 = info[0].As<Number>().Int32Value();
  int32_t v2 = info[1].As<Number>().Int32Value();
  int32_t v3 = info[2].As<Number>().Int32Value();
  int32_t v4 = info[3].As<Number>().Int32Value();
  int32_t v5 = info[4].As<Number>().Int32Value();
  int32_t v6 = info[5].As<Number>().Int32Value();
  int32_t v7 = info[6].As<Number>().Int32Value();
  int32_t v8 = info[7].As<Number>().Int32Value();
  int32_t v9 = info[8].As<Number>().Int32Value();
  int32_t result = v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9;
  return Number::New(info.Env(), result);
}

Value SumDouble(const CallbackInfo& info) {
  double v1 = info[0].As<Number>().DoubleValue();
  double v2 = info[1].As<Number>().DoubleValue();
  double v3 = info[2].As<Number>().DoubleValue();
  double v4 = info[3].As<Number>().DoubleValue();
  double v5 = info[4].As<Number>().DoubleValue();
  double v6 = info[5].As<Number>().DoubleValue();
  double v7 = info[6].As<Number>().DoubleValue();
  double v8 = info[7].As<Number>().DoubleValue();
  double v9 = info[8].As<Number>().DoubleValue();
  double result = v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9;
  return Number::New(info.Env(), result);
}

Value ReturnsInputI32(const CallbackInfo& info) {
  int32_t input = info[0].As<Number>().Int32Value();
  return Number::New(info.Env(), input);
}

Value ReturnsInputString(const CallbackInfo& info) {
  std::string input = info[0].As<String>().Utf8Value();
  return String::New(info.Env(), input);
}

Value ReturnsInputObject(const CallbackInfo& info) {
  return info[0];
}

Value CallJavaScriptFunction(const CallbackInfo& info) {
  info[0].As<Function>()({});
  return Value();
}

Value CreateTypedMemoryView(const CallbackInfo& info) {
  static uint8_t buf[16384] = { 0 };
  Env env = info.Env();
  napi_value ret;
#ifdef __wasm__
  emnapi_create_memory_view(
    env,
    emnapi_uint8_array,
    buf,
    16384,
    nullptr,
    nullptr,
    &ret
  );
#else
  napi_create_external_arraybuffer(env, buf, 16384, nullptr, nullptr, &ret);
  napi_create_typedarray(env, napi_uint8_array, 16384, ret, 0, &ret);
#endif
  return Value(env, ret);
}

Value ObjectGet(const CallbackInfo& info) {
  return info[0].As<Object>().Get("length");
}

Value ObjectSet(const CallbackInfo& info) {
  info[0].As<Object>().Set(info[1], info[2]);
  return Value();
}

class JsFoo : public ObjectWrap<JsFoo> {
 public:
  static void Init(Napi::Env env, Object exports) {
    Napi::Function ctor = DefineClass(env, "Foo", {
      InstanceMethod<&JsFoo::IncrClassCounter>("incrClassCounter", napi_default_method),
      InstanceMethod<&JsFoo::Delete>("delete", napi_default_method),
    });
    exports.Set("Foo", ctor);
  }

  JsFoo(const CallbackInfo& info): ObjectWrap<JsFoo>(info), foo_(new Foo()) {}

  Napi::Value IncrClassCounter(const CallbackInfo& info) {
    foo_->IncrClassCounter();
    return {};
  }

  Napi::Value Delete(const CallbackInfo& info) {
    if (foo_ != nullptr) {
      delete foo_;
      foo_ = nullptr;
    }
    return Napi::Value();
  }

 private:
  Foo* foo_;
};

#define EXPORT_FUNCTION(env, exports, name, f) \
  exports.Set((name), Function::New(env, (f)))

Object Init(Env env, Object exports) {
  EXPORT_FUNCTION(env, exports, "emptyFunction", EmptyFunction);
  EXPORT_FUNCTION(env, exports, "incrementCounter", IncrementCounter);
  EXPORT_FUNCTION(env, exports, "sumI32", SumI32);
  EXPORT_FUNCTION(env, exports, "sumDouble", SumDouble);
  EXPORT_FUNCTION(env, exports, "returnsInputI32", ReturnsInputI32);
  EXPORT_FUNCTION(env, exports, "returnsInputString", ReturnsInputString);
  EXPORT_FUNCTION(env, exports, "returnsInputObject", ReturnsInputObject);
  EXPORT_FUNCTION(env, exports, "callJavaScriptFunction", CallJavaScriptFunction);
  EXPORT_FUNCTION(env, exports, "createTypedMemoryView", CreateTypedMemoryView);
  EXPORT_FUNCTION(env, exports, "objectGet", ObjectGet);
  EXPORT_FUNCTION(env, exports, "objectSet", ObjectSet);
  JsFoo::Init(env, exports);
  return exports;
}

}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
