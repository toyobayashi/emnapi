/**
 * @packageDocumentation
 */

export { CallbackInfo } from './CallbackInfo'
export { createContext, Context } from './Context'
export { Deferred, type IDeferrdValue } from './Deferred'
export { DeferredStore } from './DeferredStore'
export { type ILastError, Env } from './env'
export { EnvStore } from './EnvStore'
export { EmnapiError, NotSupportWeakRefError, NotSupportBigIntError } from './errors'
export { Finalizer } from './Finalizer'
export { Handle, ConstHandle, HandleStore, type IReferenceBinding } from './Handle'
export { HandleScope } from './HandleScope'
export { RefBase, Ownership } from './RefBase'
export { Persistent } from './Persistent'
export { Reference } from './Reference'
export { RefStore } from './RefStore'
export { RefTracker } from './RefTracker'
export { ScopeStore } from './ScopeStore'
export { Store, type IStoreValue } from './Store'

export {
  supportReflect,
  supportFinalizer,
  supportBigInt,
  supportNewFunction,
  canSetFunctionName,
  isReferenceType,
  TryCatch,
  _setImmediate,
  utf8Decoder,
  utf16leDecoder
} from './util'

declare const __VERSION__: string

Object.defineProperty(exports, 'version', {
  configurable: true,
  enumerable: true,
  writable: false,
  value: __VERSION__
})
