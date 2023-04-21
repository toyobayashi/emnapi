#include <limits.h>  // INT_MAX
// #include <string.h>
// #include <stdlib.h>
#include <js_native_api.h>
#include "../common.h"
#include "test_null.h"

void* memset(void* dst, int c, size_t n);
void* malloc(size_t size);
void free(void* p);

static napi_value TestLatin1(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NAPI_ASSERT(env, argc >= 1, "Wrong number of arguments");

  napi_valuetype valuetype;
  NAPI_CALL(env, napi_typeof(env, args[0], &valuetype));

  NAPI_ASSERT(env, valuetype == napi_string,
      "Wrong type of argment. Expects a string.");

  char buffer[128];
  size_t buffer_size = 128;
  size_t copied;

  NAPI_CALL(env,
      napi_get_value_string_latin1(env, args[0], buffer, buffer_size, &copied));

  napi_value output;
  NAPI_CALL(env, napi_create_string_latin1(env, buffer, copied, &output));

  return output;
}

static napi_value TestUtf8(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NAPI_ASSERT(env, argc >= 1, "Wrong number of arguments");

  napi_valuetype valuetype;
  NAPI_CALL(env, napi_typeof(env, args[0], &valuetype));

  NAPI_ASSERT(env, valuetype == napi_string,
      "Wrong type of argment. Expects a string.");

  char buffer[128];
  size_t buffer_size = 128;
  size_t copied;

  NAPI_CALL(env,
      napi_get_value_string_utf8(env, args[0], buffer, buffer_size, &copied));

  napi_value output;
  NAPI_CALL(env, napi_create_string_utf8(env, buffer, copied, &output));

  return output;
}

static napi_value TestUtf16(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NAPI_ASSERT(env, argc >= 1, "Wrong number of arguments");

  napi_valuetype valuetype;
  NAPI_CALL(env, napi_typeof(env, args[0], &valuetype));

  NAPI_ASSERT(env, valuetype == napi_string,
      "Wrong type of argment. Expects a string.");

  char16_t buffer[128];
  size_t buffer_size = 128;
  size_t copied;

  NAPI_CALL(env,
      napi_get_value_string_utf16(env, args[0], buffer, buffer_size, &copied));

  napi_value output;
  NAPI_CALL(env, napi_create_string_utf16(env, buffer, copied, &output));

  return output;
}

static napi_value
TestLatin1Insufficient(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NAPI_ASSERT(env, argc >= 1, "Wrong number of arguments");

  napi_valuetype valuetype;
  NAPI_CALL(env, napi_typeof(env, args[0], &valuetype));

  NAPI_ASSERT(env, valuetype == napi_string,
      "Wrong type of argment. Expects a string.");

  char buffer[4];
  size_t buffer_size = 4;
  size_t copied;

  NAPI_CALL(env,
      napi_get_value_string_latin1(env, args[0], buffer, buffer_size, &copied));

  napi_value output;
  NAPI_CALL(env, napi_create_string_latin1(env, buffer, copied, &output));

  return output;
}

static napi_value TestUtf8Insufficient(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NAPI_ASSERT(env, argc >= 1, "Wrong number of arguments");

  napi_valuetype valuetype;
  NAPI_CALL(env, napi_typeof(env, args[0], &valuetype));

  NAPI_ASSERT(env, valuetype == napi_string,
      "Wrong type of argment. Expects a string.");

  char buffer[4];
  size_t buffer_size = 4;
  size_t copied;

  NAPI_CALL(env,
      napi_get_value_string_utf8(env, args[0], buffer, buffer_size, &copied));

  napi_value output;
  NAPI_CALL(env, napi_create_string_utf8(env, buffer, copied, &output));

  return output;
}

static napi_value TestUtf16Insufficient(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NAPI_ASSERT(env, argc >= 1, "Wrong number of arguments");

  napi_valuetype valuetype;
  NAPI_CALL(env, napi_typeof(env, args[0], &valuetype));

  NAPI_ASSERT(env, valuetype == napi_string,
      "Wrong type of argment. Expects a string.");

  char16_t buffer[4];
  size_t buffer_size = 4;
  size_t copied;

  NAPI_CALL(env,
      napi_get_value_string_utf16(env, args[0], buffer, buffer_size, &copied));

  napi_value output;
  NAPI_CALL(env, napi_create_string_utf16(env, buffer, copied, &output));

  return output;
}

static napi_value Utf16Length(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NAPI_ASSERT(env, argc >= 1, "Wrong number of arguments");

  napi_valuetype valuetype;
  NAPI_CALL(env, napi_typeof(env, args[0], &valuetype));

  NAPI_ASSERT(env, valuetype == napi_string,
      "Wrong type of argment. Expects a string.");

  size_t length;
  NAPI_CALL(env, napi_get_value_string_utf16(env, args[0], NULL, 0, &length));

  napi_value output;
  NAPI_CALL(env, napi_create_uint32(env, (uint32_t)length, &output));

  return output;
}

