#include <nan.h>

using namespace Nan;
using namespace v8;

void InspectCallback(const v8::FunctionCallbackInfo<v8::Value>& info) {
  Local<Object> result = New<Object>();
  Nan::Set(result, New("this").ToLocalChecked(), info.This()).Check();
  Nan::Set(result, New("data").ToLocalChecked(), info.Data()).Check();
  Nan::Set(result, New("construct").ToLocalChecked(), New(info.IsConstructCall())).Check();
  Local<Value> newTarget = info.NewTarget();
  Nan::Set(result, New("newTarget").ToLocalChecked(),
      newTarget.IsEmpty() ? Undefined().As<Value>() : newTarget).Check();
  info.GetReturnValue().Set(result);
}

NAN_METHOD(NewThing) {
  if (info.IsConstructCall()) info.GetReturnValue().Set(info.This());
}

NAN_METHOD(EscapeValue) {
  Nan::EscapableHandleScope scope;
  Local<Object> value = New<Object>();
  Nan::Set(value, New("answer").ToLocalChecked(), New(42)).Check();
  info.GetReturnValue().Set(scope.Escape(value));
}

NAN_MODULE_INIT(Init) {
  Local<FunctionTemplate> directTemplate = FunctionTemplate::New(
      Isolate::GetCurrent(), InspectCallback,
      New("direct-data").ToLocalChecked());
  Local<Function> direct = directTemplate->GetFunction(
      Isolate::GetCurrent()->GetCurrentContext()).ToLocalChecked();
  Nan::Set(target, New("inspect").ToLocalChecked(), direct).Check();

  Local<FunctionTemplate> thingTemplate = New<FunctionTemplate>(NewThing);
  thingTemplate->PrototypeTemplate()->Set(
      New("inspect").ToLocalChecked(),
      FunctionTemplate::New(Isolate::GetCurrent(), InspectCallback,
                             New("prototype-data").ToLocalChecked()));
  Local<Function> thing = GetFunction(thingTemplate).ToLocalChecked();
  Nan::Set(target, New("Thing").ToLocalChecked(), thing).Check();
  SetMethod(target, "escape", EscapeValue);
}

NODE_MODULE(callbackinfo, Init)
