#include "emnapi_internal.h"

EXTERN_C_START

struct node_api_base_env__vtable node_api_base_env__vtable_instance = {
  .offset_to_top = offsetof(node_api_base_env__, vptr),
  .type_info = NULL,
  .cdtor = node_api_base_env__cdtor,
  .ddtor = node_api_base_env__ddtor,
};

__attribute__((visibility("default")))
node_api_base_env__* emnapi_create_env() {
  node_api_base_env__* env = (node_api_base_env__*) malloc(sizeof(node_api_base_env__));
  node_api_base_env__ctor(env);
  return env;
}

__attribute__((visibility("default")))
void emnapi_delete_env(node_api_base_env__* env) {
  node_api_base_env__ddtor(env);
}

node_api_base_env__* node_api_base_env__cdtor(node_api_base_env__* self) {
  return self;
}

void node_api_base_env__ddtor(node_api_base_env__* self) {
  node_api_base_env__cdtor(self);
  free(self);
}

static const char* emnapi_error_messages[] = {
  NULL,
  "Invalid argument",
  "An object was expected",
  "A string was expected",
  "A string or symbol was expected",
  "A function was expected",
  "A number was expected",
  "A boolean was expected",
  "An array was expected",
  "Unknown failure",
  "An exception is pending",
  "The async work item was cancelled",
  "napi_escape_handle already called on scope",
  "Invalid handle scope usage",
  "Invalid callback scope usage",
  "Thread-safe function queue is full",
  "Thread-safe function handle is closing",
  "A bigint was expected",
  "A date was expected",
  "An arraybuffer was expected",
  "A detachable arraybuffer was expected",
  "Main thread would deadlock",
  "External buffers are not allowed",
  "Cannot run JavaScript",
};

__attribute__((visibility("default")))
napi_status napi_get_last_error_info(
    node_api_basic_env basic_env, const napi_extended_error_info** result) {
  CHECK_ENV(basic_env);
  CHECK_ARG(basic_env, result);
  node_api_base_env__* env = EMNAPI_AS_NODE_API_BASE_ENV(basic_env);

  const int last_status = napi_cannot_run_js;

#if (defined(__STDC_VERSION__) && __STDC_VERSION__ >= 201112L) || defined(__cplusplus)
  static_assert((sizeof(emnapi_error_messages) / sizeof(const char*)) == napi_cannot_run_js + 1,
                "Count of error messages must match count of error values");
#endif

  CHECK_LE(env->last_error.error_code, last_status);

  env->last_error.error_message = emnapi_error_messages[env->last_error.error_code];

  if (env->last_error.error_code == napi_ok) {
    napi_clear_last_error(basic_env);
  }
  *result = &(env->last_error);
  return napi_ok;
}

EXTERN_C_END
