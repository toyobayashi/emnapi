#ifndef SRC_NODE_H_
#define SRC_NODE_H_

#if !defined(NODE_EXTERN)
#define NODE_EXTERN __attribute__((__import_module__("env")))
#endif

#include "v8.h"

namespace node {

inline void NODE_SET_METHOD(v8::Local<v8::Object> recv,
                            const char* name,
                            v8::FunctionCallback callback) {
  v8::Isolate* isolate = v8::Isolate::GetCurrent();
  v8::HandleScope handle_scope(isolate);
  v8::Local<v8::Context> context = isolate->GetCurrentContext();
  v8::Local<v8::FunctionTemplate> t = v8::FunctionTemplate::New(isolate,
                                                                callback);
  v8::Local<v8::Function> fn = t->GetFunction(context).ToLocalChecked();
  v8::Local<v8::String> fn_name = v8::String::NewFromUtf8(isolate, name,
      v8::NewStringType::kInternalized).ToLocalChecked();
  fn->SetName(fn_name);
  recv->Set(context, fn_name, fn).Check();
}
#define NODE_SET_METHOD node::NODE_SET_METHOD

#ifdef _WIN32
# define NODE_MODULE_EXPORT __declspec(dllexport)
#else
#ifdef __EMSCRIPTEN__
#define NODE_MODULE_EXPORT                                                     \
  __attribute__((visibility("default"))) __attribute__((used))
#else
# define NODE_MODULE_EXPORT __attribute__((visibility("default")))
#endif
#endif

#define NODE_DEPRECATED(message, declarator) declarator

typedef void (*addon_register_func)(
    v8::Local<v8::Object> exports,
    v8::Local<v8::Value> module,
    void* priv);

// BINARY is a deprecated alias of LATIN1.
// BASE64URL is not currently exposed to the JavaScript side.
enum encoding {
  ASCII,
  UTF8,
  BASE64,
  UCS2,
  BINARY,
  HEX,
  BUFFER,
  BASE64URL,
  LATIN1 = BINARY
};

NODE_EXTERN v8::Local<v8::Value> ErrnoException(v8::Isolate* isolate,
                                                int errorno,
                                                const char* syscall = nullptr,
                                                const char* message = nullptr,
                                                const char* path = nullptr);
NODE_EXTERN v8::Local<v8::Value> UVException(v8::Isolate* isolate,
                                             int errorno,
                                             const char* syscall = nullptr,
                                             const char* message = nullptr,
                                             const char* path = nullptr,
                                             const char* dest = nullptr);

NODE_DEPRECATED("Use ErrnoException(isolate, ...)",
                inline v8::Local<v8::Value> ErrnoException(
      int errorno,
      const char* syscall = nullptr,
      const char* message = nullptr,
      const char* path = nullptr) {
  return ErrnoException(v8::Isolate::GetCurrent(),
                        errorno,
                        syscall,
                        message,
                        path);
})

NODE_DEPRECATED("Use UVException(isolate, ...)",
                inline v8::Local<v8::Value> UVException(int errorno,
                                        const char* syscall = nullptr,
                                        const char* message = nullptr,
                                        const char* path = nullptr) {
  return UVException(v8::Isolate::GetCurrent(),
                     errorno,
                     syscall,
                     message,
                     path);
})

NODE_EXTERN struct uv_loop_s* GetCurrentEventLoop(v8::Isolate* isolate);

typedef double async_id;
struct async_context {
  ::node::async_id async_id;
  ::node::async_id trigger_async_id;
};

NODE_EXTERN async_context EmitAsyncInit(v8::Isolate* isolate,
                                        v8::Local<v8::Object> resource,
                                        const char* name,
                                        async_id trigger_async_id = -1);

NODE_EXTERN async_context EmitAsyncInit(v8::Isolate* isolate,
                                        v8::Local<v8::Object> resource,
                                        v8::Local<v8::String> name,
                                        async_id trigger_async_id = -1);

NODE_EXTERN void EmitAsyncDestroy(v8::Isolate* isolate,
                                  async_context asyncContext);

NODE_EXTERN void FatalException(v8::Isolate* isolate,
                                const v8::TryCatch& try_catch);

NODE_EXTERN v8::Local<v8::Value> Encode(v8::Isolate* isolate,
                                        const char* buf,
                                        size_t len,
                                        enum encoding encoding = LATIN1);

// Warning: This reverses endianness on Big Endian platforms, even though the
// signature using uint16_t implies that it should not.
NODE_EXTERN v8::Local<v8::Value> Encode(v8::Isolate* isolate,
                                        const uint16_t* buf,
                                        size_t len);

// Returns -1 if the handle was not valid for decoding
NODE_EXTERN ssize_t DecodeBytes(v8::Isolate* isolate,
                                v8::Local<v8::Value>,
                                enum encoding encoding = LATIN1);
// returns bytes written.
NODE_EXTERN ssize_t DecodeWrite(v8::Isolate* isolate,
                                char* buf,
                                size_t buflen,
                                v8::Local<v8::Value>,
                                enum encoding encoding = LATIN1);

#define NODE_MODULE(modname, regfunc)                                 \
  NODE_MODULE_INIT() { ((node::addon_register_func)regfunc)(exports, module, NULL); }

#define NODE_MODULE_VERSION 127

#define NODE_MODULE_INITIALIZER_BASE node_register_module_v

#define NODE_MODULE_INITIALIZER_X(base, version)                      \
    NODE_MODULE_INITIALIZER_X_HELPER(base, version)

#define NODE_MODULE_INITIALIZER_X_HELPER(base, version) base##version

#define NODE_MODULE_INITIALIZER                                       \
  NODE_MODULE_INITIALIZER_X(NODE_MODULE_INITIALIZER_BASE,             \
      NODE_MODULE_VERSION)

#define NODE_MODULE_INIT()                                            \
  extern "C" NODE_MODULE_EXPORT void                                  \
  NODE_MODULE_INITIALIZER(v8::Local<v8::Object> exports,              \
                          v8::Local<v8::Value> module,                \
                          v8::Local<v8::Context> context);            \
  void NODE_MODULE_INITIALIZER(v8::Local<v8::Object> exports,         \
                               v8::Local<v8::Value> module,           \
                               v8::Local<v8::Context> context)

NODE_EXTERN
v8::MaybeLocal<v8::Value> MakeCallback(v8::Isolate* isolate,
                                       v8::Local<v8::Object> recv,
                                       v8::Local<v8::Function> callback,
                                       int argc,
                                       v8::Local<v8::Value>* argv,
                                       async_context asyncContext);
NODE_EXTERN
v8::MaybeLocal<v8::Value> MakeCallback(v8::Isolate* isolate,
                                       v8::Local<v8::Object> recv,
                                       const char* method,
                                       int argc,
                                       v8::Local<v8::Value>* argv,
                                       async_context asyncContext);
NODE_EXTERN
v8::MaybeLocal<v8::Value> MakeCallback(v8::Isolate* isolate,
                                       v8::Local<v8::Object> recv,
                                       v8::Local<v8::String> symbol,
                                       int argc,
                                       v8::Local<v8::Value>* argv,
                                       async_context asyncContext);
}  // namespace node

#endif
