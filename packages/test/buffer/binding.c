#ifdef __wasm__
#include <emnapi.h>
#endif

#include <node_api.h>
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
  NAPI_ASSERT_RETURN_VOID(
      env, data != NULL && strcmp(data, theText) == 0, "invalid data");
  (void)finalize_hint;
  free(data);
  deleterCallCount++;
}

static void noopDeleter(napi_env env, void* data, void* finalize_hint) {
  NAPI_ASSERT_RETURN_VOID(
      env, data != NULL && strcmp(data, theText) == 0, "invalid data");
  (void)finalize_hint;
  deleterCallCount++;
}

static void malignDeleter(napi_env env, void* data, void* finalize_hint) {
  NAPI_ASSERT_RETURN_VOID(env, data != NULL && strcmp(data, theText) == 0, "invalid data");
  napi_ref finalizer_ref = (napi_ref)finalize_hint;
  napi_value js_finalizer;
  napi_value recv;
  NAPI_CALL_RETURN_VOID(env, napi_get_reference_value(env, finalizer_ref, &js_finalizer));
  NAPI_CALL_RETURN_VOID(env, napi_get_global(env, &recv));
  NAPI_CALL_RETURN_VOID(env, napi_call_function(env, recv, js_finalizer, 0, NULL, NULL));
  NAPI_CALL_RETURN_VOID(env, napi_delete_reference(env, finalizer_ref));
}

static napi_value newBuffer(napi_env env, napi_callback_info info) {
  napi_value theBuffer;
  char* theCopy;

  NAPI_CALL(env,
      napi_create_buffer(
          env, theTextSize, (void**)(&theCopy), &theBuffer));
  NAPI_ASSERT(env, theCopy, "Failed to copy static text for newBuffer");
  memcpy(theCopy, theText, theTextSize);
// #ifdef __EMSCRIPTEN__
//   emnapi_sync_memory(env, false, &theBuffer, 0, NAPI_AUTO_LENGTH);
// #endif

  return theBuffer;
}

static napi_value newExternalBuffer(napi_env env, napi_callback_info info) {
  napi_value theBuffer;
  char* theCopy = strdup(theText);
  NAPI_ASSERT(
      env, theCopy, "Failed to copy static text for newExternalBuffer");
  NAPI_CALL(env,
      napi_create_external_buffer(
          env, theTextSize, theCopy, deleteTheText,
          NULL /* finalize_hint */, &theBuffer));

  return theBuffer;
}

static napi_value getDeleterCallCount(napi_env env, napi_callback_info info) {
  napi_value callCount;
  NAPI_CALL(env, napi_create_int32(env, deleterCallCount, &callCount));
  return callCount;
}

static napi_value copyBuffer(napi_env env, napi_callback_info info) {
  napi_value theBuffer;
  NAPI_CALL(env, napi_create_buffer_copy(
      env, theTextSize, theText, NULL, &theBuffer));
  return theBuffer;
}

static napi_value bufferHasInstance(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));
  NAPI_ASSERT(env, argc == 1, "Wrong number of arguments");
  napi_value theBuffer = args[0];
  bool hasInstance;
  napi_valuetype theType;
  NAPI_CALL(env, napi_typeof(env, theBuffer, &theType));
  NAPI_ASSERT(env,
      theType == napi_object, "bufferHasInstance: instance is not an object");
  NAPI_CALL(env, napi_is_buffer(env, theBuffer, &hasInstance));
  NAPI_ASSERT(env, hasInstance, "bufferHasInstance: instance is not a buffer");
  napi_value returnValue;
  NAPI_CALL(env, napi_get_boolean(env, hasInstance, &returnValue));
  return returnValue;
}

static napi_value bufferInfo(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));
  NAPI_ASSERT(env, argc == 1, "Wrong number of arguments");
  napi_value theBuffer = args[0];
  char *bufferData;
  napi_value returnValue;
  size_t bufferLength;
  NAPI_CALL(env,
      napi_get_buffer_info(
          env, theBuffer, (void**)(&bufferData), &bufferLength));
  NAPI_CALL(env, napi_get_boolean(env,
      !strcmp(bufferData, theText) && bufferLength == sizeof(theText),
      &returnValue));
  return returnValue;
}

static napi_value staticBuffer(napi_env env, napi_callback_info info) {
  napi_value theBuffer;
  NAPI_CALL(env,
      napi_create_external_buffer(
          env, sizeof(theText), (void*)theText, noopDeleter,
          NULL /* finalize_hint */, &theBuffer));
  return theBuffer;
}

static napi_value malignFinalizerBuffer(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));
  NAPI_ASSERT(env, argc == 1, "Wrong number of arguments");
  napi_value finalizer = args[0];
  napi_valuetype finalizer_valuetype;
  NAPI_CALL(env, napi_typeof(env, finalizer, &finalizer_valuetype));
  NAPI_ASSERT(env, finalizer_valuetype == napi_function, "Wrong type of first argument");
  napi_ref finalizer_ref;
  NAPI_CALL(env, napi_create_reference(env, finalizer, 1, &finalizer_ref));

  napi_value theBuffer;
  NAPI_CALL(
      env,
      napi_create_external_buffer(env,
                                  sizeof(theText),
                                  (void*)theText,
                                  malignDeleter,
                                  finalizer_ref,  // finalize_hint
                                  &theBuffer));
  return theBuffer;
}

static napi_value getTypedArrayData(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));
  NAPI_ASSERT(env, argc == 1, "Wrong number of arguments");
  void* data;
  size_t size;
  napi_value ret;
  NAPI_CALL(env, napi_get_typedarray_info(env, args[0], NULL, &size, &data, NULL, NULL));
  NAPI_CALL(env, napi_create_array_with_length(env, size, &ret));
  size_t i;
  napi_value el;
  for (i = 0; i < size; ++i) {
    NAPI_CALL(env, napi_create_uint32(env, *((uint8_t*)data + i), &el));
    NAPI_CALL(env, napi_set_element(env, ret, i, el));
  }
  return ret;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_value theValue;

  NAPI_CALL(env,
      napi_create_string_utf8(env, theText, sizeof(theText), &theValue));
  NAPI_CALL(env,
      napi_set_named_property(env, exports, "theText", theValue));

  napi_property_descriptor methods[] = {
    DECLARE_NAPI_PROPERTY("newBuffer", newBuffer),
    DECLARE_NAPI_PROPERTY("newExternalBuffer", newExternalBuffer),
    DECLARE_NAPI_PROPERTY("getDeleterCallCount", getDeleterCallCount),
    DECLARE_NAPI_PROPERTY("copyBuffer", copyBuffer),
    DECLARE_NAPI_PROPERTY("bufferHasInstance", bufferHasInstance),
    DECLARE_NAPI_PROPERTY("bufferInfo", bufferInfo),
    DECLARE_NAPI_PROPERTY("staticBuffer", staticBuffer),
    DECLARE_NAPI_PROPERTY("malignFinalizerBuffer", malignFinalizerBuffer),
    DECLARE_NAPI_PROPERTY("getTypedArrayData", getTypedArrayData),
  };

  NAPI_CALL(env, napi_define_properties(
      env, exports, sizeof(methods) / sizeof(methods[0]), methods));

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
