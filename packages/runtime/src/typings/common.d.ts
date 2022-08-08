declare type Ptr = number | bigint

declare interface IDynamicCalls {
  call_vp (_ptr: Ptr, a: Ptr): void
  call_vpp (_ptr: Ptr, a: Ptr, b: Ptr): void
  call_ppp (_ptr: Ptr, a: Ptr, b: Ptr): Ptr
  call_vpip (_ptr: Ptr, a: Ptr, b: number, c: Ptr): void
  call_vppp (_ptr: Ptr, a: Ptr, b: Ptr, c: Ptr): void
  call_vpppp (_ptr: Ptr, a: Ptr, b: Ptr, c: Ptr, d: Ptr): void
}
