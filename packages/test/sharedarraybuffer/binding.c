#define NAPI_EXPERIMENTAL
#define NODE_API_EXPERIMENTAL_NO_WARNING
#include <js_native_api.h>
#include "../common.h"
#include "../entry_point.h"

#if defined(EMNAPI_SHAREDARRAYBUFFER_MT)
#include <pthread.h>
#endif

#ifdef __wasm__
#include "emnapi.h"
#endif

static int deleterCallCount = 0;

static char externalSharedArrayBufferData[1];

static void freeExternalSharedArrayBuffer(void* data, void* hint) {
  (void)hint;
  NODE_API_BASIC_ASSERT_RETURN_VOID(
      data == (void*)externalSharedArrayBufferData,
      "SharedArrayBuffer points to wrong data");
  deleterCallCount++;
}

static napi_value newExternalSharedArrayBuffer(napi_env env,
                                               napi_callback_info info) {
  napi_value sab;
  NODE_API_CALL(
      env,
      node_api_create_external_sharedarraybuffer(env,
                                                 externalSharedArrayBufferData,
                                                 1,
                                                 freeExternalSharedArrayBuffer,
                                                 NULL,
                                                 &sab));
  return sab;
}

static napi_value getDeleterCallCount(napi_env env, napi_callback_info info) {
  napi_value callCount;
  NODE_API_CALL(env, napi_create_int32(env, deleterCallCount, &callCount));
  return callCount;
}

#if defined(EMNAPI_SHAREDARRAYBUFFER_MT)
typedef struct {
  void* handle;
  int32_t refcountAfterAcquire;
  int32_t refcountAfterRelease;
} ExternalSharedArrayBufferThreadContext;

static int32_t loadExternalSharedArrayBufferRefcount(void* handle) {
  return __atomic_load_n((int32_t*)handle, __ATOMIC_SEQ_CST);
}

static void* acquireAndReleaseExternalSharedArrayBufferThread(void* data) {
  ExternalSharedArrayBufferThreadContext* context =
      (ExternalSharedArrayBufferThreadContext*)data;
  emnapi_acquire_external_sharedarraybuffer(context->handle);
  context->refcountAfterAcquire =
      loadExternalSharedArrayBufferRefcount(context->handle);
  emnapi_release_external_sharedarraybuffer(context->handle);
  context->refcountAfterRelease =
      loadExternalSharedArrayBufferRefcount(context->handle);
  return NULL;
}

static napi_value acquireAndReleaseExternalSharedArrayBufferInThread(
    napi_env env,
    napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  int64_t rawHandle;
  pthread_t thread;
  ExternalSharedArrayBufferThreadContext context;
  napi_value result;
  napi_value refcountAfterAcquire;
  napi_value refcountAfterRelease;

  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));
  NODE_API_ASSERT(env, argc >= 1, "Wrong number of arguments");

  NODE_API_CALL(env, napi_get_value_int64(env, args[0], &rawHandle));
  context.handle = (void*)(uintptr_t)rawHandle;
  NODE_API_ASSERT(env, context.handle != NULL, "handle must not be null");

  context.refcountAfterAcquire = 0;
  context.refcountAfterRelease = 0;

  NODE_API_ASSERT(env,
                  pthread_create(&thread,
                                 NULL,
                                 acquireAndReleaseExternalSharedArrayBufferThread,
                                 &context) == 0,
                  "Thread creation failed");
  NODE_API_ASSERT(env, pthread_join(thread, NULL) == 0, "Thread join failed");

  NODE_API_CALL(env, napi_create_object(env, &result));
  NODE_API_CALL(env, napi_create_int32(
                         env, context.refcountAfterAcquire, &refcountAfterAcquire));
  NODE_API_CALL(env, napi_create_int32(
                         env, context.refcountAfterRelease, &refcountAfterRelease));
  NODE_API_CALL(env,
                napi_set_named_property(env,
                                        result,
                                        "refcountAfterAcquire",
                                        refcountAfterAcquire));
  NODE_API_CALL(env,
                napi_set_named_property(env,
                                        result,
                                        "refcountAfterRelease",
                                        refcountAfterRelease));
  return result;
}
#endif

#ifdef __wasm__
static napi_value newExternalSharedArrayBufferWithHandle(napi_env env,
                                                         napi_callback_info info) {
  napi_value sab;
  NODE_API_CALL(
      env,
      node_api_create_external_sharedarraybuffer(env,
                                                 externalSharedArrayBufferData,
                                                 1,
                                                 freeExternalSharedArrayBuffer,
                                                 NULL,
                                                 &sab));
  void* handle = NULL;
  NODE_API_CALL(env,
                emnapi_get_external_sharedarraybuffer_handle(env, sab, &handle));

  napi_value result;
  NODE_API_CALL(env, napi_create_object(env, &result));

  NODE_API_CALL(env, napi_set_named_property(env, result, "sab", sab));

  napi_value handleValue;
  NODE_API_CALL(env, napi_create_int64(env, (int64_t)(uintptr_t)handle, &handleValue));
  NODE_API_CALL(env, napi_set_named_property(env, result, "handle", handleValue));

  return result;
}
#endif

