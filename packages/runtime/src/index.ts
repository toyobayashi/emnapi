export { CallbackInfo, CallbackInfoStack } from './CallbackInfo'
export { createContext, getDefaultContext, Context, type CleanupHookCallbackFunction } from './Context'
export { Deferred, type IDeferrdValue } from './Deferred'
export { DeferredStore } from './DeferredStore'
export { Env, type IReferenceBinding } from './env'
export { EnvStore } from './EnvStore'
export { EmnapiError, NotSupportWeakRefError, NotSupportBigIntError, NotSupportBufferError } from './errors'
export { Finalizer } from './Finalizer'
export { Handle, ConstHandle, HandleStore } from './Handle'
export { HandleScope } from './HandleScope'
export { RefBase } from './RefBase'
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
