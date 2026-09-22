#include <nan.h>

using namespace Nan;
using namespace v8;

NAN_METHOD(EscapeTwice) {
  Nan::EscapableHandleScope scope;
  Local<Object> first = New<Object>();
  Local<Object> second = New<Object>();
  Local<Object> escaped = scope.Escape(first);
  Local<Object> rejected = scope.Escape(second);
  Local<Object> result = New<Object>();
  Nan::Set(result, New("firstEmpty").ToLocalChecked(), New(escaped.IsEmpty())).Check();
  Nan::Set(result, New("secondEmpty").ToLocalChecked(), New(rejected.IsEmpty())).Check();
  info.GetReturnValue().Set(result);
}

NAN_METHOD(EscapeThroughCaughtException) {
  Nan::EscapableHandleScope scope;
  Local<Object> escaped;
  {
    Nan::EscapableHandleScope child;
    Local<Object> value = New<Object>();
    Nan::Set(value, New("answer").ToLocalChecked(), New(42)).Check();
    escaped = child.Escape(value);
    Nan::TryCatch tryCatch;
    ThrowError("child scope failure");
    if (!tryCatch.HasCaught()) return;
  }
  info.GetReturnValue().Set(escaped);
}

NAN_MODULE_INIT(Init) {
  SetMethod(target, "escapeTwice", EscapeTwice);
  SetMethod(target, "escapeThroughCaughtException", EscapeThroughCaughtException);
}

NODE_MODULE(handlescope, Init)
