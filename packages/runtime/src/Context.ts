import { ScopeStore } from './ScopeStore'
import { HandleStore } from './Handle'
import type { Handle } from './Handle'
import type { HandleScope } from './HandleScope'
import { Env, newEnv } from './env'
import {
  _global,
  supportReflect,
  supportFinalizer,
  supportWeakSymbol,
  supportBigInt,
  supportNewFunction,
  canSetFunctionName,
  _setImmediate,
  _setTimeout,
  _clearTimeout,
  _releaseTimerHandle,
  _Buffer,
  _MessageChannel,
  type Features,
  version,
  NODE_API_SUPPORTED_VERSION_MAX,
  NAPI_VERSION_EXPERIMENTAL,
  NODE_API_DEFAULT_MODULE_API_VERSION
} from './util'
import { NotSupportWeakRefError, NotSupportBufferError } from './errors'
import { Reference, ReferenceWithData, ReferenceWithFinalizer, type ReferenceOwnership } from './Reference'
import { type IDeferrdValue, Deferred } from './Deferred'
import { Store } from './Store'
import { TrackedFinalizer } from './TrackedFinalizer'
import { ExternalMemory } from './ExternalMemory'

export type CleanupHookCallbackFunction = number | ((arg: number) => void)

class CleanupHookCallback {
  constructor (
    public envObject: Env,
    public fn: CleanupHookCallbackFunction,
    public arg: number,
    public order: number
  ) {}
}

class CleanupQueue {
  private readonly _cleanupHooks = [] as CleanupHookCallback[]
  private _cleanupHookCounter = 0

  public empty (): boolean {
    return this._cleanupHooks.length === 0
  }

  public add (envObject: Env, fn: CleanupHookCallbackFunction, arg: number): void {
    if (this._cleanupHooks.filter((hook) => (hook.envObject === envObject && hook.fn === fn && hook.arg === arg)).length > 0) {
      throw new Error('Can not add same fn and arg twice')
    }
    this._cleanupHooks.push(new CleanupHookCallback(envObject, fn, arg, this._cleanupHookCounter++))
  }

  public remove (envObject: Env, fn: CleanupHookCallbackFunction, arg: number): void {
    for (let i = 0; i < this._cleanupHooks.length; ++i) {
      const hook = this._cleanupHooks[i]
      if (hook.envObject === envObject && hook.fn === fn && hook.arg === arg) {
        this._cleanupHooks.splice(i, 1)
        return
      }
    }
  }

  public drain (): void {
    const hooks = this._cleanupHooks.slice()
    hooks.sort((a, b) => (b.order - a.order))
    for (let i = 0; i < hooks.length; ++i) {
      const cb = hooks[i]
      const index = this._cleanupHooks.indexOf(cb)
      if (index === -1) {
        continue
      }
      this._cleanupHooks.splice(index, 1)
      if (typeof cb.fn === 'number') {
        cb.envObject.makeDynCall_vp(cb.fn)(cb.arg)
      } else {
        cb.fn(cb.arg)
      }
    }
  }

  public dispose (): void {
    this._cleanupHooks.length = 0
    this._cleanupHookCounter = 0
  }
}

class NodejsWaitingRequestCounter {
  private refHandle?: {
    ref?: unknown
    unref?: unknown
    close?: unknown
  }

  private readonly timerBackends: Array<{
    setTimeout: (callback: () => void, delay: number) => unknown
    clearTimeout: (timeout: unknown) => void
  }>

  private timer?: {
    token: object
    handle: unknown
    clearTimeout: (timeout: unknown) => void
  }

  private refHandleEpoch = 0
  private refHandleReconciling = false
  private timerEpoch = 0
  private count = 0

  constructor (
    MessageChannelCtor: typeof globalThis.MessageChannel | undefined,
    timerBackend?: {
      setTimeout: (callback: () => void, delay: number) => unknown
      clearTimeout: (timeout: unknown) => void
    },
    fallbackTimerBackend?: {
      setTimeout: (callback: () => void, delay: number) => unknown
      clearTimeout: (timeout: unknown) => void
    }
  ) {
    if (MessageChannelCtor) {
      try {
        this.refHandle = new MessageChannelCtor().port1 as unknown as import('worker_threads').MessagePort
      } catch (_) {}
    }
    this.timerBackends = timerBackend ? [timerBackend] : []
    if (fallbackTimerBackend) {
      this.timerBackends.push(fallbackTimerBackend)
    }
  }

