#include <nan.h>

#include "uv.h"

using namespace Nan;

NAN_METHOD(CreateErrnoException) {
  // The compact libuv header in this repository does not expose UV_ENOENT;
  // libuv defines it as -2 on every supported platform.
  info.GetReturnValue().Set(ErrnoException(-2, "open", nullptr, "/tmp/missing"));
}

NAN_MODULE_INIT(Init) {
  SetMethod(target, "create", CreateErrnoException);
}

NODE_MODULE(errnoexception, Init)
