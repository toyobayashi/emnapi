declare const __EMNAPI_RUNTIME_REPLACE__: string

mergeInto(LibraryManager.library, {
  $emnapiGetDynamicCalls: function () {
    return {
      call_iii (_ptr: number, a: int32_t, b: int32_t): int32_t {
        return makeDynCall('iii', '_ptr')(a, b)
      },
      call_viii (_ptr: number, a: int32_t, b: int32_t, c: int32_t): void {
        return makeDynCall('viii', '_ptr')(a, b, c)
      },
      call_malloc (_size: size_t): void_p {
        return makeMalloc('call_malloc', '_size')
      }
    }
  },

  $emnapi: undefined,
  $emnapi__postset: __EMNAPI_RUNTIME_REPLACE__,
  $emnapi__deps: ['$emnapiGetDynamicCalls']
})