static napi_value TestIsSharedArrayBuffer(napi_env env,
                                          napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NODE_API_ASSERT(env, argc >= 1, "Wrong number of arguments");

  bool is_sharedarraybuffer;
  NODE_API_CALL(
      env, node_api_is_sharedarraybuffer(env, args[0], &is_sharedarraybuffer));

  napi_value ret;
  NODE_API_CALL(env, napi_get_boolean(env, is_sharedarraybuffer, &ret));

  return ret;
}

static napi_value TestCreateSharedArrayBuffer(napi_env env,
                                              napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NODE_API_ASSERT(env, argc >= 1, "Wrong number of arguments");

  napi_valuetype valuetype0;
  NODE_API_CALL(env, napi_typeof(env, args[0], &valuetype0));

  NODE_API_ASSERT(
      env,
      valuetype0 == napi_number,
      "Wrong type of arguments. Expects a number as first argument.");

  int32_t byte_length;
  NODE_API_CALL(env, napi_get_value_int32(env, args[0], &byte_length));

  NODE_API_ASSERT(env,
                  byte_length >= 0,
                  "Invalid byte length. Expects a non-negative integer.");

  napi_value ret;
  void* data;
  NODE_API_CALL(
      env, node_api_create_sharedarraybuffer(env, byte_length, &data, &ret));

  return ret;
}

static napi_value TestGetSharedArrayBufferInfo(napi_env env,
                                               napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NODE_API_ASSERT(env, argc >= 1, "Wrong number of arguments");

  void* data;
  size_t byte_length;
  NODE_API_CALL(env,
                napi_get_arraybuffer_info(env, args[0], &data, &byte_length));

  napi_value ret;
  NODE_API_CALL(env, napi_create_uint32(env, byte_length, &ret));

  return ret;
}

static void WriteTestDataToBuffer(void* data, size_t byte_length) {
  if (byte_length > 0 && data != NULL) {
    uint8_t* bytes = (uint8_t*)data;
    for (size_t i = 0; i < byte_length; i++) {
      bytes[i] = i % 256;
    }
  }
}

static napi_value TestSharedArrayBufferData(napi_env env,
                                            napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NODE_API_CALL(env, napi_get_cb_info(env, info, &argc, args, NULL, NULL));

  NODE_API_ASSERT(env, argc >= 1, "Wrong number of arguments");

  void* data;
  size_t byte_length;
  NODE_API_CALL(env,
                napi_get_arraybuffer_info(env, args[0], &data, &byte_length));

  WriteTestDataToBuffer(data, byte_length);
#ifdef __wasm__
  emnapi_sync_memory(env, false, &args[0], 0, NAPI_AUTO_LENGTH);
#endif

  // Return the same data pointer validity
  bool data_valid = (data != NULL) && (byte_length > 0);

  napi_value ret;
  NODE_API_CALL(env, napi_get_boolean(env, data_valid, &ret));

  return ret;
}

EXTERN_C_START
napi_value Init(napi_env env, napi_value exports) {
  napi_property_descriptor descriptors[] = {
      DECLARE_NODE_API_PROPERTY("TestIsSharedArrayBuffer",
                                TestIsSharedArrayBuffer),
      DECLARE_NODE_API_PROPERTY("TestCreateSharedArrayBuffer",
                                TestCreateSharedArrayBuffer),
      DECLARE_NODE_API_PROPERTY("TestGetSharedArrayBufferInfo",
                                TestGetSharedArrayBufferInfo),
      DECLARE_NODE_API_PROPERTY("TestSharedArrayBufferData",
                                TestSharedArrayBufferData),
      DECLARE_NODE_API_PROPERTY("newExternalSharedArrayBuffer",
                                newExternalSharedArrayBuffer),
      DECLARE_NODE_API_PROPERTY("getDeleterCallCount",
                                getDeleterCallCount),
#ifdef __wasm__
      DECLARE_NODE_API_PROPERTY("newExternalSharedArrayBufferWithHandle",
                                newExternalSharedArrayBufferWithHandle),
#endif
#if defined(EMNAPI_SHAREDARRAYBUFFER_MT)
      DECLARE_NODE_API_PROPERTY("acquireAndReleaseExternalSharedArrayBufferInThread",
                                acquireAndReleaseExternalSharedArrayBufferInThread),
#endif
  };

  NODE_API_CALL(
      env,
      napi_define_properties(env,
                             exports,
                             sizeof(descriptors) / sizeof(*descriptors),
                             descriptors));

  return exports;
}
EXTERN_C_END
