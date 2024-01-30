#include <node_api.h>

#ifdef __wasm__
#include <emnapi.h>
#endif

#include "../common.h"

void* malloc(size_t size);
void free(void* p);
void* memcpy(void* dst, const void* src, size_t n);

#if !defined(__wasm__) || (defined(__EMSCRIPTEN__) || defined(__wasi__))
#include <string.h>
#else
int strcmp(const char *l, const char *r) {
	for (; *l==*r && *l; l++, r++);
	return *(unsigned char *)l - *(unsigned char *)r;
}

size_t strlen(const char *s) {
	const char *a = s;
	for (; *s; s++);
	return s-a;
}

char *strdup(const char *s) {
	size_t l = strlen(s);
	char *d = malloc(l+1);
	if (!d) return NULL;
	return memcpy(d, s, l+1);
}
#endif

static const char theText[] =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

const unsigned int theTextSize = sizeof(theText);

static int deleterCallCount = 0;
static void deleteTheText(napi_env env, void* data, void* finalize_hint) {
  NODE_API_ASSERT_RETURN_VOID(
      env, data != NULL && strcmp(data, theText) == 0, "invalid data");
  (void)finalize_hint;
  free(data);
  deleterCallCount++;
}

static void noopDeleter(napi_env env, void* data, void* finalize_hint) {
  NODE_API_ASSERT_RETURN_VOID(
      env, data != NULL && strcmp(data, theText) == 0, "invalid data");
  (void)finalize_hint;
  deleterCallCount++;
}

static napi_value newBuffer(napi_env env, napi_callback_info info) {
  napi_value theBuffer;
  char* theCopy;

  NODE_API_CALL(env,
      napi_create_buffer(
          env, theTextSize, (void**)(&theCopy), &theBuffer));
  NODE_API_ASSERT(env, theCopy, "Failed to copy static text for newBuffer");
  memcpy(theCopy, theText, theTextSize);
// #ifdef __EMSCRIPTEN__
//   emnapi_sync_memory(env, false, &theBuffer, 0, NAPI_AUTO_LENGTH);
// #endif

  return theBuffer;
}

static napi_value newExternalBuffer(napi_env env, napi_callback_info info) {
  napi_value theBuffer;
  char* theCopy = strdup(theText);
  NODE_API_ASSERT(
      env, theCopy, "Failed to copy static text for newExternalBuffer");
  NODE_API_CALL(env,
      napi_create_external_buffer(
          env, theTextSize, theCopy, deleteTheText,
          NULL /* finalize_hint */, &theBuffer));

  return theBuffer;
}

static napi_value getDeleterCallCount(napi_env env, napi_callback_info info) {
  napi_value callCount;
  NODE_API_CALL(env, napi_create_int32(env, deleterCallCount, &callCount));
  return callCount;
}

static napi_value copyBuffer(napi_env env, napi_callback_info info) {
  napi_value theBuffer;
  NODE_API_CALL(env, napi_create_buffer_copy(
      env, theTextSize, theText, NULL, &theBuffer));
  return theBuffer;
}

static napi_value bufferHasInstance(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));
  NODE_API_ASSERT(env, argc == 1, "Wrong number of arguments");
  napi_value theBuffer = args[0];
  bool hasInstance;
  napi_valuetype theType;
  NODE_API_CALL(env, napi_typeof(env, theBuffer, &theType));
  NODE_API_ASSERT(env,
      theType == napi_object, "bufferHasInstance: instance is not an object");
  NODE_API_CALL(env, napi_is_buffer(env, theBuffer, &hasInstance));
  NODE_API_ASSERT(env, hasInstance, "bufferHasInstance: instance is not a buffer");
  napi_value returnValue;
  NODE_API_CALL(env, napi_get_boolean(env, hasInstance, &returnValue));
  return returnValue;
}

