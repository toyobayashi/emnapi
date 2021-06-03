#include <stdio.h>
#include "lib.h"

#include "../include/node_api.h"

static napi_value _init(napi_env env, napi_value exports) {
  printf("init\n");
  napi_value one;
  napi_create_int32(env, 1, &one);
  return one;
}

NAPI_MODULE(emnapitest, _init)

// int main () {
//   printf("%d\n", add(1, 2));
//   napi_create_int32(0, 1, 0);
//   return 0;
// }
