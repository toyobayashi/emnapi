#include <nan.h>

#include <cstdlib>
#include <cstring>

using namespace Nan;
using namespace v8;

static int free_count = 0;
static void* last_hint = nullptr;
static char source[] = "portable-buffer";

void callback(char* data, void* hint) {
  ++free_count;
  last_hint = hint;
  free(data);
}

NAN_METHOD(Adopted) {
  const size_t length = sizeof(source) - 1;
  char* data = static_cast<char*>(malloc(length));
  memcpy(data, source, length);
  info.GetReturnValue().Set(NewBuffer(
      data, length, callback, reinterpret_cast<void*>(0x1234)).ToLocalChecked());
}

NAN_METHOD(Copied) {
  info.GetReturnValue().Set(CopyBuffer(source, sizeof(source) - 1).ToLocalChecked());
}

NAN_METHOD(MutateSource) {
  source[0] = source[0] == 'p' ? 'X' : 'p';
}

NAN_METHOD(FreeCount) {
  info.GetReturnValue().Set(New(static_cast<double>(free_count)));
}

NAN_METHOD(HintMatches) {
  info.GetReturnValue().Set(New(last_hint == reinterpret_cast<void*>(0x1234)));
}

NAN_MODULE_INIT(Init) {
  SetMethod(target, "adopted", Adopted);
  SetMethod(target, "copied", Copied);
  SetMethod(target, "mutateSource", MutateSource);
  SetMethod(target, "freeCount", FreeCount);
  SetMethod(target, "hintMatches", HintMatches);
}

NODE_MODULE(bufferownership, Init)
