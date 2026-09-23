#include "v8_impl.h"

namespace v8 {

namespace api_internal {

Local<Value> GetFunctionTemplateData(Isolate*, Local<Data> raw_target) {
  return Local<Value>::Cast(raw_target);
}

}  // namespace api_internal

#if defined(V8_MAJOR_VERSION) && +    (V8_MAJOR_VERSION > 12 || +     (V8_MAJOR_VERSION == 12 && defined(V8_MINOR_VERSION) && +      V8_MINOR_VERSION > 4))
#define EMNAPI_V8_NEW_PROPERTY_CALLBACKS 1
#else
#define EMNAPI_V8_NEW_PROPERTY_CALLBACKS 0
#endif

extern "C" {
  V8_EXTERN Value* _v8_cbinfo_new_target(internal::Address info);
  V8_EXTERN Value* _v8_cbinfo_holder(internal::Address info);
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
  V8_EXTERN void _v8_function_template_set_call_handler(
      FunctionTemplate* tpl,
      internal::Address (*callback_wrap)(internal::Address, FunctionCallback),
      FunctionCallback callback, internal::Address data);
  V8_EXTERN int _v8_get_cb_info(internal::Address info, size_t* argc, internal::Address* argv, internal::Address* this_arg, void** data);
  V8_EXTERN internal::Address _v8_object_template_new(Isolate* isolate, internal::Address constructor);
  V8_EXTERN void _v8_object_template_set_internal_field_count(ObjectTemplate* obj_tpl, int value);
  V8_EXTERN void _v8_object_template_set_call_as_function_handler(
      ObjectTemplate* obj_tpl,
      internal::Address (*callback_wrap)(internal::Address, FunctionCallback),
      FunctionCallback callback, internal::Address data);
  V8_EXTERN internal::Address _v8_object_template_new_instance(ObjectTemplate* obj_tpl, Context* context);
  V8_EXTERN internal::Address _v8_signature_new(Isolate* isolate, internal::Address receiver);
  V8_EXTERN void _v8_template_set(Template* tpl, internal::Address name, internal::Address value, 
                                  PropertyAttribute attributes);
  V8_EXTERN internal::Address _v8_function_template_instance_template(FunctionTemplate* tpl);
  V8_EXTERN internal::Address _v8_function_template_prototype_template(FunctionTemplate* tpl);
  V8_EXTERN void _v8_get_property_cb_info(internal::Address info, internal::Address* args);
  V8_EXTERN void _v8_object_template_set_native_data_property(
    ObjectTemplate* obj_tpl, internal::Address name,
    internal::Address (*getter_wrap)(internal::Address property, internal::Address info, AccessorNameGetterCallback getter),
    internal::Address (*setter_wrap)(internal::Address property, internal::Address value, internal::Address info, AccessorNameSetterCallback setter),
    AccessorNameGetterCallback getter, AccessorNameSetterCallback setter,
    internal::Address data, PropertyAttribute attribute,
    SideEffectType getter_side_effect_type,
    SideEffectType setter_side_effect_type
  );
  V8_EXTERN void _v8_object_template_set_named_property_handler(
      ObjectTemplate* obj_tpl,
      internal::Address (*getter_wrap)(internal::Address, internal::Address, internal::Address),
      internal::Address (*setter_wrap)(internal::Address, internal::Address, internal::Address, internal::Address),
      internal::Address (*query_wrap)(internal::Address, internal::Address, internal::Address),
      internal::Address (*deleter_wrap)(internal::Address, internal::Address, internal::Address),
      internal::Address (*enumerator_wrap)(internal::Address, internal::Address),
      internal::Address getter, internal::Address setter,
      internal::Address query, internal::Address deleter,
      internal::Address enumerator, internal::Address data,
      int flags);
  V8_EXTERN void _v8_object_template_set_indexed_property_handler(
      ObjectTemplate* obj_tpl,
      internal::Address (*getter_wrap)(internal::Address, internal::Address, internal::Address),
      internal::Address (*setter_wrap)(internal::Address, internal::Address, internal::Address, internal::Address),
      internal::Address (*query_wrap)(internal::Address, internal::Address, internal::Address),
      internal::Address (*deleter_wrap)(internal::Address, internal::Address, internal::Address),
      internal::Address (*enumerator_wrap)(internal::Address, internal::Address),
      internal::Address getter, internal::Address setter,
      internal::Address query, internal::Address deleter,
      internal::Address enumerator, internal::Address data,
      int flags);
  V8_EXTERN internal::Address _v8_function_new(
    Context* context,
    internal::Address (*callback)(internal::Address info, v8::FunctionCallback cb),
    v8::FunctionCallback cb,
    internal::Address data,
    int length,
    int behavior,
    int side_effect_type);
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
    *(list) = reinterpret_cast<internal::Address>(_v8_cbinfo_holder(info));
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

struct PropertyCallbackInfoImpl {
  internal::Address args_[8];

  PropertyCallbackInfoImpl(internal::Address info) : args_{} {
    args_[3] = reinterpret_cast<internal::Address>(Isolate::GetCurrent());
    args_[4] = internal::ValueHelper::kEmpty;
    args_[5] = internal::ValueHelper::kEmpty;
    _v8_get_property_cb_info(info, args_);
  }

  PropertyCallbackInfoImpl(const PropertyCallbackInfoImpl&) = delete;
  PropertyCallbackInfoImpl& operator=(const PropertyCallbackInfoImpl&) = delete;
  PropertyCallbackInfoImpl(PropertyCallbackInfoImpl&&) = delete;
  PropertyCallbackInfoImpl& operator=(PropertyCallbackInfoImpl&&) = delete;

  internal::Address ReturnValue() const {
    return args_[5];
  }
};

internal::Address PropertyCallbackReturnValue(
    const PropertyCallbackInfoImpl& cbinfo, bool intercepted = true,
    bool emptyMeansNoIntercept = false) {
  if (!intercepted) return 0;
  if (cbinfo.ReturnValue() == 0 ||
      cbinfo.ReturnValue() == 1 ||
      cbinfo.ReturnValue() == internal::ValueHelper::kEmpty) {
    if (emptyMeansNoIntercept) return 0;
    return v8impl::AddressFromV8LocalValue(Undefined(Isolate::GetCurrent()));
  }
  return cbinfo.ReturnValue();
}

internal::Address PropertyGetterWrap(internal::Address property, internal::Address info, AccessorNameGetterCallback getter) {
  const PropertyCallbackInfoImpl cbinfo{info};
  const v8::PropertyCallbackInfo<Value>* args = reinterpret_cast<const v8::PropertyCallbackInfo<Value>*>(&cbinfo);
  const v8::PropertyCallbackInfo<Value>& args_ref = *args;
  getter(v8impl::V8LocalValueFromAddress(property).As<Name>(), args_ref);
  Local<Value> ret = args->GetReturnValue().Get();
  return v8impl::AddressFromV8LocalValue(ret);
}

internal::Address PropertySetterWrap(internal::Address property, internal::Address value, internal::Address info, AccessorNameSetterCallback setter) {
  const PropertyCallbackInfoImpl cbinfo{info};
  const v8::PropertyCallbackInfo<void>* args = reinterpret_cast<const v8::PropertyCallbackInfo<void>*>(&cbinfo);
  const v8::PropertyCallbackInfo<void>& args_ref = *args;
  setter(v8impl::V8LocalValueFromAddress(property).As<Name>(), v8impl::V8LocalValueFromAddress(value), args_ref);
  Local<Value> ret = args->GetReturnValue().Get();
  return v8impl::AddressFromV8LocalValue(ret);
}

internal::Address NamedPropertyGetterWrap(
    internal::Address property, internal::Address info, internal::Address getter) {
  const PropertyCallbackInfoImpl cbinfo{info};
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  const v8::PropertyCallbackInfo<Value>* args =
      reinterpret_cast<const v8::PropertyCallbackInfo<Value>*>(&cbinfo);
  const auto callback = reinterpret_cast<NamedPropertyGetterCallback>(getter);
  const Intercepted intercepted =
      callback(v8impl::V8LocalValueFromAddress(property).As<Name>(), *args);
#else
  const v8::PropertyCallbackInfo<Value>* args =
      reinterpret_cast<const v8::PropertyCallbackInfo<Value>*>(&cbinfo);
  const auto callback =
      reinterpret_cast<GenericNamedPropertyGetterCallback>(getter);
  callback(v8impl::V8LocalValueFromAddress(property).As<Name>(), *args);
#endif
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  return PropertyCallbackReturnValue(
      cbinfo, intercepted == Intercepted::kYes);
#else
  return PropertyCallbackReturnValue(cbinfo, true, true);
#endif
}

internal::Address NamedPropertySetterWrap(
  internal::Address property, internal::Address value,
    internal::Address info, internal::Address setter) {
  const PropertyCallbackInfoImpl cbinfo{info};
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  const v8::PropertyCallbackInfo<void>* args =
      reinterpret_cast<const v8::PropertyCallbackInfo<void>*>(&cbinfo);
  const auto callback = reinterpret_cast<NamedPropertySetterCallback>(setter);
  const Intercepted intercepted = callback(
      v8impl::V8LocalValueFromAddress(property).As<Name>(),
      v8impl::V8LocalValueFromAddress(value), *args);
#else
  const v8::PropertyCallbackInfo<Value>* args =
      reinterpret_cast<const v8::PropertyCallbackInfo<Value>*>(&cbinfo);
  const auto callback =
      reinterpret_cast<GenericNamedPropertySetterCallback>(setter);
  callback(v8impl::V8LocalValueFromAddress(property).As<Name>(),
           v8impl::V8LocalValueFromAddress(value), *args);
#endif
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  return PropertyCallbackReturnValue(
      cbinfo, intercepted == Intercepted::kYes);
#else
  return PropertyCallbackReturnValue(cbinfo, true, true);
#endif
}

internal::Address NamedPropertyQueryWrap(
internal::Address property, internal::Address info, internal::Address query) {
  const PropertyCallbackInfoImpl cbinfo{info};
  const v8::PropertyCallbackInfo<Integer>* args =
      reinterpret_cast<const v8::PropertyCallbackInfo<Integer>*>(&cbinfo);
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  const auto callback = reinterpret_cast<NamedPropertyQueryCallback>(query);
  const Intercepted intercepted = callback(
      v8impl::V8LocalValueFromAddress(property).As<Name>(), *args);
#else
  const auto callback =
      reinterpret_cast<GenericNamedPropertyQueryCallback>(query);
  callback(v8impl::V8LocalValueFromAddress(property).As<Name>(), *args);
#endif
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  return PropertyCallbackReturnValue(
      cbinfo, intercepted == Intercepted::kYes);
#else
  return PropertyCallbackReturnValue(cbinfo, true, true);
#endif
}

internal::Address NamedPropertyDeleterWrap(
    internal::Address property, internal::Address info,
    internal::Address deleter) {
  const PropertyCallbackInfoImpl cbinfo{info};
  const v8::PropertyCallbackInfo<Boolean>* args =
      reinterpret_cast<const v8::PropertyCallbackInfo<Boolean>*>(&cbinfo);
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  const auto callback = reinterpret_cast<NamedPropertyDeleterCallback>(deleter);
  const Intercepted intercepted = callback(
      v8impl::V8LocalValueFromAddress(property).As<Name>(), *args);
#else
  const auto callback =
      reinterpret_cast<GenericNamedPropertyDeleterCallback>(deleter);
  callback(v8impl::V8LocalValueFromAddress(property).As<Name>(), *args);
#endif
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  return PropertyCallbackReturnValue(
      cbinfo, intercepted == Intercepted::kYes);
#else
  return PropertyCallbackReturnValue(cbinfo, true, true);
#endif
}

internal::Address NamedPropertyEnumeratorWrap(
    internal::Address info, internal::Address enumerator) {
  const PropertyCallbackInfoImpl cbinfo{info};
  const v8::PropertyCallbackInfo<Array>* args =
      reinterpret_cast<const v8::PropertyCallbackInfo<Array>*>(&cbinfo);
  const auto callback =
      reinterpret_cast<NamedPropertyEnumeratorCallback>(enumerator);
  callback(*args);
  return PropertyCallbackReturnValue(cbinfo, true, true);
}

internal::Address IndexedPropertyGetterWrap(
internal::Address index, internal::Address info, internal::Address getter) {
  const PropertyCallbackInfoImpl cbinfo{info};
  const v8::PropertyCallbackInfo<Value>* args =
      reinterpret_cast<const v8::PropertyCallbackInfo<Value>*>(&cbinfo);
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  const auto callback = reinterpret_cast<IndexedPropertyGetterCallbackV2>(getter);
  const Intercepted intercepted = callback(
      static_cast<uint32_t>(index), *args);
#else
  const auto callback = reinterpret_cast<IndexedPropertyGetterCallback>(getter);
  callback(static_cast<uint32_t>(index), *args);
#endif
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  return PropertyCallbackReturnValue(
      cbinfo, intercepted == Intercepted::kYes);
#else
  return PropertyCallbackReturnValue(cbinfo, true, true);
#endif
}

internal::Address IndexedPropertySetterWrap(
    internal::Address index, internal::Address value,
    internal::Address info, internal::Address setter) {
  const PropertyCallbackInfoImpl cbinfo{info};
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  const v8::PropertyCallbackInfo<void>* args =
      reinterpret_cast<const v8::PropertyCallbackInfo<void>*>(&cbinfo);
  const auto callback = reinterpret_cast<IndexedPropertySetterCallbackV2>(setter);
  const Intercepted intercepted = callback(
      static_cast<uint32_t>(index), v8impl::V8LocalValueFromAddress(value),
      *args);
#else
  const v8::PropertyCallbackInfo<Value>* args =
      reinterpret_cast<const v8::PropertyCallbackInfo<Value>*>(&cbinfo);
  const auto callback = reinterpret_cast<IndexedPropertySetterCallback>(setter);
  callback(static_cast<uint32_t>(index), v8impl::V8LocalValueFromAddress(value),
           *args);
#endif
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  return PropertyCallbackReturnValue(
      cbinfo, intercepted == Intercepted::kYes);
#else
  return PropertyCallbackReturnValue(cbinfo, true, true);
#endif
}

internal::Address IndexedPropertyQueryWrap(
    internal::Address index, internal::Address info, internal::Address query) {
  const PropertyCallbackInfoImpl cbinfo{info};
  const v8::PropertyCallbackInfo<Integer>* args =
      reinterpret_cast<const v8::PropertyCallbackInfo<Integer>*>(&cbinfo);
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  const auto callback = reinterpret_cast<IndexedPropertyQueryCallbackV2>(query);
  const Intercepted intercepted = callback(static_cast<uint32_t>(index), *args);
#else
  const auto callback = reinterpret_cast<IndexedPropertyQueryCallback>(query);
  callback(static_cast<uint32_t>(index), *args);
#endif
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  return PropertyCallbackReturnValue(
      cbinfo, intercepted == Intercepted::kYes);
#else
  return PropertyCallbackReturnValue(cbinfo, true, true);
#endif
}

internal::Address IndexedPropertyDeleterWrap(
    internal::Address index, internal::Address info, internal::Address deleter) {
  const PropertyCallbackInfoImpl cbinfo{info};
  const v8::PropertyCallbackInfo<Boolean>* args =
      reinterpret_cast<const v8::PropertyCallbackInfo<Boolean>*>(&cbinfo);
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  const auto callback = reinterpret_cast<IndexedPropertyDeleterCallbackV2>(deleter);
  const Intercepted intercepted =
      callback(static_cast<uint32_t>(index), *args);
#else
  const auto callback = reinterpret_cast<IndexedPropertyDeleterCallback>(deleter);
  callback(static_cast<uint32_t>(index), *args);
#endif
#if EMNAPI_V8_NEW_PROPERTY_CALLBACKS
  return PropertyCallbackReturnValue(
      cbinfo, intercepted == Intercepted::kYes);
#else
  return PropertyCallbackReturnValue(cbinfo, true, true);
#endif
}

internal::Address IndexedPropertyEnumeratorWrap(
    internal::Address info, internal::Address enumerator) {
  const PropertyCallbackInfoImpl cbinfo{info};
  const v8::PropertyCallbackInfo<Array>* args =
      reinterpret_cast<const v8::PropertyCallbackInfo<Array>*>(&cbinfo);
  const auto callback =
      reinterpret_cast<IndexedPropertyEnumeratorCallback>(enumerator);
  callback(*args);
  return PropertyCallbackReturnValue(cbinfo, true, true);
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

void FunctionTemplate::SetCallHandler(
    FunctionCallback callback, Local<Value> data, SideEffectType side_effect_type,
    const MemorySpan<const CFunction>& c_function) {
  _v8_function_template_set_call_handler(
      this, CallbackWrap, callback, v8impl::AddressFromV8LocalValue(data));
}

Local<ObjectTemplate> FunctionTemplate::InstanceTemplate() {
  internal::Address v = _v8_function_template_instance_template(this);
  v8::Local<v8::ObjectTemplate> local;
  memcpy(static_cast<void*>(&local), &v, sizeof(v));
  return local;
}

Local<ObjectTemplate> FunctionTemplate::PrototypeTemplate() {
  internal::Address v = _v8_function_template_prototype_template(this);
  v8::Local<v8::ObjectTemplate> local;
  memcpy(static_cast<void*>(&local), &v, sizeof(v));
  return local;
}

void Template::Set(Local<Name> name, Local<Data> value,
                   PropertyAttribute attributes) {
  internal::Address name_value = v8impl::AddressFromV8LocalValue(name);
  internal::Address value_value = reinterpret_cast<internal::Address>(*value);
  _v8_template_set(this, name_value, value_value, attributes);
}

void Template::SetNativeDataProperty(
    Local<Name> name, AccessorNameGetterCallback getter,
    AccessorNameSetterCallback setter, Local<Value> data,
    PropertyAttribute attribute, SideEffectType getter_side_effect_type,
    SideEffectType setter_side_effect_type) {
  _v8_object_template_set_native_data_property(
      static_cast<ObjectTemplate*>(this),
      v8impl::AddressFromV8LocalValue(name),
      PropertyGetterWrap, PropertySetterWrap, getter, setter,
      v8impl::AddressFromV8LocalValue(data), attribute,
      getter_side_effect_type, setter_side_effect_type);
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

void ObjectTemplate::SetCallAsFunctionHandler(
    FunctionCallback callback, Local<Value> data) {
  _v8_object_template_set_call_as_function_handler(
      this, CallbackWrap, callback, v8impl::AddressFromV8LocalValue(data));
}

void ObjectTemplate::SetHandler(
    const NamedPropertyHandlerConfiguration& configuration) {
  _v8_object_template_set_named_property_handler(
      this, NamedPropertyGetterWrap, NamedPropertySetterWrap,
      NamedPropertyQueryWrap, NamedPropertyDeleterWrap,
      NamedPropertyEnumeratorWrap,
      reinterpret_cast<internal::Address>(configuration.getter),
      reinterpret_cast<internal::Address>(configuration.setter),
      reinterpret_cast<internal::Address>(configuration.query),
      reinterpret_cast<internal::Address>(configuration.deleter),
      reinterpret_cast<internal::Address>(configuration.enumerator),
      v8impl::AddressFromV8LocalValue(configuration.data),
      static_cast<int>(configuration.flags));
}

void ObjectTemplate::SetHandler(
    const IndexedPropertyHandlerConfiguration& configuration) {
  _v8_object_template_set_indexed_property_handler(
      this, IndexedPropertyGetterWrap, IndexedPropertySetterWrap,
      IndexedPropertyQueryWrap, IndexedPropertyDeleterWrap,
      IndexedPropertyEnumeratorWrap,
      reinterpret_cast<internal::Address>(configuration.getter),
      reinterpret_cast<internal::Address>(configuration.setter),
      reinterpret_cast<internal::Address>(configuration.query),
      reinterpret_cast<internal::Address>(configuration.deleter),
      reinterpret_cast<internal::Address>(configuration.enumerator),
      v8impl::AddressFromV8LocalValue(configuration.data),
      static_cast<int>(configuration.flags));
}

MaybeLocal<Function> Function::New(
      Local<Context> context, FunctionCallback callback,
      Local<Value> data, int length,
      ConstructorBehavior behavior,
      SideEffectType side_effect_type) {
  internal::Address func_value = _v8_function_new(
    *context, CallbackWrap, callback, reinterpret_cast<internal::Address>(*data),
    length, static_cast<int>(behavior), static_cast<int>(side_effect_type));
  if (!func_value) return MaybeLocal<Function>();
  return v8impl::V8LocalValueFromAddress(func_value).As<Function>();
}

}
