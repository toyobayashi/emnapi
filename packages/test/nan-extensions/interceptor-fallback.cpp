#include <nan.h>

#include <cstring>

using namespace Nan;
using namespace v8;

NAN_METHOD(NewObject) {
  Nan::Set(info.This(), New("fallback").ToLocalChecked(),
           New("named fallback").ToLocalChecked()).Check();
  Nan::Set(info.This(), New("7").ToLocalChecked(),
           New("indexed fallback").ToLocalChecked()).Check();
  info.GetReturnValue().Set(info.This());
}

NAN_PROPERTY_GETTER(NamedGetter) {
  Nan::Utf8String name(property);
  if (!std::strcmp(*name, "fallback")) return Nan::Intercepted::No();
  info.GetReturnValue().Set(New("named interceptor").ToLocalChecked());
  return Nan::Intercepted::Yes();
}

NAN_PROPERTY_SETTER(NamedSetter) {
  Nan::Utf8String name(property);
  if (!std::strcmp(*name, "fallback")) return Nan::Intercepted::No();
  info.GetReturnValue().Set(info.This());
  return Nan::Intercepted::Yes();
}

NAN_PROPERTY_QUERY(NamedQuery) {
  Nan::Utf8String name(property);
  if (!std::strcmp(*name, "fallback")) return Nan::Intercepted::No();
  info.GetReturnValue().Set(New(0));
  return Nan::Intercepted::Yes();
}

NAN_PROPERTY_DELETER(NamedDeleter) {
  Nan::Utf8String name(property);
  if (!std::strcmp(*name, "fallback")) return Nan::Intercepted::No();
  info.GetReturnValue().Set(True());
  return Nan::Intercepted::Yes();
}

NAN_PROPERTY_ENUMERATOR(NamedEnumerator) {
  Local<Array> result = New<Array>(1);
  Nan::Set(result, 0, New("named").ToLocalChecked()).Check();
  info.GetReturnValue().Set(result);
}

NAN_INDEX_GETTER(IndexedGetter) {
  if (index == 7) return Nan::Intercepted::No();
  info.GetReturnValue().Set(New("indexed interceptor").ToLocalChecked());
  return Nan::Intercepted::Yes();
}

NAN_INDEX_SETTER(IndexedSetter) {
  if (index == 7) return Nan::Intercepted::No();
  info.GetReturnValue().Set(info.This());
  return Nan::Intercepted::Yes();
}

NAN_INDEX_QUERY(IndexedQuery) {
  if (index == 7) return Nan::Intercepted::No();
  info.GetReturnValue().Set(New(0));
  return Nan::Intercepted::Yes();
}

NAN_INDEX_DELETER(IndexedDeleter) {
  if (index == 7) return Nan::Intercepted::No();
  info.GetReturnValue().Set(True());
  return Nan::Intercepted::Yes();
}

NAN_INDEX_ENUMERATOR(IndexedEnumerator) {
  Local<Array> result = New<Array>(1);
  Nan::Set(result, 0, New(0)).Check();
  info.GetReturnValue().Set(result);
}

NAN_MODULE_INIT(Init) {
  Local<FunctionTemplate> named = New<FunctionTemplate>(NewObject);
  SetNamedPropertyHandler(named->InstanceTemplate(), NamedGetter, NamedSetter,
                          NamedQuery, NamedDeleter, NamedEnumerator);
  named->PrototypeTemplate()->Set(
      New("fallback").ToLocalChecked(), New("named fallback").ToLocalChecked());
  Nan::Set(target, New("createNamed").ToLocalChecked(),
      GetFunction(named).ToLocalChecked());

  Local<FunctionTemplate> indexed = New<FunctionTemplate>(NewObject);
  SetIndexedPropertyHandler(indexed->InstanceTemplate(), IndexedGetter,
                            IndexedSetter, IndexedQuery, IndexedDeleter,
                            IndexedEnumerator);
  indexed->PrototypeTemplate()->Set(
      New("7").ToLocalChecked(), New("indexed fallback").ToLocalChecked());
  Nan::Set(target, New("createIndexed").ToLocalChecked(),
      GetFunction(indexed).ToLocalChecked());
}

NODE_MODULE(interceptor_fallback, Init)
