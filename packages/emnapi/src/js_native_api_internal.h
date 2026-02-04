#ifndef SRC_JS_NATIVE_API_H_
#define SRC_JS_NATIVE_API_H_

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
  const char* type_info;
  node_api_base_env__* (*destructor)(node_api_base_env__* self);
  void (*deleter)(node_api_base_env__* self);
};

node_api_base_env__* node_api_base_env__constructor(node_api_base_env__* self, uint32_t id);
node_api_base_env__* node_api_base_env__destructor(node_api_base_env__* self);
void node_api_base_env__deleter(node_api_base_env__* self);

#endif
