#ifndef SRC_JS_NATIVE_API_INTERNAL_H_
#define SRC_JS_NATIVE_API_INTERNAL_H_

#include "js_native_api_types.h"

typedef struct node_api_base_env__ {
  void* vptr;
  EMNAPI_NAPI_ENV_FIELDS;
  uint32_t id;
  napi_extended_error_info last_error;
} node_api_base_env__;

#define EMNAPI_AS_NODE_API_BASE_ENV(env) \
  ((node_api_base_env__*)((char*)(env) - offsetof(node_api_base_env__, sentinel)))

struct node_api_base_env__vtable {
  size_t offset_to_top;
  void* type_info;
  node_api_base_env__* (*cdtor)(node_api_base_env__* self);
  void (*ddtor)(node_api_base_env__* self);
};

EXTERN_C_START

extern struct node_api_base_env__vtable node_api_base_env__vtable_instance;

// EMNAPI_INTERNAL_EXTERN
// const struct node_api_js_vtable* _emnapi_get_node_api_js_vtable();

// EMNAPI_INTERNAL_EXTERN
// const struct node_api_module_vtable* _emnapi_get_node_api_module_vtable();

node_api_base_env__* node_api_base_env__cdtor(node_api_base_env__* self);
void node_api_base_env__ddtor(node_api_base_env__* self);

static inline
node_api_base_env__* node_api_base_env__ctor(node_api_base_env__* self) {
  self->vptr = &node_api_base_env__vtable_instance.cdtor;
  self->sentinel = NODE_API_VT_SENTINEL;
  return self;
}

static inline napi_status napi_clear_last_error(node_api_basic_env basic_env) {
  node_api_base_env__* env = EMNAPI_AS_NODE_API_BASE_ENV(basic_env);
  env->last_error.error_code = napi_ok;
  env->last_error.engine_error_code = 0;
  env->last_error.engine_reserved = NULL;
  env->last_error.error_message = NULL;
  return napi_ok;
}

static inline napi_status
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

EXTERN_C_END

#endif
