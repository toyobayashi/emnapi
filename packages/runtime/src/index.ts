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
export { Handle, ExternalHandle, HandleStore } from './Handle'
export { HandleScope } from './HandleScope'
export { RefBase, Ownership } from './RefBase'
export { Persistent } from './Global'
export { Reference } from './Reference'
export { RefStore } from './RefStore'
export { RefTracker } from './RefTracker'
export { ScopeStore } from './ScopeStore'
export { Store, type IStoreValue, type IReusableStoreValue, ReusableStackStore } from './Store'

export {
  supportReflect,
  supportFinalizer,
  supportBigInt,
  supportNewFunction,
  canSetFunctionName,
  isReferenceType,
  TryCatch,
  _setImmediate,
  construct
} from './util'

declare const __VERSION__: string

Object.defineProperty(exports, 'version', {
  configurable: true,
  enumerable: true,
  writable: false,
  value: __VERSION__
})
