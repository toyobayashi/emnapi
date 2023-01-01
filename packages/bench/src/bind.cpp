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

emscripten::val ConvertInteger(const emscripten::val& arg) {
  int param = arg.as<int>();
  return emscripten::val(param);
}

emscripten::val ConvertString(const emscripten::val& arg) {
  std::string param = arg.as<std::string>();
  return emscripten::val(param);
}

emscripten::val ObjectGet(const emscripten::val& arg) {
  return arg["length"];
}

emscripten::val ObjectSet(emscripten::val arg, emscripten::val key, emscripten::val value) {
  arg.set(key, value);
  return emscripten::val::undefined();
}

emscripten::val JsFib(const emscripten::val& arg) {
  int input = arg.as<int>();
  return emscripten::val(fib(input));
}

}  // namespace

EMSCRIPTEN_BINDINGS(embindcpp) {
  emscripten::function("emptyFunction", EmptyFunction);
  emscripten::function("returnParam", ReturnParam);
  emscripten::function("convertInteger", ConvertInteger);
  emscripten::function("convertString", ConvertString);
  emscripten::function("objectGet", ObjectGet);
  emscripten::function("objectSet", ObjectSet);
  emscripten::function("fib", JsFib);
}