static napi_value bufferInfo(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));
  NODE_API_ASSERT(env, argc == 1, "Wrong number of arguments");
  napi_value theBuffer = args[0];
  char *bufferData;
  napi_value returnValue;
  size_t bufferLength;
  NODE_API_CALL(env,
      napi_get_buffer_info(
          env, theBuffer, (void**)(&bufferData), &bufferLength));
  NODE_API_CALL(env, napi_get_boolean(env,
      !strcmp(bufferData, theText) && bufferLength == sizeof(theText),
      &returnValue));
  return returnValue;
}

static napi_value staticBuffer(napi_env env, napi_callback_info info) {
  napi_value theBuffer;
  NODE_API_CALL(env,
      napi_create_external_buffer(
          env, sizeof(theText), (void*)theText, noopDeleter,
          NULL /* finalize_hint */, &theBuffer));
  return theBuffer;
}

static napi_value invalidObjectAsBuffer(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));
  NODE_API_ASSERT(env, argc == 1, "Wrong number of arguments");

  napi_value notTheBuffer = args[0];
  napi_status status = napi_get_buffer_info(env, notTheBuffer, NULL, NULL);
  NODE_API_ASSERT(env, status == napi_invalid_arg,
    "napi_get_buffer_info: should fail with napi_invalid_arg when passed non buffer");

  return notTheBuffer;
}

static napi_value getMemoryDataAsArray(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));
  NODE_API_ASSERT(env, argc == 1, "Wrong number of arguments");
  void* data;
  size_t size;
  napi_value ret;
  bool is_arraybuffer, is_typedarray, is_dataview, is_buffer;
  NODE_API_CALL(env, napi_is_arraybuffer(env, args[0], &is_arraybuffer));
  NODE_API_CALL(env, napi_is_typedarray(env, args[0], &is_typedarray));
  NODE_API_CALL(env, napi_is_dataview(env, args[0], &is_dataview));
  NODE_API_CALL(env, napi_is_buffer(env, args[0], &is_buffer));
  if (is_arraybuffer) {
    NODE_API_CALL(env, napi_get_arraybuffer_info(env, args[0], &data, &size));
  } else if (is_buffer) {
    NODE_API_CALL(env, napi_get_buffer_info(env, args[0], &data, &size));
  } else if (is_typedarray) {
    NODE_API_CALL(env, napi_get_typedarray_info(env, args[0], NULL, &size, &data, NULL, NULL));
  } else if (is_dataview) {
    NODE_API_CALL(env, napi_get_dataview_info(env, args[0], &size, &data, NULL, NULL));
  } else {
    NODE_API_ASSERT(env, 0, "Invalid argument type");
  }
  NODE_API_CALL(env, napi_create_array_with_length(env, size, &ret));
  size_t i;
  napi_value el;
  for (i = 0; i < size; ++i) {
    NODE_API_CALL(env, napi_create_uint32(env, *((uint8_t*)data + i), &el));
    NODE_API_CALL(env, napi_set_element(env, ret, i, el));
  }
  return ret;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_value theValue;

  NODE_API_CALL(env,
      napi_create_string_utf8(env, theText, sizeof(theText), &theValue));
  NODE_API_CALL(env,
      napi_set_named_property(env, exports, "theText", theValue));

  napi_property_descriptor methods[] = {
    DECLARE_NODE_API_PROPERTY("newBuffer", newBuffer),
    DECLARE_NODE_API_PROPERTY("newExternalBuffer", newExternalBuffer),
    DECLARE_NODE_API_PROPERTY("getDeleterCallCount", getDeleterCallCount),
    DECLARE_NODE_API_PROPERTY("copyBuffer", copyBuffer),
    DECLARE_NODE_API_PROPERTY("bufferHasInstance", bufferHasInstance),
    DECLARE_NODE_API_PROPERTY("bufferInfo", bufferInfo),
    DECLARE_NODE_API_PROPERTY("staticBuffer", staticBuffer),
    DECLARE_NODE_API_PROPERTY("invalidObjectAsBuffer", invalidObjectAsBuffer),
    DECLARE_NODE_API_PROPERTY("getMemoryDataAsArray", getMemoryDataAsArray),
  };

  NODE_API_CALL(env, napi_define_properties(
      env, exports, sizeof(methods) / sizeof(methods[0]), methods));

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
