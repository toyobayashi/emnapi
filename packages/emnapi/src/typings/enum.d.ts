import type { ReferenceOwnership as RuntimeReferenceOwnership } from '@emnapi/runtime'

declare global {
  export const enum UnwrapAction {
    KeepWrap,
    RemoveWrap
  }

  export const enum ReferenceOwnership {
    kRuntime = RuntimeReferenceOwnership.kRuntime,
    kUserland = RuntimeReferenceOwnership.kUserland
  }
}
