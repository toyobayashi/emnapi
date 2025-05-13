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

#define NODE_MODULE_VERSION 1

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

}  // namespace node

#endif
