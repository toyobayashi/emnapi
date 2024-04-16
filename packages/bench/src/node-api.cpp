#include <stdlib.h>
#include <node_api.h>
#ifdef __wasm__
#include <emnapi.h>
#endif
#include "../../test/common.h"
#include "foo.h"

int counter = 0;

napi_value EmptyFunction(napi_env env, napi_callback_info info) {
  return nullptr;
}

napi_value IncrementCounter(napi_env env, napi_callback_info info) {
  ++counter;
  return nullptr;
}

napi_value SumI32(napi_env env, napi_callback_info info) {
  size_t argc = 9;
  napi_value argv[9], ret;
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  int32_t v1, v2, v3, v4, v5, v6, v7, v8, v9;
  napi_get_value_int32(env, argv[0], &v1);
  napi_get_value_int32(env, argv[1], &v2);
  napi_get_value_int32(env, argv[2], &v3);
  napi_get_value_int32(env, argv[3], &v4);
  napi_get_value_int32(env, argv[4], &v5);
  napi_get_value_int32(env, argv[5], &v6);
  napi_get_value_int32(env, argv[6], &v7);
  napi_get_value_int32(env, argv[7], &v8);
  napi_get_value_int32(env, argv[8], &v9);
  int32_t result = v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9;
  napi_create_int32(env, result, &ret);
  return ret;
}

napi_value SumDouble(napi_env env, napi_callback_info info) {
  size_t argc = 9;
  napi_value argv[9], ret;
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  double v1, v2, v3, v4, v5, v6, v7, v8, v9;
  napi_get_value_double(env, argv[0], &v1);
  napi_get_value_double(env, argv[1], &v2);
  napi_get_value_double(env, argv[2], &v3);
  napi_get_value_double(env, argv[3], &v4);
  napi_get_value_double(env, argv[4], &v5);
  napi_get_value_double(env, argv[5], &v6);
  napi_get_value_double(env, argv[6], &v7);
  napi_get_value_double(env, argv[7], &v8);
  napi_get_value_double(env, argv[8], &v9);
  double result = v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9;
  napi_create_double(env, result, &ret);
  return ret;
}

napi_value ReturnsInputI32(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv, ret;
  napi_get_cb_info(env, info, &argc, &argv, nullptr, nullptr);
  int32_t input = 0;
  napi_get_value_int32(env, argv, &input);
  napi_create_int32(env, input, &ret);
  return argv;
}

napi_value ReturnsInputString(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv, ret;
  napi_get_cb_info(env, info, &argc, &argv, nullptr, nullptr);
  size_t len = 0;
  napi_get_value_string_utf8(env, argv, nullptr, 0, &len);
  char* buf = (char*) malloc(len);
  napi_get_value_string_utf8(env, argv, buf, len, &len);
  napi_create_string_utf8(env, buf, len, &ret);
  free(buf);
  return ret;
}

napi_value ReturnsInputObject(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv;
  napi_get_cb_info(env, info, &argc, &argv, nullptr, nullptr);
  return argv;
}

napi_value CallJavaScriptFunction(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv;
  napi_get_cb_info(env, info, &argc, &argv, nullptr, nullptr);
  napi_call_function(env, nullptr, argv, 0, nullptr, nullptr);
  return nullptr;
}

napi_value CreateTypedMemoryView(napi_env env, napi_callback_info info) {
  static uint8_t buf[16384] = { 0 };
  napi_value ret;
#ifdef __wasm__
  emnapi_create_memory_view(
    env,
    emnapi_uint8_array,
    buf,
    16384,
    nullptr,
    nullptr,
    &ret
  );
#else
  napi_create_external_arraybuffer(env, buf, 16384, nullptr, nullptr, &ret);
  napi_create_typedarray(env, napi_uint8_array, 16384, ret, 0, &ret);
#endif
  return ret;
}

napi_value ObjectGet(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv, ret;
  napi_get_cb_info(env, info, &argc, &argv, nullptr, nullptr);
  napi_get_named_property(env, argv, "length", &ret);
  return ret;
}

napi_value ObjectSet(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value argv[3];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  napi_set_property(env, argv[0], argv[1], argv[2]);
  return nullptr;
}

napi_value FooConstructor(napi_env env, napi_callback_info info) {
  napi_value this_arg;
  napi_get_cb_info(env, info, nullptr, nullptr, &this_arg, nullptr);
  Foo* foo = new Foo();
  napi_wrap(env, this_arg, foo, nullptr, nullptr, nullptr);
  return this_arg;
}

napi_value FooIncrClassCounter(napi_env env, napi_callback_info info) {
  napi_value this_arg;
  napi_get_cb_info(env, info, nullptr, nullptr, &this_arg, nullptr);

  Foo* instance = nullptr;
  napi_unwrap(env, this_arg, reinterpret_cast<void**>(&instance));

  instance->IncrClassCounter();
  return nullptr;
}

napi_value FooDelete(napi_env env, napi_callback_info info) {
  napi_value this_arg;
  napi_get_cb_info(env, info, nullptr, nullptr, &this_arg, nullptr);

  Foo* instance = nullptr;
  napi_status ok = napi_remove_wrap(env, this_arg, reinterpret_cast<void**>(&instance));
  if (ok == napi_ok) {
    delete instance;
  }

  return nullptr;
}

void InitFoo(napi_env env, napi_value exports) {
  napi_value foo;
  napi_property_attributes instance_method_attributes = napi_default_method;
  napi_property_descriptor properties[2] = {
    {
      "incrClassCounter", nullptr,
      FooIncrClassCounter, nullptr, nullptr, nullptr,
      instance_method_attributes, nullptr
    },
    {
      "delete", nullptr,
      FooDelete, nullptr, nullptr, nullptr,
      instance_method_attributes, nullptr
    }
  };
  size_t property_size = sizeof(properties) / sizeof(properties[0]);
  napi_define_class(env, "Foo", 3, FooConstructor, nullptr, property_size, properties, &foo);
  napi_set_named_property(env, exports, "Foo", foo);
}

#define EXPORT_FUNCTION(env, exports, name, f) \
  do { \
    napi_value f##_fn; \
    NODE_API_CALL((env), napi_create_function((env), NULL, NAPI_AUTO_LENGTH, (f), NULL, &(f##_fn))); \
    NODE_API_CALL((env), napi_set_named_property((env), (exports), (name), (f##_fn))); \
  } while (0)

NAPI_MODULE_INIT() {
  EXPORT_FUNCTION(env, exports, "emptyFunction", EmptyFunction);
  EXPORT_FUNCTION(env, exports, "incrementCounter", IncrementCounter);
  EXPORT_FUNCTION(env, exports, "sumI32", SumI32);
  EXPORT_FUNCTION(env, exports, "sumDouble", SumDouble);
  EXPORT_FUNCTION(env, exports, "returnsInputI32", ReturnsInputI32);
  EXPORT_FUNCTION(env, exports, "returnsInputString", ReturnsInputString);
  EXPORT_FUNCTION(env, exports, "returnsInputObject", ReturnsInputObject);
  EXPORT_FUNCTION(env, exports, "callJavaScriptFunction", CallJavaScriptFunction);
  EXPORT_FUNCTION(env, exports, "createTypedMemoryView", CreateTypedMemoryView);
  EXPORT_FUNCTION(env, exports, "objectGet", ObjectGet);
  EXPORT_FUNCTION(env, exports, "objectSet", ObjectSet);

  InitFoo(env, exports);

  return exports;
}
