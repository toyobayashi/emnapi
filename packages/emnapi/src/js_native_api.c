#include "emnapi_internal.h"
#include "js_native_api_internal.h"

EXTERN_C_START

EMNAPI_INTERNAL_EXTERN
const struct node_api_js_vtable* _emnapi_get_node_api_js_vtable();

EMNAPI_INTERNAL_EXTERN
const struct node_api_module_vtable* _emnapi_get_node_api_module_vtable();

static struct node_api_base_env__vtable node_api_base_env__vtable_instance = {
  .offset_to_top = offsetof(node_api_base_env__, vptr),
  .type_info = NULL,
  .destructor = node_api_base_env__destructor,
  .deleter = node_api_base_env__deleter,
};

__attribute__((visibility("default")))
node_api_base_env__* emnapi_create_env(uint32_t id) {
  node_api_base_env__* env = (node_api_base_env__*) malloc(sizeof(node_api_base_env__));
  node_api_base_env__constructor(env, id);
  return env;
}

__attribute__((visibility("default")))
void emnapi_delete_env(node_api_base_env__* env) {
  node_api_base_env__deleter(env);
}

node_api_base_env__* node_api_base_env__constructor(node_api_base_env__* self, uint32_t id) {
  self->vptr = &node_api_base_env__vtable_instance.destructor;
  self->sentinel = NODE_API_VT_SENTINEL;
  self->js_vtable = _emnapi_get_node_api_js_vtable();
  self->module_vtable = _emnapi_get_node_api_module_vtable();
  self->id = id;
  self->last_error.error_code = napi_ok;
  self->last_error.engine_error_code = 0;
  self->last_error.engine_reserved = NULL;
  self->last_error.error_message = NULL;
  return self;
}

node_api_base_env__* node_api_base_env__destructor(node_api_base_env__* self) {
  return self;
}

void node_api_base_env__deleter(node_api_base_env__* self) {
  node_api_base_env__destructor(self);
  free(self);
}

__attribute__((visibility("default")))
napi_status napi_clear_last_error(node_api_basic_env basic_env) {
  node_api_base_env__* env = EMNAPI_AS_NODE_API_BASE_ENV(basic_env);
  env->last_error.error_code = napi_ok;
  env->last_error.engine_error_code = 0;
  env->last_error.engine_reserved = NULL;
  env->last_error.error_message = NULL;
  return napi_ok;
}

__attribute__((visibility("default")))
napi_status
napi_set_last_error(node_api_basic_env basic_env,
                    napi_status error_code,
                    uint32_t engine_error_code,
                    void* engine_reserved) {
  node_api_base_env__* env = EMNAPI_AS_NODE_API_BASE_ENV(basic_env);
  env->last_error.error_code = error_code;
  env->last_error.engine_error_code = engine_error_code;
  env->last_error.engine_reserved = engine_reserved;
  return error_code;
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