  private callHandleMethod (
    handle: unknown,
    method: 'close' | 'ref' | 'unref'
  ): boolean {
    if (
      !handle ||
      (typeof handle !== 'object' && typeof handle !== 'function')
    ) {
      return false
    }
    try {
      const fn = (handle as Record<string, unknown>)[method]
      if (typeof fn !== 'function') {
        return false
      }
      fn.call(handle)
      return true
    } catch (_) {
      return false
    }
  }

  private discardRefHandle (
    handle: NonNullable<NodejsWaitingRequestCounter['refHandle']>
  ): void {
    if (this.refHandle === handle) {
      this.refHandle = undefined
    }
    if (!this.callHandleMethod(handle, 'close')) {
      this.callHandleMethod(handle, 'unref')
    }
  }

  private reconcileRefHandle (): void {
    this.refHandleEpoch++
    if (this.refHandleReconciling) {
      return
    }
    this.refHandleReconciling = true
    try {
      while (true) {
        const epoch = this.refHandleEpoch
        const shouldRef = this.count !== 0
        const handle = this.refHandle
        if (!handle) {
          if (shouldRef) {
            if (!this.timer) {
              this.startTimer()
            }
          } else {
            this.stopTimer()
          }
          if (this.refHandleEpoch === epoch) {
            return
          }
          continue
        }

        if (shouldRef) {
          const referenced = this.callHandleMethod(handle, 'ref')
          if (
            this.refHandleEpoch !== epoch ||
            this.count === 0 ||
            this.refHandle !== handle
          ) {
            continue
          }
          if (!referenced) {
            this.discardRefHandle(handle)
            continue
          }
          this.stopTimer()
          if (
            this.refHandleEpoch === epoch &&
            this.count !== 0 &&
            this.refHandle === handle
          ) {
            return
          }
          continue
        }

        this.stopTimer()
        if (
          this.refHandleEpoch !== epoch ||
          this.count !== 0 ||
          this.refHandle !== handle
        ) {
          continue
        }
        const unreferenced = this.callHandleMethod(handle, 'unref')
        if (
          this.refHandleEpoch !== epoch ||
          this.count !== 0 ||
          this.refHandle !== handle
        ) {
          continue
        }
        if (!unreferenced) {
          this.discardRefHandle(handle)
          continue
        }
        return
      }
    } finally {
      this.refHandleReconciling = false
    }
  }

  private releaseTimer (
    clearTimeout: (timeout: unknown) => void,
    handle: unknown
  ): void {
    try {
      clearTimeout(handle)
      return
    } catch (_) {}
    if (!this.callHandleMethod(handle, 'close')) {
      this.callHandleMethod(handle, 'unref')
    }
  }

  private startTimer (): void {
    const epoch = ++this.timerEpoch
    for (let i = 0; i < this.timerBackends.length; i++) {
      if (this.count === 0 || this.timerEpoch !== epoch) {
        return
      }
      const backend = this.timerBackends[i]
      const token = {}
      let scheduling = true
      let firedSynchronously = false
      const callback = (): void => {
        if (scheduling) {
          firedSynchronously = true
          return
        }
        if (this.timer?.token !== token) {
          return
        }
        this.timer = undefined
        if (this.count !== 0) {
          this.startTimer()
        }
      }
      let handle: unknown
      try {
        handle = backend.setTimeout(callback, 0x7fffffff)
      } catch (_) {
        scheduling = false
        continue
      }
      scheduling = false
      if (this.count === 0 || this.timerEpoch !== epoch) {
        this.releaseTimer(backend.clearTimeout, handle)
        return
      }
      if (firedSynchronously) {
        this.releaseTimer(backend.clearTimeout, handle)
        continue
      }
      this.timer = {
        token,
        handle,
        clearTimeout: backend.clearTimeout
      }
      return
    }
  }

  private stopTimer (): void {
    this.timerEpoch++
    const timer = this.timer
    if (!timer) {
      return
    }
    this.timer = undefined
    this.releaseTimer(timer.clearTimeout, timer.handle)
  }

  public increase (): void {
    if (this.count !== 0) {
      this.count++
      return
    }
    // Callers acquire native keepalive state before incrementing this counter,
    // so scheduler and host-handle failures must never escape.
    this.count = 1
    this.reconcileRefHandle()
  }

