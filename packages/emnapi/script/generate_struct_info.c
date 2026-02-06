#include <stdio.h>
#include "../src/emnapi_internal.h"

#ifdef __wasm64__
#define WASM_BIT "64"
#else
#define WASM_BIT "32"
#endif

int main() {
  FILE* f = fopen("src/typings/struct-wasm" WASM_BIT ".d.ts", "w");
  if (f == NULL) {
    fprintf(stderr, "Failed to open file\n");
    return 1;
  }

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

  fclose(f);
  return 0;
}
