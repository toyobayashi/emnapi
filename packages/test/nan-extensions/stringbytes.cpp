#include <nan.h>

#include <string>
#include <vector>

using namespace Nan;
using namespace v8;

NAN_METHOD(RoundTrip) {
  Local<Value> input = info[0];
  const auto inputEncoding = static_cast<Encoding>(To<int32_t>(info[1]).FromJust());
  const auto outputEncoding = static_cast<Encoding>(To<int32_t>(info[2]).FromJust());
  const ssize_t length = DecodeBytes(input, inputEncoding);
  if (length < 0) return ThrowError("DecodeBytes failed");

  std::vector<char> bytes(static_cast<size_t>(length));
  const ssize_t written = DecodeWrite(
      bytes.data(), bytes.size(), input, inputEncoding);
  if (written < 0) return ThrowError("DecodeWrite failed");

  Local<Object> result = New<Object>();
  Nan::Set(result, New("length").ToLocalChecked(),
           New(static_cast<double>(length))).Check();
  Nan::Set(result, New("written").ToLocalChecked(),
           New(static_cast<double>(written))).Check();
  Nan::Set(result, New("value").ToLocalChecked(),
           Encode(bytes.data(), static_cast<size_t>(written), outputEncoding)).Check();
  info.GetReturnValue().Set(result);
}

NAN_METHOD(Truncate) {
  Local<Value> input = info[0];
  const auto encoding = static_cast<Encoding>(To<int32_t>(info[1]).FromJust());
  const ssize_t length = DecodeBytes(input, encoding);
  if (length < 2) return ThrowError("decoded value is too short");

  const size_t capacity = static_cast<size_t>(length - 2);
  std::vector<char> bytes(capacity);
  const ssize_t written = DecodeWrite(bytes.data(), capacity, input, encoding);
  if (written < 0) return ThrowError("DecodeWrite failed");

  info.GetReturnValue().Set(Encode(bytes.data(), static_cast<size_t>(written), encoding));
}

NAN_MODULE_INIT(Init) {
  SetMethod(target, "roundTrip", RoundTrip);
  SetMethod(target, "truncate", Truncate);
}

NODE_MODULE(stringbytes, Init)
