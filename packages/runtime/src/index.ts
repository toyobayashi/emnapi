export {
  preamble,
  checkArgs,
  checkEnv,
  supportFinalizer,
  supportBigInt,
  supportNewFunction,
  canSetFunctionName,
  envStore,
  TypedArray,
  TryCatch,
  EnvStore
} from './util'

export {
  Store,
  IStoreValue
} from './Store'

export {
  Handle,
  ExternalHandle,
  HandleStore
} from './Handle'

export {
  HandleScope,
  EscapableHandleScope,
  IHandleScope,
  ScopeStore
} from './HandleScope'

export {
  Env,
  ILastError,
  IInstanceData
} from './env'

export {
  Reference,
  RefStore
} from './Reference'

export {
  Deferred,
  DeferredStore,
  IDeferrdValue
} from './Deferred'

export {
  CallbackInfo,
  CallbackInfoStore
} from './CallbackInfo'

declare const __VERSION__: string

Object.defineProperty(exports, 'version', {
  configurable: true,
  enumerable: true,
  writable: false,
  value: __VERSION__
})
