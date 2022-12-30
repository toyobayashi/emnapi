#include <emscripten.h>
#include <emscripten/bind.h>
#include "fib.h"

extern "C" EMSCRIPTEN_KEEPALIVE void empty_function() {}

namespace {

emscripten::val EmptyFunction() {
  return emscripten::val::undefined();
}

emscripten::val ReturnParam(const emscripten::val& arg) {
  return arg;
}

emscripten::val JsFib(const emscripten::val& arg) {
  int input = arg.as<int>();
  return emscripten::val(fib(input));
}

}  // namespace

EMSCRIPTEN_BINDINGS(embindcpp) {
  emscripten::function("emptyFunction", EmptyFunction);
  emscripten::function("returnParam", ReturnParam);
  emscripten::function("fib", JsFib);
}
