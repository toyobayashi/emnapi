#include "node.h"
#include "node_buffer.h"
#include "v8_impl.h"
#include "uv.h"

#include <sys/types.h>

namespace node {

extern "C" struct uv_loop_s* uv_default_loop();

extern "C" {
  V8_EXTERN v8::internal::Address _node_encode(v8::Isolate*, const void* buf, size_t len, int encoding);
  V8_EXTERN ssize_t _node_decode(
      v8::Isolate*, v8::internal::Address output, size_t length,
      v8::internal::Address value, int encoding, int write);
  V8_EXTERN v8::internal::Address _node_errno_exception(
      v8::Isolate*, int errorno, v8::internal::Address syscall,
      v8::internal::Address message, v8::internal::Address path);
  V8_EXTERN v8::internal::Address _node_buffer_new(
      v8::Isolate*, v8::internal::Address data, size_t length,
      v8::internal::Address callback, v8::internal::Address hint);
  V8_EXTERN v8::internal::Address _node_buffer_new_alloc(
      v8::Isolate*, size_t length);
  V8_EXTERN v8::internal::Address _node_buffer_copy(
      v8::Isolate*, v8::internal::Address data, size_t length);
  V8_EXTERN v8::internal::Address _node_buffer_data(v8::internal::Address value);
  V8_EXTERN size_t _node_buffer_length(v8::internal::Address value);
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

namespace Buffer {

bool HasInstance(v8::Local<v8::Value> val) {
  return val->IsUint8Array();
}

bool HasInstance(v8::Local<v8::Object> val) {
  return HasInstance(val.As<v8::Value>());
}

char* Data(v8::Local<v8::Value> val) {
  return reinterpret_cast<char*>(_node_buffer_data(
      v8::v8impl::AddressFromV8LocalValue(val)));
}

char* Data(v8::Local<v8::Object> val) {
  return Data(val.As<v8::Value>());
}

size_t Length(v8::Local<v8::Value> val) {
  return _node_buffer_length(v8::v8impl::AddressFromV8LocalValue(val));
}

size_t Length(v8::Local<v8::Object> val) {
  return Length(val.As<v8::Value>());
}

v8::MaybeLocal<v8::Object> Copy(v8::Isolate* isolate, const char* data,
                                size_t len) {
  return v8::v8impl::V8LocalValueFromAddress(
      _node_buffer_copy(isolate, reinterpret_cast<v8::internal::Address>(data), len))
      .As<v8::Object>();
}

v8::MaybeLocal<v8::Object> New(v8::Isolate* isolate, size_t length) {
  return v8::v8impl::V8LocalValueFromAddress(
      _node_buffer_new_alloc(isolate, length)).As<v8::Object>();
}

v8::MaybeLocal<v8::Object> New(v8::Isolate* isolate, char* data,
                               size_t length, FreeCallback callback,
                               void* hint) {
  return v8::v8impl::V8LocalValueFromAddress(
      _node_buffer_new(isolate, reinterpret_cast<v8::internal::Address>(data),
                       length, reinterpret_cast<v8::internal::Address>(callback),
                       reinterpret_cast<v8::internal::Address>(hint)))
      .As<v8::Object>();
}

v8::MaybeLocal<v8::Object> New(v8::Isolate* isolate, char* data,
                               size_t length) {
  return New(isolate, data, length, nullptr, nullptr);
}

}  // namespace Buffer

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

v8::MaybeLocal<v8::Value> TryEncode(v8::Isolate* isolate,
                                    const char* buf,
                                    size_t len,
                                    enum encoding encoding) {
  return v8::v8impl::V8LocalValueFromAddress(
      _node_encode(isolate, buf, len, static_cast<int>(encoding)));
}

v8::MaybeLocal<v8::Value> TryEncode(v8::Isolate* isolate,
                                    const uint16_t* buf,
                                    size_t len) {
  return v8::v8impl::V8LocalValueFromAddress(
      _node_encode(isolate, buf, len, -1));
}

v8::Local<v8::Value> Encode(v8::Isolate* isolate,
                            const char* buf,
                            size_t len,
                            enum encoding encoding) {
  return TryEncode(isolate, buf, len, encoding).ToLocalChecked();
}

v8::Local<v8::Value> Encode(v8::Isolate* isolate,
                            const uint16_t* buf,
                            size_t len) {
  return TryEncode(isolate, buf, len).ToLocalChecked();
}

ssize_t DecodeBytes(v8::Isolate* isolate, v8::Local<v8::Value> value,
                    enum encoding encoding) {
  return _node_decode(isolate, 0, 0,
                      v8::v8impl::AddressFromV8LocalValue(value),
                      static_cast<int>(encoding), 0);
}

ssize_t DecodeWrite(v8::Isolate* isolate, char* output, size_t length,
                    v8::Local<v8::Value> value, enum encoding encoding) {
  return _node_decode(
      isolate, reinterpret_cast<v8::internal::Address>(output), length,
      v8::v8impl::AddressFromV8LocalValue(value), static_cast<int>(encoding), 1);
}

v8::Local<v8::Value> ErrnoException(v8::Isolate* isolate, int errorno,
                                    const char* syscall, const char* message,
                                    const char* path) {
  return v8::v8impl::V8LocalValueFromAddress(_node_errno_exception(
      isolate, errorno, reinterpret_cast<v8::internal::Address>(syscall),
      reinterpret_cast<v8::internal::Address>(message),
      reinterpret_cast<v8::internal::Address>(path)));
}

}
