#include <stdio.h>
#include "../src/emnapi_internal.h"
#include "../src/threadsafe_function.h"

#ifdef __wasm64__
#define WASM_BIT "64"
#else
#define WASM_BIT "32"
#endif

void print_napi_env_info(FILE* f) {
  fprintf(f, "declare const enum NapiEnvOffset" WASM_BIT " {\n");
  fprintf(f, "  __size__ = %zu,\n", sizeof(node_api_base_env__));
  fprintf(f, "  vptr = %zu,\n", offsetof(node_api_base_env__, vptr));
  fprintf(f, "  sentinel = %zu,\n", offsetof(node_api_base_env__, sentinel));
  fprintf(f, "  js_vtable = %zu,\n", offsetof(node_api_base_env__, js_vtable));
  fprintf(f, "  module_vtable = %zu,\n", offsetof(node_api_base_env__, module_vtable));
  fprintf(f, "  id = %zu,\n", offsetof(node_api_base_env__, id));
  fprintf(f, "  last_error = %zu,\n", offsetof(node_api_base_env__, last_error));
  fprintf(f, "  last_error___size__ = %zu,\n", sizeof(napi_extended_error_info));
  fprintf(f, "  last_error_error_message = %zu,\n", offsetof(node_api_base_env__, last_error) + offsetof(napi_extended_error_info, error_message));
  fprintf(f, "  last_error_engine_reserved = %zu,\n", offsetof(node_api_base_env__, last_error) + offsetof(napi_extended_error_info, engine_reserved));
  fprintf(f, "  last_error_engine_error_code = %zu,\n", offsetof(node_api_base_env__, last_error) + offsetof(napi_extended_error_info, engine_error_code));
  fprintf(f, "  last_error_error_code = %zu,\n", offsetof(node_api_base_env__, last_error) + offsetof(napi_extended_error_info, error_code));
  fprintf(f, "}\n");
}

void print_napi_threadsafe_function_info(FILE* f) {
  // __size__
  // async_resource
  // async_resource___size__
  // async_resource_resource
  // async_resource_async_context
  // async_resource_async_context___size__
  // async_resource_async_context_async_id
  // async_resource_async_context_trigger_async_id
  // async_resource_is_some
  // mutex
  // cond
  // queue_size
  // queue
  // async
  // thread_count
  // state
  // dispatch_state
  // context
  // max_queue_size
  // ref
  // env
  // finalize_data
  // finalize_cb
  // call_js_cb
  // handles_closing
  // async_ref
  fprintf(f, "declare const enum NapiTSFNOffset" WASM_BIT " {\n");
  fprintf(f, "  __size__ = %zu,\n", sizeof(struct napi_threadsafe_function__));
  fprintf(f, "  async_resource = %zu,\n", offsetof(struct napi_threadsafe_function__, async_resource));
  fprintf(f, "  async_resource___size__ = %zu,\n", sizeof(optional_async_resource));
  fprintf(f, "  async_resource_resource = %zu,\n", offsetof(struct napi_threadsafe_function__, async_resource) + offsetof(optional_async_resource, resource_));
  fprintf(f, "  async_resource_async_context = %zu,\n", offsetof(struct napi_threadsafe_function__, async_resource) + offsetof(optional_async_resource, async_context_));
  fprintf(f, "  async_resource_async_context___size__ = %zu,\n", sizeof(async_context));
  fprintf(f, "  async_resource_async_context_async_id = %zu,\n", offsetof(struct napi_threadsafe_function__, async_resource) + offsetof(optional_async_resource, async_context_) + offsetof(async_context, async_id));
  fprintf(f, "  async_resource_async_context_trigger_async_id = %zu,\n", offsetof(struct napi_threadsafe_function__, async_resource) + offsetof(optional_async_resource, async_context_) + offsetof(async_context, trigger_async_id));
  fprintf(f, "  async_resource_is_some = %zu,\n", offsetof(struct napi_threadsafe_function__, async_resource) + offsetof(optional_async_resource, is_some));
  fprintf(f, "  mutex = %zu,\n", offsetof(struct napi_threadsafe_function__, mutex));
  fprintf(f, "  cond = %zu,\n", offsetof(struct napi_threadsafe_function__, cond));
  fprintf(f, "  queue_size = %zu,\n", offsetof(struct napi_threadsafe_function__, queue_size));
  fprintf(f, "  queue = %zu,\n", offsetof(struct napi_threadsafe_function__, queue));
  fprintf(f, "  async = %zu,\n", offsetof(struct napi_threadsafe_function__, async));
  fprintf(f, "  thread_count = %zu,\n", offsetof(struct napi_threadsafe_function__, thread_count));
  fprintf(f, "  state = %zu,\n", offsetof(struct napi_threadsafe_function__, state));
  fprintf(f, "  dispatch_state = %zu,\n", offsetof(struct napi_threadsafe_function__, dispatch_state));
  fprintf(f, "  context = %zu,\n", offsetof(struct napi_threadsafe_function__, context));
  fprintf(f, "  max_queue_size = %zu,\n", offsetof(struct napi_threadsafe_function__, max_queue_size));
  fprintf(f, "  ref = %zu,\n", offsetof(struct napi_threadsafe_function__, ref));
  fprintf(f, "  env = %zu,\n", offsetof(struct napi_threadsafe_function__, env));
  fprintf(f, "  finalize_data = %zu,\n", offsetof(struct napi_threadsafe_function__, finalize_data));
  fprintf(f, "  finalize_cb = %zu,\n", offsetof(struct napi_threadsafe_function__, finalize_cb));
  fprintf(f, "  call_js_cb = %zu,\n", offsetof(struct napi_threadsafe_function__, call_js_cb));
  fprintf(f, "  handles_closing = %zu,\n", offsetof(struct napi_threadsafe_function__, handles_closing));
  fprintf(f, "  async_ref = %zu,\n", offsetof(struct napi_threadsafe_function__, async_ref));
  fprintf(f, "}\n");
}

int main() {
  FILE* f = fopen("src/typings/struct-wasm" WASM_BIT ".d.ts", "w");
  if (f == NULL) {
    fprintf(stderr, "Failed to open file\n");
    return 1;
  }

  print_napi_env_info(f);
  print_napi_threadsafe_function_info(f);

  fclose(f);
  return 0;
}
