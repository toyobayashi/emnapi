export { createContext, getDefaultContext, Context, type CleanupHookCallbackFunction, type ContextOptions } from './Context'
export { Disposable } from './Disaposable'
export { Env, NodeEnv, type IReferenceBinding, type EnvNativeBridge } from './env'
export { EmnapiError, NotSupportWeakRefError, NotSupportBufferError } from './errors'
export { External, isExternal, getExternalValue } from './External'
export { Finalizer } from './Finalizer'
export { FunctionTemplate, Signature } from './FunctionTemplate'
export { Isolate, type IsolateOptions } from './Isolate'
export { ObjectTemplate, getInternalField, setInternalField } from './ObjectTemplate'
export { Private, setPrivate, hasPrivate, getPrivate, deletePrivate } from './Private'
export { Template } from './Template'
export { TrackedFinalizer } from './TrackedFinalizer'
export { TryCatch } from './TryCatch'
export { HandleStore } from './Handle'
export { HandleScope, type ICallbackInfo } from './HandleScope'
export { Persistent, PersistentStore, StrongRef, type PersistentValueType } from './Persistent'
export { Reference, ReferenceWithData, ReferenceWithFinalizer, ReferenceOwnership } from './Reference'
export { RefTracker } from './RefTracker'
export { ScopeStore } from './ScopeStore'
export * from './Store'
export { type Features, type Resolver, type DylinkMetadata } from './util'

export {
  isReferenceType,
  version,
  getDylinkMetadata,
  NODE_API_SUPPORTED_VERSION_MIN,
  NODE_API_SUPPORTED_VERSION_MAX,
  NAPI_VERSION_EXPERIMENTAL,
  NODE_API_DEFAULT_MODULE_API_VERSION
} from './util'
