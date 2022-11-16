/* Copyright Joyent, Inc. and other Node contributors. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

// from libuv 1.43.0

#include <stdlib.h>
#include <assert.h>
#include <pthread.h>
#include <semaphore.h>
#include <errno.h>
#include <string.h>
#include "queue.h"

void uv__work_done(void* handle);

extern void _emnapi_async_send(void (*callback)(void*), void* data);

struct uv_loop_s;
typedef struct uv_loop_s uv_loop_t;

struct uv_loop_s {
  union {
    void* unused;
    unsigned int count;
  } active_reqs;
  void* wq[2];
  pthread_mutex_t wq_mutex;
};

#define UV_REQ_INIT(req, typ)                                                 \
  do {                                                                        \
    (req)->type = (typ);                                                      \
  }                                                                           \
  while (0)

#define uv__has_active_reqs(loop)                                             \
  ((loop)->active_reqs.count > 0)

#define uv__req_register(loop, req)                                           \
  do {                                                                        \
    (loop)->active_reqs.count++;                                              \
  }                                                                           \
  while (0)

#define uv__req_unregister(loop, req)                                         \
  do {                                                                        \
    assert(uv__has_active_reqs(loop));                                        \
    (loop)->active_reqs.count--;                                              \
  }                                                                           \
  while (0)

#define uv__req_init(loop, req, typ)                                          \
  do {                                                                        \
    UV_REQ_INIT(req, typ);                                                    \
    uv__req_register(loop, req);                                              \
  }                                                                           \
  while (0)

struct uv_work_s;
typedef struct uv_work_s uv_work_t;

struct uv_req_s {
  int type;
};

typedef struct uv_req_s uv_req_t;

struct uv__work {
  void (*work)(struct uv__work *w);
  void (*done)(struct uv__work *w, int status);
  struct uv_loop_s* loop;
  void* wq[2];
};

typedef void (*uv_work_cb)(uv_work_t* req);
typedef void (*uv_after_work_cb)(uv_work_t* req, int status);

struct uv_work_s {
  int type;
  uv_loop_t* loop;
  uv_work_cb work_cb;
  uv_after_work_cb after_work_cb;
  struct uv__work work_req;
};

#define ARRAY_SIZE(a) (sizeof(a) / sizeof((a)[0]))
// #define offsetof(s, m) __builtin_offsetof(s, m)
#define container_of(ptr, type, member) \
  ((type *) ((char *) (ptr) - offsetof(type, member)))

#define MAX_THREADPOOL_SIZE 1024

static uv_loop_t loop = { 0 };
static pthread_once_t once = PTHREAD_ONCE_INIT;
static pthread_cond_t cond;
static pthread_mutex_t mutex;
static unsigned int idle_threads;
static unsigned int slow_io_work_running;
static unsigned int nthreads;
static pthread_t* threads;
static pthread_t default_threads[4];
static QUEUE exit_message;
static QUEUE wq;
static QUEUE run_slow_work_message;
static QUEUE slow_io_pending_wq;

static unsigned int slow_work_thread_threshold(void) {
  return (nthreads + 1) / 2;
}

static void uv__cancelled(struct uv__work* w) {
  abort();
}

static void uv_sem_post(sem_t* sem) {
  if (sem_post(sem))
    abort();
}

static int uv_sem_init(sem_t* sem, unsigned int value) {
  if (sem_init(sem, 0, value))
    return errno;
  return 0;
}

static void uv_sem_wait(sem_t* sem) {
  int r;

  do
    r = sem_wait(sem);
  while (r == -1 && errno == EINTR);

  if (r)
    abort();
}

static void uv_sem_destroy(sem_t* sem) {
  if (sem_destroy(sem))
    abort();
}

void uv_once(pthread_once_t* guard, void (*callback)(void)) {
  if (pthread_once(guard, callback))
    abort();
}


/* To avoid deadlock with uv_cancel() it's crucial that the worker
 * never holds the global mutex and the loop-local mutex at the same time.
 */
