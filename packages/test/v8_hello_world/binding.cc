#include "v8.h"
#include "node.h"

static void Method(const v8::FunctionCallbackInfo<v8::Value>& args) {
  v8::Isolate* isolate = args.GetIsolate();
  args.GetReturnValue().Set(
      v8::String::NewFromUtf8(isolate, "world").ToLocalChecked());
}

NODE_MODULE_INIT() {
  NODE_SET_METHOD(exports, "hello", Method);
}
