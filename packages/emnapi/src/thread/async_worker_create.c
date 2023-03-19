#include <stddef.h>
#include <stdint.h>

void* calloc(size_t n, size_t size);

extern unsigned char __heap_base;
extern unsigned char __data_end;
extern unsigned char __global_base;
extern __attribute__((__weak__)) unsigned char __stack_high;
extern __attribute__((__weak__)) unsigned char __stack_low;

struct worker_args {
  void* stack;
  // void* tls_base;
};

// extern void __wasm_init_tls(void*);

// void* __copy_tls(unsigned char *mem) {
// 	size_t tls_align = __builtin_wasm_tls_align();
// 	volatile void* tls_base = __builtin_wasm_tls_base();
// 	mem += tls_align;
// 	mem -= (uintptr_t)mem & (tls_align-1);
// 	__wasm_init_tls(mem);
//   	__asm__("local.get %0\n"
// 			"global.set __tls_base\n"
// 			:: "r"(tls_base));
// 	return mem;
// }

__attribute__((visibility("default")))
void* emnapi_async_worker_create() {
  size_t args_size = sizeof(struct worker_args);
  size_t size = args_size;

  // if (__builtin_wasm_tls_size()) {
  //   size += __builtin_wasm_tls_size() + __builtin_wasm_tls_align() - 1;
  // }

  ptrdiff_t stack_size = 0;
  if (&__stack_high) {
		stack_size = &__stack_high - &__stack_low;
  } else {
		unsigned char *sp;
		__asm__(
			".globaltype __stack_pointer, i32\n"
			"global.get __stack_pointer\n"
			"local.set %0\n"
			: "=r"(sp));
		stack_size = sp > &__global_base ? &__heap_base - &__data_end : (ptrdiff_t)&__global_base;
	}

  stack_size = stack_size < (8 << 20) ? stack_size : (8 << 20);
  size += stack_size;

  void* block = calloc(1, size);
  if (!block) return 0;

  // void* tls_base = block + args_size;
  // if (__builtin_wasm_tls_size()) {
  //   __copy_tls(tls_base);
  // }

  struct worker_args* args = (struct worker_args*)block;

  args->stack = block + size;
  // args->tls_base = tls_base;
  return block;
}
