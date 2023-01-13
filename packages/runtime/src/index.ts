/**
 * @packageDocumentation
 */

export { CallbackInfo, CallbackInfoStack } from './CallbackInfo'
export { createContext, Context } from './Context'
export { Deferred, type IDeferrdValue } from './Deferred'
export { DeferredStore } from './DeferredStore'
export { type ILastError, Env, type IReferenceBinding } from './env'
export { EnvStore } from './EnvStore'
export { EmnapiError, NotSupportWeakRefError, NotSupportBigIntError } from './errors'
export { Finalizer } from './Finalizer'
export { Handle, ConstHandle, HandleStore } from './Handle'
export { HandleScope } from './HandleScope'
export { RefBase, Ownership } from './RefBase'
export { Persistent } from './Persistent'
export { Reference } from './Reference'
export { RefStore } from './RefStore'
export { RefTracker } from './RefTracker'
export { ScopeStore } from './ScopeStore'
export { Store, type IStoreValue } from './Store'

export {
  isReferenceType,
  TryCatch
} from './util'

declare const __VERSION__: string

export const version = __VERSION__
