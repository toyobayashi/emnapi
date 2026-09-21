#include "node.h"
#include "v8_impl.h"
#include "uv.h"

namespace node {

extern "C" struct uv_loop_s* uv_default_loop();

extern "C" {
  V8_EXTERN v8::internal::Address _node_encode(v8::Isolate*, const void* buf, size_t len, int encoding);
  V8_EXTERN void _emnapi_node_emit_async_init(
      v8::internal::Address resource, v8::internal::Address name,
      double trigger_async_id, async_context* result);
  V8_EXTERN void _emnapi_node_emit_async_destroy(
      double async_id, double trigger_async_id);
  V8_EXTERN napi_status _emnapi_node_make_callback(
      napi_env env, v8::internal::Address resource, v8::internal::Address cb,
      v8::internal::Address* argv, size_t size, double async_id,
      double trigger_async_id, v8::internal::Address* result);
}

struct uv_loop_s* GetCurrentEventLoop(v8::Isolate*) {
  return uv_default_loop();
}

async_context EmitAsyncInit(v8::Isolate*, v8::Local<v8::Object> resource,
                            const char* name, async_id trigger_async_id) {
  v8::Local<v8::String> name_value =
      v8::String::NewFromUtf8(v8::Isolate::GetCurrent(), name).ToLocalChecked();
  return EmitAsyncInit(v8::Isolate::GetCurrent(), resource, name_value, trigger_async_id);
}

async_context EmitAsyncInit(v8::Isolate*, v8::Local<v8::Object> resource,
                            v8::Local<v8::String> name, async_id trigger_async_id) {
  async_context result{0, trigger_async_id};
  _emnapi_node_emit_async_init(
      v8::v8impl::AddressFromV8LocalValue(resource),
      v8::v8impl::AddressFromV8LocalValue(name), trigger_async_id, &result);
  return result;
}

void EmitAsyncDestroy(v8::Isolate*, async_context asyncContext) {
  _emnapi_node_emit_async_destroy(asyncContext.async_id, asyncContext.trigger_async_id);
}

v8::MaybeLocal<v8::Value> MakeCallback(
    v8::Isolate*, v8::Local<v8::Object> recv, v8::Local<v8::Function> callback,
    int argc, v8::Local<v8::Value>* argv, async_context asyncContext) {
  v8::internal::Address result = 0;
  napi_status status = _emnapi_node_make_callback(
      nullptr, v8::v8impl::AddressFromV8LocalValue(recv),
      v8::v8impl::AddressFromV8LocalValue(callback),
      reinterpret_cast<v8::internal::Address*>(argv), static_cast<size_t>(argc),
      asyncContext.async_id, asyncContext.trigger_async_id, &result);
  if (status != napi_ok) return v8::MaybeLocal<v8::Value>();
  return v8::v8impl::V8LocalValueFromAddress(result);
}

v8::MaybeLocal<v8::Value> MakeCallback(
    v8::Isolate* isolate, v8::Local<v8::Object> recv,
    v8::Local<v8::String> symbol, int argc, v8::Local<v8::Value>* argv,
    async_context asyncContext) {
  v8::Local<v8::Value> value = recv->Get(isolate->GetCurrentContext(), symbol).ToLocalChecked();
  if (!value->IsFunction()) return v8::MaybeLocal<v8::Value>();
  return MakeCallback(isolate, recv, value.As<v8::Function>(), argc, argv, asyncContext);
}

v8::MaybeLocal<v8::Value> MakeCallback(
    v8::Isolate* isolate, v8::Local<v8::Object> recv, const char* method,
    int argc, v8::Local<v8::Value>* argv, async_context asyncContext) {
  v8::Local<v8::String> symbol =
      v8::String::NewFromUtf8(isolate, method).ToLocalChecked();
  return MakeCallback(isolate, recv, symbol, argc, argv, asyncContext);
}

v8::Local<v8::Value> Encode(v8::Isolate* isolate,
                            const char* buf,
                            size_t len,
                            enum encoding encoding) {
  return v8::v8impl::V8LocalValueFromAddress(
      _node_encode(isolate, buf, len, static_cast<int>(encoding)));
}

v8::Local<v8::Value> Encode(v8::Isolate* isolate,
                            const uint16_t* buf,
                            size_t len) {
  return v8::v8impl::V8LocalValueFromAddress(_node_encode(isolate, buf, len, -1));
}

}
