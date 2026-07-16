// Compile-time assertions for the NapiModule['emnapi'].syncMemory return type
// (F12). Under the repo's ES2021 lib a typed array structurally satisfies
// ArrayBuffer, so a buffer-first conditional would hand a subclass input back
// as its subclass type while the runtime returns a base-class view after a
// growth. The signature therefore tests ArrayBufferView FIRST. This file emits
// no runtime code; a reverted conditional makes it fail to typecheck.
import type { NapiModule } from './index'

type SyncMemory = NapiModule['emnapi']['syncMemory']

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
type Expect<T extends true> = T

// the actual public syncMemory, resolved through NapiModule
declare const syncMemory: SyncMemory

class MyU8 extends Uint8Array { extra (): number { return 1 } }
class MyDV extends DataView<ArrayBufferLike> { extra (): number { return 1 } }

declare const myU8: MyU8
declare const myDV: MyDV
declare const u8: Uint8Array
declare const ab: ArrayBuffer
declare const sab: SharedArrayBuffer

const rSubTA = syncMemory(true, myU8)
const rSubDV = syncMemory(true, myDV)
const rU8 = syncMemory(true, u8)
const rAB = syncMemory(true, ab)
const rSAB = syncMemory(true, sab)

// @ts-expect-error a typed-array subclass method must NOT be promised on the
// result (the runtime may return a base Uint8Array after growth)
rSubTA.extra()

export type Assertions = [
  // typed-array subclass -> wide ArrayBufferView, not the subclass
  Expect<Equal<typeof rSubTA, ArrayBufferView>>,
  // DataView subclass -> wide ArrayBufferView
  Expect<Equal<typeof rSubDV, ArrayBufferView>>,
  // base-class view -> wide ArrayBufferView
  Expect<Equal<typeof rU8, ArrayBufferView>>,
  // ArrayBuffer input keeps its identity (never reconstructed)
  Expect<Equal<typeof rAB, ArrayBuffer>>,
  // SharedArrayBuffer input keeps its identity
  Expect<Equal<typeof rSAB, SharedArrayBuffer>>
]
