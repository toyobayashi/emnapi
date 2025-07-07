#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN Value* _v8_cbinfo_new_target(internal::Address info);
  V8_EXTERN internal::Address _v8_function_template_new(
      Isolate* isolate, internal::Address (*callback)(internal::Address info, v8::FunctionCallback cb),
      v8::FunctionCallback cb,
      internal::Address data, internal::Address signature,
      int length, ConstructorBehavior behavior,
      SideEffectType side_effect_type,
      const CFunction* c_function, uint16_t instance_type,
      uint16_t allowed_receiver_instance_type_range_start,
      uint16_t allowed_receiver_instance_type_range_end);
  V8_EXTERN internal::Address _v8_function_template_get_function(FunctionTemplate* tpl, Context* context);
  V8_EXTERN void _v8_function_template_set_class_name(FunctionTemplate* tpl, internal::Address name);
  V8_EXTERN int _v8_get_cb_info(internal::Address info, size_t* argc, internal::Address* argv, internal::Address* this_arg, void** data);
  V8_EXTERN internal::Address _v8_object_template_new(Isolate* isolate, internal::Address constructor);
  V8_EXTERN void _v8_object_template_set_internal_field_count(ObjectTemplate* obj_tpl, int value);
  V8_EXTERN internal::Address _v8_object_template_new_instance(ObjectTemplate* obj_tpl, Context* context);
  V8_EXTERN internal::Address _v8_signature_new(Isolate* isolate, internal::Address receiver);
}

namespace {

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

internal::Address CallbackWrap(internal::Address info, v8::FunctionCallback callback) {
  const FunctionCallbackInfoImpl cbinfo{info};
  const v8::FunctionCallbackInfo<Value>* args = reinterpret_cast<const v8::FunctionCallbackInfo<Value>*>(&cbinfo);
  const v8::FunctionCallbackInfo<Value>& args_ref = *args;
  callback(args_ref);
  Local<Value> ret = args->GetReturnValue().Get();
  return v8impl::AddressFromV8LocalValue(ret);
}

}

void FunctionTemplate::CheckCast(v8::Data*) {}
void ObjectTemplate::CheckCast(v8::Data*) {}

Local<FunctionTemplate> FunctionTemplate::New(
    Isolate* isolate, v8::FunctionCallback callback,
    Local<Value> data,
    Local<Signature> signature, int length,
    ConstructorBehavior behavior,
    SideEffectType side_effect_type,
    const CFunction* c_function, uint16_t instance_type,
    uint16_t allowed_receiver_instance_type_range_start,
    uint16_t allowed_receiver_instance_type_range_end) {
  internal::Address tpl_value = _v8_function_template_new(isolate,
    CallbackWrap, callback, reinterpret_cast<internal::Address>(*data),
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

Local<ObjectTemplate> FunctionTemplate::InstanceTemplate() {
  // TODO
  return Local<ObjectTemplate>();
}

Local<ObjectTemplate> FunctionTemplate::PrototypeTemplate() {
  // TODO
  return Local<ObjectTemplate>();
}

void Template::Set(Local<Name> name, Local<Data> value,
                   PropertyAttribute attributes) {
  // TODO
}

void ObjectTemplate::SetAccessor(
      Local<Name> name, AccessorNameGetterCallback getter,
      AccessorNameSetterCallback setter,
      Local<Value> data, PropertyAttribute attribute,
      SideEffectType getter_side_effect_type,
      SideEffectType setter_side_effect_type) {
  // TODO
}

Local<Signature> Signature::New(Isolate* isolate, Local<FunctionTemplate> receiver) {
  internal::Address signature = _v8_signature_new(isolate, reinterpret_cast<internal::Address>(*receiver));
  return v8impl::V8LocalValueFromAddress(signature).As<Signature>();
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

}
