#if defined(__wasi__)

#include <time.h>
#include <errno.h>
#include <pthread.h>
#include <stdio.h>
#include "emnapi_internal.h"

int __wasilibc_futex_wait_atomic_wait(volatile void *addr, int op, int val, int64_t max_wait_ns);

static _Atomic pthread_t crashed_thread_id = NULL;

__attribute__((visibility("default")))
void emnapi_thread_crashed() {
  crashed_thread_id = pthread_self();
}

void _emnapi_yield() {
  if (crashed_thread_id) {
    _emnapi_runtime_keepalive_push();
    _emnapi_unwind();
  }
}

int _emnapi_wait(int is_runtime_thread, volatile void *addr, int op, int val, int64_t max_wait_ns) {
  if (is_runtime_thread) {
    _emnapi_yield();
  }

  // https://github.com/WebAssembly/wasi-libc/blob/3f7eb4c7d6ede4dde3c4bffa6ed14e8d656fe93f/libc-top-half/musl/src/thread/wasm32/__wasilibc_busywait.c#L42
  if (!_emnapi_is_main_browser_thread()) {
    return __wasilibc_futex_wait_atomic_wait(addr, op, val, max_wait_ns);
  }

  struct timespec start;
  int r = clock_gettime(CLOCK_REALTIME, &start);

  if (r) return r;

  while (1) {
    if (max_wait_ns >= 0) {
      struct timespec now;
      r = clock_gettime(CLOCK_REALTIME, &now);
      if (r) return r;

      int64_t elapsed_ns = (now.tv_sec - start.tv_sec) * 1000000000 + now.tv_nsec - start.tv_nsec;
      if (elapsed_ns >= max_wait_ns) {
        return -ETIMEDOUT;
      }
    }

    if (is_runtime_thread) {
      _emnapi_yield();
    }

    if (__c11_atomic_load((_Atomic int *)addr, __ATOMIC_SEQ_CST) != val) {
      break;
    }
  }

  return 0;
}

int __wasilibc_futex_wait_maybe_busy(volatile void *addr, int op, int val, int64_t max_wait_ns) {
  printf("Futex wait called with addr=%p, op=%d, val=%d, max_wait_ns=%lld\n", addr, op, val, max_wait_ns);

  int r = 0;
  double msecsToSleep = max_wait_ns >= 0 ? (max_wait_ns / 1000000.0) : __builtin_inff();
  int is_runtime_thread = _emnapi_is_main_runtime_thread();
	double max_ms_slice_to_sleep = is_runtime_thread ? 1 : 100;

  if (is_runtime_thread) {
    double sleepUntilTime = _emnapi_get_now() + msecsToSleep;
		do {
			msecsToSleep = sleepUntilTime - _emnapi_get_now();
			if (msecsToSleep <= 0) {
				r = ETIMEDOUT;
				break;
			}
			if (msecsToSleep > max_ms_slice_to_sleep)
				msecsToSleep = max_ms_slice_to_sleep;
			r = -_emnapi_wait(is_runtime_thread, (void*)addr, op, val, msecsToSleep);
		} while (r == ETIMEDOUT);
  } else {
    r = -_emnapi_wait(is_runtime_thread, (void*)addr, op, val, msecsToSleep);
  }
  return r;
}

#endif
