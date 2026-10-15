#include <vector>

#include "v8.h"
#include "node.h"
#include "node_buffer.h"

// copyContents(view, size): v8::ArrayBufferView::CopyContents into a block of
// `size` bytes, returns a Buffer of the bytes it copied
static void CopyContents(const v8::FunctionCallbackInfo<v8::Value>& args) {
  v8::Isolate* isolate = args.GetIsolate();
  const size_t size = args[1].As<v8::Uint32>()->Value();
  std::vector<char> dest(size);
  const size_t length =
      args[0].As<v8::ArrayBufferView>()->CopyContents(dest.data(), size);
  args.GetReturnValue().Set(
      node::Buffer::Copy(isolate, dest.data(), length).ToLocalChecked());
}

NODE_MODULE_INIT() {
  NODE_SET_METHOD(exports, "copyContents", CopyContents);
}
