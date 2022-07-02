export {
  preamble,
  checkArgs,
  checkEnv,
  supportFinalizer,
  supportBigInt,
  supportNewFunction,
  canSetFunctionName,
  TypedArray,
  TryCatch
} from './util'

export {
  envStore,
  EnvStore
} from './EnvStore'

export {
  scopeStore,
  ScopeStore
} from './ScopeStore'

export {
  refStore,
  RefStore
} from './RefStore'

export {
  deferredStore,
  DeferredStore
} from './DeferredStore'

export {
  cbInfoStore,
  CallbackInfoStore
} from './CallbackInfoStore'

export {
  Store,
  IStoreValue
} from './Store'

export {
  Handle,
  ExternalHandle,
  handleStore,
  HandleStore
} from './Handle'

export {
  HandleScope,
  EscapableHandleScope,
  IHandleScope
} from './HandleScope'

export {
  Env,
  ILastError,
  IInstanceData
} from './env'

export {
  Reference
} from './Reference'

export {
  Deferred,
  IDeferrdValue
} from './Deferred'

export {
  CallbackInfo
} from './CallbackInfo'

export {
  getCurrentScope,
  addToCurrentScope,
  openScope,
  closeScope
} from './scope'

declare const __VERSION__: string

Object.defineProperty(exports, 'version', {
  configurable: true,
  enumerable: true,
  writable: false,
  value: __VERSION__
})