static void* worker(void* arg) {
  struct uv__work* w;
  QUEUE* q;
  int is_slow_work;

  uv_sem_post((sem_t*) arg);
  arg = NULL;

  pthread_mutex_lock(&mutex);
  for (;;) {
    /* `mutex` should always be locked at this point. */

    /* Keep waiting while either no work is present or only slow I/O
       and we're at the threshold for that. */
    while (QUEUE_EMPTY(&wq) ||
           (QUEUE_HEAD(&wq) == &run_slow_work_message &&
            QUEUE_NEXT(&run_slow_work_message) == &wq &&
            slow_io_work_running >= slow_work_thread_threshold())) {
      idle_threads += 1;
      pthread_cond_wait(&cond, &mutex);
      idle_threads -= 1;
    }

    q = QUEUE_HEAD(&wq);
    if (q == &exit_message) {
      pthread_cond_signal(&cond);
      pthread_mutex_unlock(&mutex);
      break;
    }

    QUEUE_REMOVE(q);
    QUEUE_INIT(q);  /* Signal uv_cancel() that the work req is executing. */

    is_slow_work = 0;
    if (q == &run_slow_work_message) {
      /* If we're at the slow I/O threshold, re-schedule until after all
         other work in the queue is done. */
      if (slow_io_work_running >= slow_work_thread_threshold()) {
        QUEUE_INSERT_TAIL(&wq, q);
        continue;
      }

      /* If we encountered a request to run slow I/O work but there is none
         to run, that means it's cancelled => Start over. */
      if (QUEUE_EMPTY(&slow_io_pending_wq))
        continue;

      is_slow_work = 1;
      slow_io_work_running++;

      q = QUEUE_HEAD(&slow_io_pending_wq);
      QUEUE_REMOVE(q);
      QUEUE_INIT(q);

      /* If there is more slow I/O work, schedule it to be run as well. */
      if (!QUEUE_EMPTY(&slow_io_pending_wq)) {
        QUEUE_INSERT_TAIL(&wq, &run_slow_work_message);
        if (idle_threads > 0)
          pthread_cond_signal(&cond);
      }
    }

    pthread_mutex_unlock(&mutex);

    w = QUEUE_DATA(q, struct uv__work, wq);
    w->work(w);

    pthread_mutex_lock(&w->loop->wq_mutex);
    w->work = NULL;  /* Signal uv_cancel() that the work req is done
                        executing. */
    QUEUE_INSERT_TAIL(&w->loop->wq, &w->wq);
    // uv_async_send(&w->loop->wq_async);
    _emnapi_async_send(uv__work_done, w);
    pthread_mutex_unlock(&w->loop->wq_mutex);

    /* Lock `mutex` since that is expected at the start of the next
     * iteration. */
    pthread_mutex_lock(&mutex);
    if (is_slow_work) {
      /* `slow_io_work_running` is protected by `mutex`. */
      slow_io_work_running--;
    }
  }
  return NULL;
}


static void post(QUEUE* q, /* enum uv__work_kind */ int kind) {
  pthread_mutex_lock(&mutex);
  // if (kind == UV__WORK_SLOW_IO) {
  //   /* Insert into a separate queue. */
  //   QUEUE_INSERT_TAIL(&slow_io_pending_wq, q);
  //   if (!QUEUE_EMPTY(&run_slow_work_message)) {
  //     /* Running slow I/O tasks is already scheduled => Nothing to do here.
  //        The worker that runs said other task will schedule this one as well. */
  //     pthread_mutex_unlock(&mutex);
  //     return;
  //   }
  //   q = &run_slow_work_message;
  // }

  QUEUE_INSERT_TAIL(&wq, q);
  if (idle_threads > 0)
    pthread_cond_signal(&cond);
  pthread_mutex_unlock(&mutex);
}


/* void uv__threadpool_cleanup(void) {
  unsigned int i;

  if (nthreads == 0)
    return;

  for (i = 0; i < nthreads; i++)
    if (pthread_join(*(threads + i), NULL))
      abort();

  if (threads != default_threads)
    free(threads);

  pthread_mutex_destroy(&mutex);
  pthread_cond_destroy(&cond);

  threads = NULL;
  nthreads = 0;
} */


static void init_threads(void) {
  unsigned int i;
  int val;
  sem_t sem;

  nthreads = ARRAY_SIZE(default_threads);
#if defined(EMNAPI_WORKER_POOL_SIZE) && EMNAPI_WORKER_POOL_SIZE >= 0
  val = EMNAPI_WORKER_POOL_SIZE;
#else
  val = -1;
#endif
  if (val != -1)
    nthreads = val;
  if (nthreads == 0)
    nthreads = 1;
  if (nthreads > MAX_THREADPOOL_SIZE)
    nthreads = MAX_THREADPOOL_SIZE;

  threads = default_threads;
  if (nthreads > ARRAY_SIZE(default_threads)) {
    threads = (pthread_t *)malloc(nthreads * sizeof(threads[0]));
    if (threads == NULL) {
      nthreads = ARRAY_SIZE(default_threads);
      threads = default_threads;
    }
  }

  if (pthread_cond_init(&cond, NULL))
    abort();

  if (pthread_mutex_init(&mutex, NULL))
    abort();

  QUEUE_INIT(&wq);
  QUEUE_INIT(&slow_io_pending_wq);
  QUEUE_INIT(&run_slow_work_message);

  if (uv_sem_init(&sem, 0))
    abort();

  for (i = 0; i < nthreads; i++)
    if (pthread_create(threads + i, NULL, worker, &sem))
      abort();

  for (i = 0; i < nthreads; i++)
    uv_sem_wait(&sem);

  uv_sem_destroy(&sem);
}


