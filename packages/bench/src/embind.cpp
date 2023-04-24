#include <cstdint>
#include <string>
#include <emscripten.h>
#include <emscripten/bind.h>
#include "foo.h"

int counter = 0;

extern "C" {

void __attribute__((noinline)) EMSCRIPTEN_KEEPALIVE empty_function() {}

void __attribute__((noinline)) EMSCRIPTEN_KEEPALIVE increment_counter() {
  ++counter;
}

int32_t __attribute__((noinline)) EMSCRIPTEN_KEEPALIVE sum_i32(int32_t v1, int32_t v2, int32_t v3, int32_t v4, int32_t v5, int32_t v6, int32_t v7, int32_t v8, int32_t v9) {
  return v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9;
}

double __attribute__((noinline)) EMSCRIPTEN_KEEPALIVE sum_double(double v1, double v2, double v3, double v4, double v5, double v6, double v7, double v8, double v9) {
  return v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9;
}

int32_t __attribute__((noinline)) EMSCRIPTEN_KEEPALIVE returns_input_i32(int32_t i) {
  return i;
}

}

emscripten::val __attribute__((noinline)) EMSCRIPTEN_KEEPALIVE ReturnsInputI32(const emscripten::val& i) {
  return emscripten::val(i.as<int32_t>());
}

emscripten::val __attribute__((noinline)) ReturnsInputString(const emscripten::val& value) {
  return emscripten::val(value.as<std::string>());
}

emscripten::val __attribute__((noinline)) ReturnsInputObject(const emscripten::val& value) {
  return value;
}

void CallJavaScriptFunction(const emscripten::val& value) {
  value();
}

emscripten::val CreateTypedMemoryView() {
  static uint8_t buf[16384] = { 0 };
  return emscripten::val(emscripten::typed_memory_view(16384, buf));
}

emscripten::val ObjectGet(const emscripten::val& arg) {
  return arg["length"];
}

void ObjectSet(emscripten::val arg, const emscripten::val& key, const emscripten::val& value) {
  arg.set(key, value);
}

EMSCRIPTEN_BINDINGS(embindcpp) {
  emscripten::function("emptyFunction", empty_function);
  emscripten::function("incrementCounter", increment_counter);
  emscripten::function("sumI32", sum_i32);
  emscripten::function("sumDouble", sum_double);
  emscripten::function("returnsInputI32", returns_input_i32);
  emscripten::function("returnsInputString", ReturnsInputString);
  emscripten::function("returnsInputObject", ReturnsInputObject);
  emscripten::function("callJavaScriptFunction", CallJavaScriptFunction);
  emscripten::function("createTypedMemoryView", CreateTypedMemoryView);
  emscripten::function("objectGet", ObjectGet);
  emscripten::function("objectSet", ObjectSet);

  emscripten::class_<Foo>("Foo")
    .constructor<>()
    .function("incrClassCounter", &Foo::IncrClassCounter);
}
