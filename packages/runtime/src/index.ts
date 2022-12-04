/**
 * @packageDocumentation
 */

export { CallbackInfo } from './CallbackInfo'
export { CallbackInfoStore } from './CallbackInfoStore'
export { createContext, Context } from './Context'
export { Deferred, IDeferrdValue } from './Deferred'
export { DeferredStore } from './DeferredStore'
export { ILastError, Env } from './env'
export { EnvStore } from './EnvStore'
export { EmnapiError, NotSupportWeakRefError, NotSupportBigIntError } from './errors'
export { EnvReferenceMode, Finalizer } from './Finalizer'
export { Handle, ExternalHandle, HandleStore } from './Handle'
export { IHandleScope, HandleScope, EscapableHandleScope } from './HandleScope'
export { RefBase } from './RefBase'
export { Reference } from './Reference'
export { RefStore } from './RefStore'
export { RefTracker } from './RefTracker'
export { ScopeStore } from './ScopeStore'
export { Store, IStoreValue } from './Store'

export {
  supportReflect,
  supportFinalizer,
  supportBigInt,
  supportNewFunction,
  canSetFunctionName,
  isReferenceType,
  TryCatch
} from './util'

declare const __VERSION__: string

Object.defineProperty(exports, 'version', {
  configurable: true,
  enumerable: true,
  writable: false,
  value: __VERSION__
})
