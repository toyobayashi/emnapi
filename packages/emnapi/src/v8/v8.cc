#include "v8.h"

#if !defined(V8_EXTERN)
#define V8_EXTERN __attribute__((__import_module__("env")))
#endif

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_isolate_get_current_context(const Isolate* isolate);
  V8_EXTERN Isolate* _v8_context_get_isolate(const Context* context);
  V8_EXTERN Object* _v8_context_get_global(const Context* context);
  V8_EXTERN bool _v8_data_is_value(const Data* data);
  V8_EXTERN Object* _v8_create_object(Isolate* isolate);
  V8_EXTERN internal::Address _v8_open_handle_scope(Isolate* isolate);
  V8_EXTERN internal::Address _v8_handle_scope_escape(internal::Address scope, internal::Address value);
  V8_EXTERN void _v8_close_handle_scope(internal::Address scope);
  V8_EXTERN Isolate* _v8_handle_scope_get_isolate(internal::Address scope);
  V8_EXTERN int _v8_number_of_handles(const Isolate* isolate);
  V8_EXTERN void _v8_add_finalizer(internal::Address handle, void* data, void (*callback)(void*, void*), void* hint);
  V8_EXTERN int _v8_get_cb_info(internal::Address info, size_t* argc, internal::Address* argv, internal::Address* this_arg, void** data);
  V8_EXTERN Value* _v8_cbinfo_rv(internal::Address info);
  V8_EXTERN Value* _v8_cbinfo_new_target(internal::Address info);
  V8_EXTERN internal::Address _v8_function_template_new(
      Isolate* isolate, internal::Address (*callback)(internal::Address info, FunctionCallback cb),
      FunctionCallback cb,
      internal::Address data, internal::Address signature,
      int length, ConstructorBehavior behavior,
      SideEffectType side_effect_type,
      const CFunction* c_function, uint16_t instance_type,
      uint16_t allowed_receiver_instance_type_range_start,
      uint16_t allowed_receiver_instance_type_range_end);
  V8_EXTERN internal::Address _v8_function_template_get_function(FunctionTemplate* tpl, Context* context);
  V8_EXTERN void _v8_function_template_set_class_name(FunctionTemplate* tpl, internal::Address name);
  V8_EXTERN internal::Address _v8_string_new_from_utf8(Isolate* isolate, const char* data, v8::NewStringType type, int length);
  V8_EXTERN void _v8_function_set_name(Function* func, internal::Address name);
  V8_EXTERN int _v8_object_set(Object* obj, Context* context, internal::Address key, internal::Address value, int* success);
  V8_EXTERN internal::Address _v8_object_template_new(Isolate* isolate, internal::Address constructor);
  V8_EXTERN void _v8_object_template_set_internal_field_count(ObjectTemplate* obj_tpl, int value);
  V8_EXTERN internal::Address _v8_external_new(Isolate* isolate, void* data);
  V8_EXTERN void _v8_object_set_internal_field(Object* obj, int index, internal::Address data);
  V8_EXTERN internal::Address _v8_object_template_new_instance(ObjectTemplate* obj_tpl, Context* context);
  V8_EXTERN internal::Address _v8_object_get_internal_field(Object* obj, int index);
  V8_EXTERN void* _v8_external_value(const External* obj);
}

namespace internal {
  Isolate* IsolateFromNeverReadOnlySpaceObject(unsigned long obj) {
    return reinterpret_cast<Isolate*>(v8::Isolate::GetCurrent());
  }
}

namespace v8impl {

static_assert(sizeof(v8::Local<v8::Value>) == sizeof(internal::Address),
              "Cannot convert between v8::Local<v8::Value> and internal::Address");

inline internal::Address AddressFromV8LocalValue(v8::Local<v8::Value> local) {
  return reinterpret_cast<internal::Address>(*local);
}

inline v8::Local<v8::Value> V8LocalValueFromAddress(internal::Address v) {
  v8::Local<v8::Value> local;
  memcpy(static_cast<void*>(&local), &v, sizeof(v));
  return local;
}

}

namespace api_internal {

void ToLocalEmpty() {
  abort();
}

void FromJustIsNothing() {
  abort();
}

}  // namespace api_internal

namespace {

struct IsolateImpl {
  char data_[2048];

  IsolateImpl(): data_{} {
    memset(data_, 0, sizeof(data_));

    *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::Internals::kUndefinedValueRootIndex * v8::internal::kApiSystemPointerSize) = 1;
    *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::Internals::kTheHoleValueRootIndex * v8::internal::kApiSystemPointerSize) = 0;
    *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::Internals::kNullValueRootIndex * v8::internal::kApiSystemPointerSize) = 2;
    *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::Internals::kFalseValueRootIndex * v8::internal::kApiSystemPointerSize) = 3;
    *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::Internals::kTrueValueRootIndex * v8::internal::kApiSystemPointerSize) = 4;
    *reinterpret_cast<internal::Address*>(data_ + internal::Internals::kIsolateRootsOffset + v8::internal::Internals::kEmptyStringRootIndex * v8::internal::kApiSystemPointerSize) = 6;
  }
};

};

Isolate* Isolate::GetCurrent() {
  static IsolateImpl current_isolate;
  return reinterpret_cast<Isolate*>(&current_isolate);
}