  public decrease (): void {
    if (this.count === 0) return
    this.count--
    if (this.count !== 0) {
      return
    }
    this.reconcileRefHandle()
  }
}

export interface ContextOptions {
  onExternalMemoryChange?: (current: bigint, old: bigint, delta: bigint) => any
  features?: Partial<Features>
  /**
   * Whether to destroy the context automatically on Node.js `beforeExit`.
   *
   * @defaultValue `true`
   */
  autoDestroy?: boolean
}

export class Context {
  private _isStopping = false
  private _canCallIntoJs = true
  private _suppressDestroy = false

  public envStore = new Store<Env>()
  public scopeStore = new ScopeStore()
  public refStore = new Store<Reference>()
  public deferredStore = new Store<Deferred>()
  public handleStore = new HandleStore()
  private readonly refCounter?: NodejsWaitingRequestCounter
  private readonly cleanupQueue: CleanupQueue
  private readonly _externalMemory: ExternalMemory
  private readonly beforeExitListener?: () => void

  public feature: Features = {
    supportReflect,
    supportFinalizer,
    supportWeakSymbol,
    supportBigInt,
    supportNewFunction,
    canSetFunctionName,
    setImmediate: _setImmediate,
    setTimeout: _setTimeout,
    clearTimeout: _clearTimeout,
    Buffer: _Buffer,
    MessageChannel: _MessageChannel
  }

  public constructor (options?: ContextOptions) {
    const featureOverrides = options?.features
    const setTimeoutOverride = featureOverrides?.setTimeout
    const clearTimeoutOverride = featureOverrides?.clearTimeout
    const hasSetTimeoutOverride =
      setTimeoutOverride !== undefined && setTimeoutOverride !== null
    const hasClearTimeoutOverride =
      clearTimeoutOverride !== undefined && clearTimeoutOverride !== null
    this.feature = {
      ...this.feature,
      ...featureOverrides,
      setImmediate: featureOverrides?.setImmediate ?? this.feature.setImmediate,
      setTimeout: setTimeoutOverride ?? this.feature.setTimeout,
      clearTimeout: hasSetTimeoutOverride
        ? clearTimeoutOverride ?? _releaseTimerHandle
        : this.feature.clearTimeout
    }
    this.cleanupQueue = new CleanupQueue()
    this._externalMemory = new ExternalMemory(options?.onExternalMemoryChange)
    if (typeof process === 'object' && process !== null && typeof process.once === 'function') {
      const useFeatureTimer =
        !hasSetTimeoutOverride || hasClearTimeoutOverride
      const timerBackend =
        useFeatureTimer &&
        typeof this.feature.setTimeout === 'function' &&
        typeof this.feature.clearTimeout === 'function'
          ? {
              setTimeout: this.feature.setTimeout.bind(this.feature),
              clearTimeout: this.feature.clearTimeout.bind(this.feature)
            }
          : undefined
      this.refCounter = new NodejsWaitingRequestCounter(
        this.feature.MessageChannel,
        timerBackend,
        typeof _setTimeout === 'function'
          ? {
              setTimeout: _setTimeout,
              clearTimeout: _clearTimeout
            }
          : undefined
      )
      if (options?.autoDestroy !== false) {
        this.beforeExitListener = () => {
          if (!this._suppressDestroy) {
            this.destroy()
          }
        }
        process.once('beforeExit', this.beforeExitListener)
      }
    }
  }