#ifndef _WIN32
static void reset_once(void) {
  pthread_once_t child_once = PTHREAD_ONCE_INIT;
  memcpy(&once, &child_once, sizeof(child_once));
}
#endif

static void init_loop() {
  QUEUE_INIT(&loop.wq);
  pthread_mutex_init(&loop.wq_mutex, NULL);
}

static void init_once(void) {
  init_loop();
#ifndef _WIN32
  /* Re-initialize the threadpool after fork.
   * Note that this discards the global mutex and condition as well
   * as the work queue.
   */
  if (pthread_atfork(NULL, NULL, &reset_once))
    abort();
#endif
  init_threads();
}


void uv__work_submit(uv_loop_t* loop,
                     struct uv__work* w,
                     int kind,
                     void (*work)(struct uv__work* w),
                     void (*done)(struct uv__work* w, int status)) {
  uv_once(&once, init_once);
  w->loop = loop;
  w->work = work;
  w->done = done;
  post(&w->wq, kind);
}


static int uv__work_cancel(uv_loop_t* loop, void* req, struct uv__work* w) {
  int cancelled;

  pthread_mutex_lock(&mutex);
  pthread_mutex_lock(&w->loop->wq_mutex);

  cancelled = !QUEUE_EMPTY(&w->wq) && w->work != NULL;
  if (cancelled)
    QUEUE_REMOVE(&w->wq);

  pthread_mutex_unlock(&w->loop->wq_mutex);
  pthread_mutex_unlock(&mutex);

  if (!cancelled)
    return EBUSY;

  w->work = uv__cancelled;
  pthread_mutex_lock(&loop->wq_mutex);
  QUEUE_INSERT_TAIL(&loop->wq, &w->wq);
  // uv_async_send(&loop->wq_async);
  _emnapi_async_send(uv__work_done, w);
  pthread_mutex_unlock(&loop->wq_mutex);

  return 0;
}


void uv__work_done(void* handle) {
  struct uv__work* w;
  uv_loop_t* _loop;
  QUEUE* q;
  QUEUE wq;
  int err;

  // w = (struct uv__work*) handle;

  // loop = container_of(handle, uv_loop_t, wq_async);
  _loop = &loop;
  pthread_mutex_lock(&_loop->wq_mutex);
  QUEUE_MOVE(&_loop->wq, &wq);
  pthread_mutex_unlock(&_loop->wq_mutex);

  while (!QUEUE_EMPTY(&wq)) {
    q = QUEUE_HEAD(&wq);
    QUEUE_REMOVE(q);
    w = container_of(q, struct uv__work, wq);
    err = (w->work == uv__cancelled) ? ECANCELED : 0;
    w->done(w, err);
  }
}


static void uv__queue_work(struct uv__work* w) {
  uv_work_t* req = container_of(w, uv_work_t, work_req);

  req->work_cb(req);
}


static void uv__queue_done(struct uv__work* w, int err) {
  uv_work_t* req;

  req = container_of(w, uv_work_t, work_req);
  uv__req_unregister(req->loop, req);

  if (req->after_work_cb == NULL)
    return;

  req->after_work_cb(req, err);
}


int uv_queue_work(uv_loop_t* loop,
                  uv_work_t* req,
                  uv_work_cb work_cb,
                  uv_after_work_cb after_work_cb) {
  if (work_cb == NULL)
    return EINVAL;

  uv__req_init(loop, req, 7 /* UV_WORK */);
  req->loop = loop;
  req->work_cb = work_cb;
  req->after_work_cb = after_work_cb;
  uv__work_submit(loop,
                  &req->work_req,
                  0,
                  uv__queue_work,
                  uv__queue_done);
  return 0;
}


int uv_cancel(uv_req_t* req) {
  struct uv__work* wreq;
  void* loop;

  switch (req->type) {
    case 7 /* UV_WORK */:
      loop =  ((uv_work_t*) req)->loop;
      wreq = &((uv_work_t*) req)->work_req;
      break;
    default:
      return EINVAL;
  }

  return uv__work_cancel(loop, req, wreq);
}
