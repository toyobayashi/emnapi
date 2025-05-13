#include "v8.h"

#if !defined(V8_EXTERN)
#define V8_EXTERN __attribute__((__import_module__("env")))
#endif

namespace v8 {

extern "C" {
  V8_EXTERN Isolate* _v8_isolate_get_current();
  V8_EXTERN Context* _v8_isolate_get_current_context(const Isolate* isolate);
  V8_EXTERN Isolate* _v8_context_get_isolate(const Context* context);
  V8_EXTERN Object* _v8_context_get_global(const Context* context);
  V8_EXTERN bool _v8_data_is_value(const Data* data);
  V8_EXTERN Object* _v8_create_object(Isolate* isolate);
  V8_EXTERN internal::Address _v8_open_handle_scope(Isolate* isolate);
  V8_EXTERN void _v8_close_handle_scope(internal::Address scope);
  V8_EXTERN Isolate* _v8_handle_scope_get_isolate(internal::Address scope);
  V8_EXTERN int _v8_number_of_handles(const Isolate* isolate);
  // V8_EXTERN int _v8_cbinfo_length(internal::Address info);
  // V8_EXTERN Value* _v8_cbinfo_this(internal::Address info);
  // V8_EXTERN void* _v8_cbinfo_data(internal::Address info);
  V8_EXTERN int _v8_get_cb_info(internal::Address info, size_t* argc, internal::Address* argv, internal::Address* this_arg, void** data);
  V8_EXTERN Value* _v8_cbinfo_rv(internal::Address info);
  V8_EXTERN Value* _v8_cbinfo_new_target(internal::Address info);
  // _v8_function_template_new
  V8_EXTERN FunctionTemplate* _v8_function_template_new(
      Isolate* isolate, void (*callback)(internal::Address info, FunctionCallback cb),
      FunctionCallback cb,
      internal::Address data, internal::Address signature,
      int length, ConstructorBehavior behavior,
      SideEffectType side_effect_type,
      const CFunction* c_function, uint16_t instance_type,
      uint16_t allowed_receiver_instance_type_range_start,
      uint16_t allowed_receiver_instance_type_range_end);
}

namespace api_internal {

void ToLocalEmpty() {
  abort();
}

void FromJustIsNothing() {
  abort();
}

}  // namespace api_internal

Isolate* Isolate::GetCurrent() {
  return _v8_isolate_get_current();
}

Local<Context> Isolate::GetCurrentContext() {
  Local<Context> context;
  Context* ctx = _v8_isolate_get_current_context(this);
  memcpy(&context, &ctx, sizeof(ctx));
  return context;
}

HandleScope::HandleScope(Isolate* isolate)
  : i_isolate_(reinterpret_cast<internal::Isolate*>(isolate)),
    prev_next_(new internal::Address(_v8_open_handle_scope(isolate))),
    prev_limit_(nullptr) {}

HandleScope::~HandleScope() {
  _v8_close_handle_scope(*prev_next_);
  delete prev_next_;
}

struct FunctionCallbackInfoImpl {
  internal::Address* implicit_args_;
  internal::Address* values_;
  int length_;

  FunctionCallbackInfoImpl(internal::Address info) {
    size_t argc = 0;
    _v8_get_cb_info(info, &argc, nullptr, nullptr, nullptr);
    internal::Address* list = new internal::Address[7 + argc];
    implicit_args_ = list;
    values_ = list + 7;
    length_ = argc;
    _v8_get_cb_info(info, &argc, values_, list, reinterpret_cast<void**>(list + 4));
    // *(list) = reinterpret_cast<internal::Address>(_v8_cbinfo_this(info));
    *(list + 1) = -1;
    *(list + 2) = 0;
    *(list + 3) = reinterpret_cast<internal::Address>(_v8_cbinfo_rv(info));
    // *(list + 4) = reinterpret_cast<internal::Address>(_v8_cbinfo_data(info));
    *(list + 5) = reinterpret_cast<internal::Address>(_v8_cbinfo_new_target(info));
    // *(list + 6) = argc;
    *(list + 6) = *list;
  }

  FunctionCallbackInfoImpl(const FunctionCallbackInfoImpl&) = delete;
  FunctionCallbackInfoImpl& operator=(const FunctionCallbackInfoImpl&) = delete;
  FunctionCallbackInfoImpl(FunctionCallbackInfoImpl&&) = delete;
  FunctionCallbackInfoImpl& operator=(FunctionCallbackInfoImpl&&) = delete;

  ~FunctionCallbackInfoImpl() {
    delete[] implicit_args_;
  }
};

Local<FunctionTemplate> FunctionTemplate::New(
    Isolate* isolate, FunctionCallback callback,
    Local<Value> data,
    Local<Signature> signature, int length,
    ConstructorBehavior behavior,
    SideEffectType side_effect_type,
    const CFunction* c_function, uint16_t instance_type,
    uint16_t allowed_receiver_instance_type_range_start,
    uint16_t allowed_receiver_instance_type_range_end) {
  Local<FunctionTemplate> temp;
  FunctionTemplate* tpl = _v8_function_template_new(isolate,
    [](internal::Address info, FunctionCallback callback) {
      FunctionCallbackInfoImpl cbinfo{info};
      auto* args = reinterpret_cast<FunctionCallbackInfo<Value>*>(&info);
      callback(*args);
    }, callback, reinterpret_cast<internal::Address>(*data),
    reinterpret_cast<internal::Address>(*signature), length,
    behavior, side_effect_type, c_function, instance_type,
    allowed_receiver_instance_type_range_start,
    allowed_receiver_instance_type_range_end);
  memcpy(&temp, &tpl, sizeof(tpl));
  return temp;
}

MaybeLocal<Function> FunctionTemplate::GetFunction(v8::Local<v8::Context>) {
  return MaybeLocal<Function>();
}

MaybeLocal<String> String::NewFromUtf8(v8::Isolate*, char const*, v8::NewStringType, int) {
  return MaybeLocal<String>();
}

void Function::SetName(v8::Local<v8::String>) {

}

Maybe<bool> Object::Set(v8::Local<v8::Context>, v8::Local<v8::Value>, v8::Local<v8::Value>) {
  return Nothing<bool>();
}

}  // namespace v8