static napi_value Utf8Length(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NAPI_ASSERT(env, argc >= 1, "Wrong number of arguments");

  napi_valuetype valuetype;
  NAPI_CALL(env, napi_typeof(env, args[0], &valuetype));

  NAPI_ASSERT(env, valuetype == napi_string,
      "Wrong type of argment. Expects a string.");

  size_t length;
  NAPI_CALL(env, napi_get_value_string_utf8(env, args[0], NULL, 0, &length));

  napi_value output;
  NAPI_CALL(env, napi_create_uint32(env, (uint32_t)length, &output));

  return output;
}

static napi_value TestLargeUtf8(napi_env env, napi_callback_info info) {
  napi_value output;
  if (SIZE_MAX > INT_MAX) {
    NAPI_CALL(env, napi_create_string_utf8(env, "", ((size_t)INT_MAX) + 1, &output));
  } else {
    // just throw the expected error as there is nothing to test
    // in this case since we can't overflow
    NAPI_CALL(env, napi_throw_error(env, NULL, "Invalid argument"));
  }

  return output;
}

static napi_value TestLargeLatin1(napi_env env, napi_callback_info info) {
  napi_value output;
  if (SIZE_MAX > INT_MAX) {
    NAPI_CALL(env, napi_create_string_latin1(env, "", ((size_t)INT_MAX) + 1, &output));
  } else {
    // just throw the expected error as there is nothing to test
    // in this case since we can't overflow
    NAPI_CALL(env, napi_throw_error(env, NULL, "Invalid argument"));
  }

  return output;
}

static napi_value TestLargeUtf16(napi_env env, napi_callback_info info) {
  napi_value output;
  if (SIZE_MAX > INT_MAX) {
    NAPI_CALL(env, napi_create_string_utf16(env,
                                            ((const char16_t*)""),
                                            ((size_t)INT_MAX) + 1, &output));
  } else {
    // just throw the expected error as there is nothing to test
    // in this case since we can't overflow
    NAPI_CALL(env, napi_throw_error(env, NULL, "Invalid argument"));
  }

  return output;
}

static napi_value TestMemoryCorruption(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NAPI_ASSERT(env, argc == 1, "Wrong number of arguments");

  char buf[10] = { 0 };
  NAPI_CALL(env, napi_get_value_string_utf8(env, args[0], buf, 0, NULL));

  char zero[10] = { 0 };
  for (int i = 0; i < sizeof(buf); ++i) {
    if (buf[i] != zero[i]) {
      NAPI_CALL(env, napi_throw_error(env, NULL, "Buffer overwritten"));
      return NULL;
    }
  }
  // if (memcmp(buf, zero, sizeof(buf)) != 0) {
  //   NAPI_CALL(env, napi_throw_error(env, NULL, "Buffer overwritten"));
  // }

  return NULL;
}

static napi_value TestUtf8Large(napi_env env, napi_callback_info info) {
  size_t size = 256 * 1024 * 1024;
  char* buffer = (char*)malloc(size);
  memset(buffer, 97, size);

  napi_value output;
  NAPI_CALL(env, napi_create_string_utf8(env, buffer, size, &output));
  free(buffer);

  return output;
}

static napi_value TestUtf16Large(napi_env env, napi_callback_info info) {
  size_t size = 64 * 1024 * 1024;
  uint16_t* buffer = (uint16_t*)malloc(size * sizeof(uint16_t));
  memset(buffer, 97, size * sizeof(uint16_t));

  napi_value output;
  NAPI_CALL(env, napi_create_string_utf16(env, buffer, size, &output));
  free(buffer);

  return output;
}

EXTERN_C_START
napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor properties[] = {
    DECLARE_NAPI_PROPERTY("TestLatin1", TestLatin1),
    DECLARE_NAPI_PROPERTY("TestLatin1Insufficient", TestLatin1Insufficient),
    DECLARE_NAPI_PROPERTY("TestUtf8", TestUtf8),
    DECLARE_NAPI_PROPERTY("TestUtf8Insufficient", TestUtf8Insufficient),
    DECLARE_NAPI_PROPERTY("TestUtf16", TestUtf16),
    DECLARE_NAPI_PROPERTY("TestUtf16Insufficient", TestUtf16Insufficient),
    DECLARE_NAPI_PROPERTY("Utf16Length", Utf16Length),
    DECLARE_NAPI_PROPERTY("Utf8Length", Utf8Length),
    DECLARE_NAPI_PROPERTY("TestLargeUtf8", TestLargeUtf8),
    DECLARE_NAPI_PROPERTY("TestLargeLatin1", TestLargeLatin1),
    DECLARE_NAPI_PROPERTY("TestLargeUtf16", TestLargeUtf16),
    DECLARE_NAPI_PROPERTY("TestMemoryCorruption", TestMemoryCorruption),
    DECLARE_NAPI_PROPERTY("TestUtf8Large", TestUtf8Large),
    DECLARE_NAPI_PROPERTY("TestUtf16Large", TestUtf16Large),
  };

  init_test_null(env, exports);

  NAPI_CALL(env, napi_define_properties(
      env, exports, sizeof(properties) / sizeof(*properties), properties));

  return exports;
}
EXTERN_C_END