Local<Context> Isolate::GetCurrentContext() {
  return v8impl::V8LocalValueFromAddress(_v8_isolate_get_current_context(this)).As<Context>();
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
    internal::Address* list = new internal::Address[7 + argc]{0};
    implicit_args_ = list;
    values_ = list + 7;
    length_ = argc;
    _v8_get_cb_info(info, &argc, values_, list, reinterpret_cast<void**>(list + 4));
    // *(list) = reinterpret_cast<internal::Address>(_v8_cbinfo_this(info));
    *(list + 1) = reinterpret_cast<internal::Address>(Isolate::GetCurrent());
    *(list + 2) = 0;
    // *(list + 3) = reinterpret_cast<internal::Address>(_v8_cbinfo_rv(info));
    *(list + 3) = internal::ValueHelper::kEmpty;
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
  internal::Address tpl_value = _v8_function_template_new(isolate,
    [](internal::Address info, FunctionCallback callback) {
      FunctionCallbackInfoImpl cbinfo{info};
      auto* args = reinterpret_cast<FunctionCallbackInfo<Value>*>(&cbinfo);
      callback(*args);
      Local<Value> ret = args->GetReturnValue().Get();
      return v8impl::AddressFromV8LocalValue(ret);
    }, callback, reinterpret_cast<internal::Address>(*data),
    reinterpret_cast<internal::Address>(*signature), length,
    behavior, side_effect_type, c_function, instance_type,
    allowed_receiver_instance_type_range_start,
    allowed_receiver_instance_type_range_end);
  return v8impl::V8LocalValueFromAddress(tpl_value).As<FunctionTemplate>();
}

MaybeLocal<Function> FunctionTemplate::GetFunction(v8::Local<v8::Context> context) {
  auto func = _v8_function_template_get_function(this, *context);
  if (!func) return MaybeLocal<Function>();
  return v8impl::V8LocalValueFromAddress(func).As<Function>();
}

void FunctionTemplate::SetClassName(v8::Local<v8::String> name) {
  _v8_function_template_set_class_name(this, v8impl::AddressFromV8LocalValue(name));
}

MaybeLocal<String> String::NewFromUtf8(v8::Isolate* isolate, char const* data, v8::NewStringType type, int length) {
  auto str = _v8_string_new_from_utf8(isolate, data, type, length);
  if (!str) return MaybeLocal<String>();
  return v8impl::V8LocalValueFromAddress(str).As<String>();
}

void Function::SetName(v8::Local<v8::String> name) {
  _v8_function_set_name(this, v8impl::AddressFromV8LocalValue(name));
}

Maybe<bool> Object::Set(v8::Local<v8::Context> context, v8::Local<v8::Value> key, v8::Local<v8::Value> value) {
  int success = 0;
  int r = _v8_object_set(this, *context,
    v8impl::AddressFromV8LocalValue(key), v8impl::AddressFromV8LocalValue(value), &success);
  if (r != 0) return Nothing<bool>();
  return Just<bool>(success);
}

internal::Address* HandleScope::CreateHandle(v8::internal::Isolate*, internal::Address value) {
  return new internal::Address(value);
}

EscapableHandleScopeBase::EscapableHandleScopeBase(Isolate* isolate): HandleScope(isolate), escape_slot_(nullptr) {}

internal::Address* EscapableHandleScopeBase::EscapeSlot(internal::Address* escape_value) {
  if (escape_slot_ != nullptr) {
    abort();
  }
  internal::Address* prev_next_ = *reinterpret_cast<internal::Address**>(reinterpret_cast<internal::Address>(this) + internal::kApiSystemPointerSize * 1);
  escape_slot_ = reinterpret_cast<internal::Address*>(
    _v8_handle_scope_escape(*prev_next_, reinterpret_cast<internal::Address>(escape_value)));
  return escape_slot_;
}

Local<ObjectTemplate> ObjectTemplate::New(Isolate* isolate, Local<FunctionTemplate> constructor) {
  internal::Address obj_tpl_value = _v8_object_template_new(isolate, reinterpret_cast<internal::Address>(*constructor));
  if (!obj_tpl_value) return Local<ObjectTemplate>();
  return v8impl::V8LocalValueFromAddress(obj_tpl_value).As<ObjectTemplate>();
}

MaybeLocal<Object> ObjectTemplate::NewInstance(v8::Local<v8::Context> context) {
  internal::Address obj_value = _v8_object_template_new_instance(this, *context);
  if (!obj_value) return MaybeLocal<Object>();
  return v8impl::V8LocalValueFromAddress(obj_value).As<Object>();
}

void ObjectTemplate::SetInternalFieldCount(int value) {
  _v8_object_template_set_internal_field_count(this, value);
}

Local<External> External::New(v8::Isolate* isolate, void* value) {
  internal::Address obj_value = _v8_external_new(isolate, value);
  if (!obj_value) return Local<External>();
  auto obj = v8impl::V8LocalValueFromAddress(obj_value).As<External>();
  return obj;
}

void* External::Value() const {
  return _v8_external_value(this);
}

// Local<Data> Object::GetInternalField(int index) {
//   return SlowGetInternalField(index);
// }

void Object::SetInternalField(int index, v8::Local<v8::Data> data) {
  _v8_object_set_internal_field(this, index, reinterpret_cast<internal::Address>(*data));
}

Local<Data> Object::SlowGetInternalField(int index) {
  internal::Address data_value = _v8_object_get_internal_field(this, index);
  if (!data_value) return Local<Data>();
  return v8impl::V8LocalValueFromAddress(data_value).As<Data>();
}

}  // namespace v8
