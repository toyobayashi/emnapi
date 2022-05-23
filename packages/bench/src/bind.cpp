#include <emscripten.h>
#include <emscripten/bind.h>

extern "C" EMSCRIPTEN_KEEPALIVE void empty_function() {}

namespace {

emscripten::val EmptyFunction() {
  return emscripten::val::undefined();
}

emscripten::val ReturnParam(const emscripten::val& arg) {
  return arg;
}

}  // namespace

EMSCRIPTEN_BINDINGS(embindcpp) {
  emscripten::function("emptyFunction", EmptyFunction);
  emscripten::function("returnParam", ReturnParam);
}
