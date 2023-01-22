#include <vector>
#include <node.h>

namespace emnapi_node_binding {

namespace {

void EmitAsyncInit(const v8::FunctionCallbackInfo<v8::Value>& args) {
  v8::Isolate* isolate = args.GetIsolate();
  v8::Local<v8::Context> context = isolate->GetCurrentContext();
  v8::Local<v8::Object> resource = args[0].As<v8::Object>();
  v8::Local<v8::String> name = args[1].As<v8::String>();
  double trigger_async_id = args[2].As<v8::Number>()->Value();

  node::async_context result_context = node::EmitAsyncInit(isolate, resource, name, trigger_async_id);

  v8::Local<v8::Object> result = v8::Object::New(isolate);
  v8::Local<v8::String> async_id_key = v8::String::NewFromUtf8(isolate, "asyncId").ToLocalChecked();
  v8::Local<v8::String> trigger_async_id_key = v8::String::NewFromUtf8(isolate, "triggerAsyncId").ToLocalChecked();
  v8::Local<v8::Number> result_async_id = v8::Number::New(isolate, result_context.async_id);
  v8::Local<v8::Number> result_trigger_async_id = v8::Number::New(isolate, result_context.trigger_async_id);
  result->Set(context, async_id_key, result_async_id).ToChecked();
  result->Set(context, trigger_async_id_key, result_trigger_async_id).ToChecked();

  args.GetReturnValue().Set(result);
}

inline node::async_context FromAsyncContextObject(v8::Isolate* isolate,
                                                  v8::Local<v8::Object> async_context_object) {
  v8::Local<v8::Context> context = isolate->GetCurrentContext();
  double async_id = async_context_object
    ->Get(context, v8::String::NewFromUtf8(isolate, "asyncId").ToLocalChecked()).ToLocalChecked()
    .As<v8::Number>()->Value();
  double trigger_async_id = async_context_object
    ->Get(context, v8::String::NewFromUtf8(isolate, "triggerAsyncId").ToLocalChecked()).ToLocalChecked()
    .As<v8::Number>()->Value();
  
  return { async_id, trigger_async_id };
}

void EmitAsyncDestroy(const v8::FunctionCallbackInfo<v8::Value>& args) {
  v8::Isolate* isolate = args.GetIsolate();
  v8::Local<v8::Object> async_context_object = args[0].As<v8::Object>();
  node::EmitAsyncDestroy(isolate, FromAsyncContextObject(isolate, async_context_object));
  args.GetReturnValue().Set(v8::Undefined(isolate));
}

/* void OpenCallbackScope(const v8::FunctionCallbackInfo<v8::Value>& args) {
  v8::Isolate* isolate = args.GetIsolate();
  v8::Local<v8::Object> resource = args[0].As<v8::Object>();
  v8::Local<v8::Object> async_context_object = args[1].As<v8::Object>();

  node::CallbackScope* callback_scope = new node::CallbackScope(
      isolate, resource, FromAsyncContextObject(isolate, async_context_object));

  args.GetReturnValue().Set(v8::BigInt::New(isolate, reinterpret_cast<int64_t>(callback_scope)));
}

void CloseCallbackScope(const v8::FunctionCallbackInfo<v8::Value>& args) {
  v8::Isolate* isolate = args.GetIsolate();
  v8::Local<v8::BigInt> scope = args[0].As<v8::BigInt>();

  node::CallbackScope* callback_scope = reinterpret_cast<node::CallbackScope*>(scope->Int64Value());
  delete callback_scope;

  args.GetReturnValue().Set(v8::Undefined(isolate));
} */

void MakeCallback(const v8::FunctionCallbackInfo<v8::Value>& args) {
  v8::Isolate* isolate = args.GetIsolate();
  v8::Local<v8::Context> context = isolate->GetCurrentContext();
  v8::Local<v8::Object> resource = args[0].As<v8::Object>();
  v8::Local<v8::Function> cb = args[1].As<v8::Function>();
  v8::Local<v8::Array> argv = args[2].As<v8::Array>();
  v8::Local<v8::Object> async_context_object = args[3].As<v8::Object>();

  uint32_t argc = argv->Length();
  std::vector<v8::Local<v8::Value>> vec_argv(argc);
  for (uint32_t i = 0; i < argc; ++i) {
    vec_argv[i] = argv->Get(context, i).ToLocalChecked();
  }

  v8::MaybeLocal<v8::Value> ret = node::MakeCallback(isolate, resource, cb, argc, vec_argv.data(), FromAsyncContextObject(isolate, async_context_object));

  args.GetReturnValue().Set(ret.FromMaybe(v8::Local<v8::Value>()));
}

}

NODE_MODULE_INIT() {
  NODE_SET_METHOD(exports, "emitAsyncInit", EmitAsyncInit);
  NODE_SET_METHOD(exports, "emitAsyncDestroy", EmitAsyncDestroy);
  // NODE_SET_METHOD(exports, "openCallbackScope", OpenCallbackScope);
  // NODE_SET_METHOD(exports, "closeCallbackScope", CloseCallbackScope);
  NODE_SET_METHOD(exports, "makeCallback", MakeCallback);
}

}
