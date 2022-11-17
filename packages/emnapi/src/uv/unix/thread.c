#ifdef __EMSCRIPTEN_PTHREADS__

#include <assert.h>
#include <errno.h>
#include <stdlib.h>
#include <time.h>
#include "uv.h"

void uv_sem_post(sem_t* sem) {
  if (sem_post(sem))
    abort();
}

int uv_sem_init(sem_t* sem, unsigned int value) {
  if (sem_init(sem, 0, value))
    return errno;
  return 0;
}

void uv_sem_wait(sem_t* sem) {
  int r;

  do {
    r = sem_wait(sem);
  } while (r == -1 && errno == EINTR);

  if (r)
    abort();
}

void uv_sem_destroy(sem_t* sem) {
  if (sem_destroy(sem))
    abort();
}

void uv_once(pthread_once_t* guard, void (*callback)(void)) {
  if (pthread_once(guard, callback))
    abort();
}

int uv_mutex_init(uv_mutex_t* mutex) {
#if defined(NDEBUG) || !defined(PTHREAD_MUTEX_ERRORCHECK)
  return pthread_mutex_init(mutex, NULL);
#else
  pthread_mutexattr_t attr;
  int err;

  if (pthread_mutexattr_init(&attr))
    abort();

  if (pthread_mutexattr_settype(&attr, PTHREAD_MUTEX_ERRORCHECK))
    abort();

  err = pthread_mutex_init(mutex, &attr);

  if (pthread_mutexattr_destroy(&attr))
    abort();

  return err;
#endif
}

void uv_mutex_destroy(uv_mutex_t* mutex) {
  if (pthread_mutex_destroy(mutex))
    abort();
}

void uv_mutex_lock(uv_mutex_t* mutex) {
  if (pthread_mutex_lock(mutex))
    abort();
}

void uv_mutex_unlock(uv_mutex_t* mutex) {
  if (pthread_mutex_unlock(mutex))
    abort();
}

int uv_cond_init(uv_cond_t* cond) {
  return pthread_cond_init(cond, NULL);
}

void uv_cond_signal(uv_cond_t* cond) {
  if (pthread_cond_signal(cond))
    abort();
}

void uv_cond_wait(uv_cond_t* cond, uv_mutex_t* mutex) {
  if (pthread_cond_wait(cond, mutex))
    abort();
}

int uv_thread_create_ex(uv_thread_t* tid,
                        void* params,
                        void (*entry)(void *arg),
                        void *arg) {
  int err;
  pthread_attr_t attr_storage;

  /* Used to squelch a -Wcast-function-type warning. */
  union {
    void (*in)(void*);
    void* (*out)(void*);
  } f;

  f.in = entry;
  err = pthread_create(tid, NULL, f.out, arg);

  return err;
}

int uv_thread_create(uv_thread_t *tid, void (*entry)(void *arg), void *arg) {
  return uv_thread_create_ex(tid, NULL, entry, arg);
}

int uv_thread_join(uv_thread_t *tid) {
  return pthread_join(*tid, NULL);
}

#endif
