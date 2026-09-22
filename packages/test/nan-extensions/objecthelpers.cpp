#include <nan.h>

using namespace Nan;
using namespace v8;

NAN_METHOD(DefineReadOnly) {
  Local<Object> object = To<Object>(info[0]).ToLocalChecked();
  DefineOwnProperty(object, New("locked").ToLocalChecked(),
                    New("value").ToLocalChecked(),
                    static_cast<PropertyAttribute>(ReadOnly | DontDelete))
      .Check();
  info.GetReturnValue().Set(object);
}

NAN_METHOD(Inspect) {
  Local<Object> object = To<Object>(info[0]).ToLocalChecked();
  Local<String> key = New("inherited").ToLocalChecked();
  Local<Object> result = New<Object>();
  Nan::Set(result, New("has").ToLocalChecked(), New(Has(object, key).FromJust())).Check();
  Nan::Set(result, New("own").ToLocalChecked(),
      New(HasOwnProperty(object, key).FromJust())).Check();
  Nan::Set(result, New("attributes").ToLocalChecked(),
      New(static_cast<uint32_t>(GetPropertyAttributes(object, key)))).Check();
  Nan::Set(result, New("names").ToLocalChecked(),
      GetPropertyNames(object).ToLocalChecked()).Check();
  Nan::Set(result, New("ownNames").ToLocalChecked(),
      GetOwnPropertyNames(object).ToLocalChecked()).Check();
  info.GetReturnValue().Set(result);
}

NAN_METHOD(InspectKeyKinds) {
  Local<Object> object = To<Object>(info[0]).ToLocalChecked();
  Local<Object> result = New<Object>();
  Local<Symbol> symbol = info[1].As<Symbol>();
  Nan::Set(result, New("numeric").ToLocalChecked(),
      New(Has(object, 3).FromJust())).Check();
  Nan::Set(result, New("symbol").ToLocalChecked(),
      New(object->Has(Isolate::GetCurrent()->GetCurrentContext(), symbol).FromJust())).Check();
  info.GetReturnValue().Set(result);
}

NAN_METHOD(DeleteKey) {
  info.GetReturnValue().Set(New(Delete(To<Object>(info[0]).ToLocalChecked(),
                                       To<String>(info[1]).ToLocalChecked()).FromJust()));
}

NAN_METHOD(LooseEquals) {
  info.GetReturnValue().Set(New(Equals(info[0], info[1]).FromJust()));
}

NAN_METHOD(SetPrototypeForTest) {
  info.GetReturnValue().Set(New(SetPrototype(
      To<Object>(info[0]).ToLocalChecked(),
      To<Object>(info[1]).ToLocalChecked()).FromJust()));
}

NAN_METHOD(CallFunction) {
  Local<Function> fn = To<Function>(info[0]).ToLocalChecked();
  Local<Object> receiver = To<Object>(info[1]).ToLocalChecked();
  Local<Value> argv[] = {info[2]};
  info.GetReturnValue().Set(CallAsFunction(fn, receiver, 1, argv).ToLocalChecked());
}

NAN_METHOD(CallConstructor) {
  Local<Function> fn = To<Function>(info[0]).ToLocalChecked();
  Local<Value> argv[] = {info[1]};
  info.GetReturnValue().Set(CallAsConstructor(fn, 1, argv).ToLocalChecked());
}

NAN_MODULE_INIT(Init) {
  SetMethod(target, "defineReadOnly", DefineReadOnly);
  SetMethod(target, "inspect", Inspect);
  SetMethod(target, "inspectKeyKinds", InspectKeyKinds);
  SetMethod(target, "deleteKey", DeleteKey);
  SetMethod(target, "looseEquals", LooseEquals);
  SetMethod(target, "setPrototypeForTest", SetPrototypeForTest);
  SetMethod(target, "callFunction", CallFunction);
  SetMethod(target, "callConstructor", CallConstructor);
}

NODE_MODULE(objecthelpers, Init)
