#include <node_api.h>
#include <stdlib.h>
#include <time.h>
#include <pthread.h>

typedef struct {
  int current;
  int total;
} run_context_t;

typedef struct {
  napi_async_work work;
  napi_threadsafe_function tsfn;
  napi_ref done_ref;
  pthread_mutex_t mutex;
  int ref_count;
  run_context_t context;
} run_data_t;

static void run_data_unref(run_data_t* d) {
  pthread_mutex_lock(&d->mutex);
  int remaining = --d->ref_count;
  pthread_mutex_unlock(&d->mutex);
  if (remaining == 0) {
    pthread_mutex_destroy(&d->mutex);
    free(d);
  }
}

static void tsfn_callback(napi_env env, napi_value js_callback,
                          void* context, void* data) {
  (void)data;
  if (js_callback == NULL) return;

  napi_value undefined;
  napi_get_undefined(env, &undefined);

  napi_value argv[2];
  run_context_t* ctx = (run_context_t*)context;
  napi_create_int32(env, ctx->current, &argv[0]);
  napi_create_int32(env, ctx->total, &argv[1]);
  napi_call_function(env, undefined, js_callback, 2, argv, NULL);
}

static void tsfn_finalize_cb(napi_env env, void* finalize_data,
                              void* finalize_hint) {
  (void)finalize_hint;
  run_data_t* run_data = (run_data_t*)finalize_data;

  if (run_data->done_ref != NULL) {
    napi_value done_fn;
    napi_get_reference_value(env, run_data->done_ref, &done_fn);
    if (done_fn != NULL) {
      napi_value undefined;
      napi_get_undefined(env, &undefined);
      napi_call_function(env, undefined, done_fn, 0, NULL, NULL);
    }
    napi_delete_reference(env, run_data->done_ref);
    run_data->done_ref = NULL;
  }

  run_data_unref(run_data);
}

static void execute(napi_env env, void* data) {
  run_data_t* run_data = (run_data_t*)data;

  struct timespec ts;
  ts.tv_sec = 0;
  ts.tv_nsec = 200 * 1000 * 1000; /* 200ms */

  for (int i = 0; i < 5; i++) {
    nanosleep(&ts, NULL);
    run_data->context.current++;
    napi_status status = napi_call_threadsafe_function(
        run_data->tsfn, NULL, napi_tsfn_blocking);
    if (status != napi_ok) break;
  }

  napi_release_threadsafe_function(run_data->tsfn, napi_tsfn_release);
}

static void complete(napi_env env, napi_status status, void* data) {
  run_data_t* run_data = (run_data_t*)data;
  napi_delete_async_work(env, run_data->work);
  run_data_unref(run_data);
}

static napi_value run(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);

  if (argc < 1) {
    napi_throw_type_error(env, NULL, "run expects a callback argument");
    return NULL;
  }

  napi_valuetype vt;
  napi_typeof(env, argv[0], &vt);
  if (vt != napi_function) {
    napi_throw_type_error(env, NULL, "first argument must be a function");
    return NULL;
  }

  napi_ref done_ref = NULL;
  if (argc >= 2) {
    napi_valuetype vt2;
    napi_typeof(env, argv[1], &vt2);
    if (vt2 != napi_function) {
      napi_throw_type_error(env, NULL, "second argument must be a function");
      return NULL;
    }
    napi_create_reference(env, argv[1], 1, &done_ref);
  }

  run_data_t* run_data = (run_data_t*)malloc(sizeof(run_data_t));
  if (run_data == NULL) {
    if (done_ref != NULL) napi_delete_reference(env, done_ref);
    napi_throw_error(env, NULL, "malloc failed");
    return NULL;
  }
  run_data->done_ref = done_ref;
  run_data->ref_count = 2;
  run_data->context.current = 0;
  run_data->context.total = 5;
  pthread_mutex_init(&run_data->mutex, NULL);

  napi_value async_name;
  napi_create_string_utf8(env, "run_tsfn", NAPI_AUTO_LENGTH, &async_name);

  napi_status status = napi_create_threadsafe_function(
      env,
      argv[0],            /* js_func */
      NULL,               /* async_resource */
      async_name,         /* async_resource_name */
      0,                  /* max_queue_size: 0 = unlimited */
      1,                  /* initial_thread_count */
      run_data,           /* thread_finalize_data */
      tsfn_finalize_cb,   /* thread_finalize_cb */
      &run_data->context, /* context */
      tsfn_callback,      /* call_js_cb */
      &run_data->tsfn);

  if (status != napi_ok) {
    pthread_mutex_destroy(&run_data->mutex);
    free(run_data);
    napi_throw_error(env, NULL, "napi_create_threadsafe_function failed");
    return NULL;
  }

  napi_value work_name;
  napi_create_string_utf8(env, "run_work", NAPI_AUTO_LENGTH, &work_name);

  status = napi_create_async_work(env, NULL, work_name,
                                  execute, complete,
                                  run_data, &run_data->work);
  if (status != napi_ok) {
    napi_release_threadsafe_function(run_data->tsfn, napi_tsfn_release);
    napi_throw_error(env, NULL, "napi_create_async_work failed");
    return NULL;
  }

  napi_queue_async_work(env, run_data->work);

  napi_value undefined;
  napi_get_undefined(env, &undefined);
  return undefined;
}

NAPI_MODULE_INIT() {
  napi_value fn;
  napi_create_function(env, "run", NAPI_AUTO_LENGTH, run, NULL, &fn);
  napi_set_named_property(env, exports, "run", fn);
  return exports;
}