  /**
   * Suppress the destroy on `beforeExit` event in Node.js.
   * Call this method if you want to keep the context and
   * all associated {@link Env | Env} alive,
   * this also means that cleanup hooks will not be called.
   * After call this method, you should call
   * {@link Context.destroy | `Context.prototype.destroy`} method manually.
   */
  public suppressDestroy (): void {
    this._suppressDestroy = true
    if (
      this.beforeExitListener &&
      typeof process === 'object' &&
      process !== null &&
      typeof process.removeListener === 'function'
    ) {
      process.removeListener('beforeExit', this.beforeExitListener)
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getRuntimeVersions () {
    return {
      version,
      NODE_API_SUPPORTED_VERSION_MAX,
      NAPI_VERSION_EXPERIMENTAL,
      NODE_API_DEFAULT_MODULE_API_VERSION
    }
  }

  createNotSupportWeakRefError (api: string, message: string): NotSupportWeakRefError {
    return new NotSupportWeakRefError(api, message)
  }

  createNotSupportBufferError (api: string, message: string): NotSupportBufferError {
    return new NotSupportBufferError(api, message)
  }

  public createReference (
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership
  ): Reference {
    return Reference.create(
      envObject,
      handle_id,
      initialRefcount,
      ownership
    )
  }

  public createReferenceWithData (
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    data: void_p
  ): Reference {
    return ReferenceWithData.create(
      envObject,
      handle_id,
      initialRefcount,
      ownership,
      data
    )
  }

  public createReferenceWithFinalizer (
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    finalize_callback: napi_finalize = 0,
    finalize_data: void_p = 0,
    finalize_hint: void_p = 0
  ): Reference {
    return ReferenceWithFinalizer.create(
      envObject,
      handle_id,
      initialRefcount,
      ownership,
      finalize_callback,
      finalize_data,
      finalize_hint
    )
  }

  createDeferred<T = any> (value: IDeferrdValue<T>): Deferred<T> {
    return Deferred.create(this, value)
  }

  public adjustAmountOfExternalAllocatedMemory (changeInBytes: number | bigint): bigint {
    return this._externalMemory.adjust(changeInBytes)
  }

  public createEnv (
    filename: string,
    moduleApiVersion: number,
    makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void,
    makeDynCall_vp: (cb: Ptr) => (a: Ptr) => void,
    abort: (msg?: string) => never,
    nodeBinding?: any
  ): Env {
    return newEnv(this, filename, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort, nodeBinding)
  }

  createTrackedFinalizer (
    envObject: Env,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ): TrackedFinalizer {
    return TrackedFinalizer.create(envObject, finalize_callback, finalize_data, finalize_hint)
  }

  getCurrentScope (): HandleScope | null {
    return this.scopeStore.currentScope
  }

  addToCurrentScope<V> (value: V): Handle<V> {
    return this.scopeStore.currentScope.add(value)
  }

  openScope (envObject?: Env): HandleScope {
    const scope = this.scopeStore.openScope(this.handleStore)
    if (envObject) envObject.openHandleScopes++
    return scope
  }

  closeScope (envObject?: Env, _scope?: HandleScope): void {
    if (envObject && envObject.openHandleScopes === 0) return
    this.scopeStore.closeScope()
    if (envObject) envObject.openHandleScopes--
  }

  ensureHandle<S> (value: S): Handle<S> {
    switch (value as any) {
      case undefined: return HandleStore.UNDEFINED as any
      case null: return HandleStore.NULL as any
      case true: return HandleStore.TRUE as any
      case false: return HandleStore.FALSE as any
      case _global: return HandleStore.GLOBAL as any
      default: break
    }

    return this.addToCurrentScope(value)
  }

  public addCleanupHook (envObject: Env, fn: CleanupHookCallbackFunction, arg: number): void {
    this.cleanupQueue.add(envObject, fn, arg)
  }

  public removeCleanupHook (envObject: Env, fn: CleanupHookCallbackFunction, arg: number): void {
    this.cleanupQueue.remove(envObject, fn, arg)
  }

  public runCleanup (): void {
    while (!this.cleanupQueue.empty()) {
      this.cleanupQueue.drain()
    }
  }

  public increaseWaitingRequestCounter (): void {
    this.refCounter?.increase()
  }

  public decreaseWaitingRequestCounter (): void {
    this.refCounter?.decrease()
  }

  public setCanCallIntoJs (value: boolean): void {
    this._canCallIntoJs = value
  }

  public setStopping (value: boolean): void {
    this._isStopping = value
  }

  public canCallIntoJs (): boolean {
    return this._canCallIntoJs && !this._isStopping
  }

  /**
   * Destroy the context and call cleanup hooks.
   * Associated {@link Env | Env} will be destroyed.
   */
  public destroy (): void {
    if (
      this.beforeExitListener &&
      typeof process === 'object' &&
      process !== null &&
      typeof process.removeListener === 'function'
    ) {
      process.removeListener('beforeExit', this.beforeExitListener)
    }
    this.setStopping(true)
    this.setCanCallIntoJs(false)
    this.runCleanup()
  }
}

let defaultContext: Context

export function createContext (options?: ContextOptions): Context {
  return new Context(options)
}

export function getDefaultContext (): Context {
  if (!defaultContext) {
    defaultContext = createContext()
  }
  return defaultContext
}
