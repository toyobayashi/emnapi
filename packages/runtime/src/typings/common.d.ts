declare interface IDynamicCalls {
  call_vi (_ptr: number, a: int32_t): void
  call_ii (_ptr: number, a: int32_t): int32_t
  call_vii (_ptr: number, a: int32_t, b: int32_t): void
  call_iii (_ptr: number, a: int32_t, b: int32_t): int32_t
  call_viii (_ptr: number, a: int32_t, b: int32_t, c: int32_t): void
  call_viiii (_ptr: number, a: int32_t, b: int32_t, c: int32_t, d: int32_t): void
  call_malloc (_source: string, _size: string | number): void_p
}
