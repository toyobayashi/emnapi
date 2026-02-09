#include "node_api.h"
#include "emnapi_internal.h"

#if NAPI_VERSION >= 8

EXTERN_C_START

typedef void (*async_cleanup_hook)(void* arg, void(*)(void*), void*);

struct async_cleanup_hook_info {
  node_api_basic_env env;
  async_cleanup_hook fun;
  void* arg;
  bool started;
};

typedef struct node_api_async_cleanup_hook__ {
  uint64_t sentinel;
  const struct node_api_module_vtable* module_vtable;

  struct async_cleanup_hook_info* handle_;
  node_api_basic_env env_;
  napi_async_cleanup_hook user_hook_;
  void* user_data_;
  void (*done_cb_)(void*);
  void* done_data_;
} node_api_async_cleanup_hook__;

static void _emnapi_ach_handle_hook(void* data, void (*done_cb)(void*), void* done_data) {
  node_api_async_cleanup_hook__* handle =
      (node_api_async_cleanup_hook__*) (data);
  handle->done_cb_ = done_cb;
  handle->done_data_ = done_data;
  handle->user_hook_((napi_async_cleanup_hook_handle)handle, handle->user_data_);
}

static void _emnapi_finish_async_cleanup_hook(void* arg) {
  // struct async_cleanup_hook_info* info = (struct async_cleanup_hook_info*) (arg);
  EMNAPI_KEEPALIVE_POP();
  _emnapi_ctx_decrease_waiting_request_counter();
}

static void _emnapi_run_async_cleanup_hook(void* arg) {
  struct async_cleanup_hook_info* info = (struct async_cleanup_hook_info*) (arg);
  EMNAPI_KEEPALIVE_PUSH();
  _emnapi_ctx_increase_waiting_request_counter();
  info->started = true;
  info->fun(info->arg, _emnapi_finish_async_cleanup_hook, info);
}

static struct async_cleanup_hook_info*
_emnapi_add_async_environment_cleanup_hook(node_api_basic_env env,
                                           async_cleanup_hook fun,
                                           void* arg) {
  struct async_cleanup_hook_info* info =
    (struct async_cleanup_hook_info*) malloc(sizeof(struct async_cleanup_hook_info));
  info->env = env;
  info->fun = fun;
  info->arg = arg;
  info->started = false;

  EMNAPI_ASSERT_CALL(napi_add_env_cleanup_hook(env, _emnapi_run_async_cleanup_hook, info));

  return info;
}

static void _emnapi_remove_async_environment_cleanup_hook(
    struct async_cleanup_hook_info* info) {
  if (info->started) return;
  EMNAPI_ASSERT_CALL(napi_remove_env_cleanup_hook(info->env, _emnapi_run_async_cleanup_hook, info));
}

static node_api_async_cleanup_hook__*
_emnapi_ach_handle_create(node_api_basic_env env,
                          napi_async_cleanup_hook user_hook,
                          void* user_data) {
  node_api_async_cleanup_hook__* handle =
    (node_api_async_cleanup_hook__*) calloc(1, sizeof(node_api_async_cleanup_hook__));
  handle->sentinel = NODE_API_VT_SENTINEL;
  handle->module_vtable = NULL; // TODO
  handle->env_ = env;
  handle->user_hook_ = user_hook;
  handle->user_data_ = user_data;
  handle->handle_ = _emnapi_add_async_environment_cleanup_hook(env, _emnapi_ach_handle_hook, handle);
  _emnapi_env_ref(env);

  return handle;
}

EMNAPI_INTERNAL_EXTERN void _emnapi_set_immediate(void (*callback)(void*), void* data);

static void _emnapi_ach_handle_env_unref(void* arg) {
  node_api_basic_env env = (node_api_basic_env) arg;
  _emnapi_env_unref(env);
}

static void
_emnapi_ach_handle_delete(node_api_async_cleanup_hook__* handle) {
  _emnapi_remove_async_environment_cleanup_hook(handle->handle_);
  if (handle->done_cb_ != NULL) handle->done_cb_(handle->done_data_);

  _emnapi_set_immediate(_emnapi_ach_handle_env_unref, (void*) handle->env_);

  free(handle->handle_);
  free(handle);
}

napi_status
napi_add_async_cleanup_hook(node_api_basic_env env,
                            napi_async_cleanup_hook hook,
                            void* arg,
                            napi_async_cleanup_hook_handle* remove_handle) {
  CHECK_ENV(env);
  CHECK_ARG(env, hook);

  napi_async_cleanup_hook_handle handle =
      (napi_async_cleanup_hook_handle)_emnapi_ach_handle_create(env, hook, arg);

  if (remove_handle != NULL) *remove_handle = handle;

  return napi_clear_last_error(env);
}

napi_status
napi_remove_async_cleanup_hook(napi_async_cleanup_hook_handle remove_handle) {
  if (remove_handle == NULL) return napi_invalid_arg;

  _emnapi_ach_handle_delete((node_api_async_cleanup_hook__*)remove_handle);

  return napi_ok;
}

EXTERN_C_END

#endif
