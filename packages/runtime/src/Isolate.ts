import { ScopeStore } from './ScopeStore'
import { HandleStore } from './Handle'
import { TryCatch } from './TryCatch'
import { FunctionTemplate, Signature } from './FunctionTemplate'
import { ObjectTemplate, setInternalField, getInternalField, getInternalFieldCount } from './ObjectTemplate'
import { Persistent } from './Persistent'
import { detectFeatures, type Resolver, type Features } from './util'
import type { HandleScope, ICallbackInfo } from './HandleScope'
import { Reference, ReferenceOwnership } from './Reference'
import { External, getExternalValue, isExternal } from './External'

export interface IsolateOptions {
  features?: Partial<Features>
}

export class Isolate {
  private _lastException
  private _globalThis: typeof globalThis
  private _scopeStore: ScopeStore
  private _handleStore: HandleStore
  public readonly features: Features

  constructor (options?: IsolateOptions) {
    this.features = detectFeatures(options?.features)
    this._globalThis = this.features.getGlobalThis()
    this._lastException = new Persistent<any>()
    this._scopeStore = new ScopeStore()
    this._handleStore = new HandleStore(this.features)
  }

  //#region Local handles
  public napiValueFromJsValue (value: unknown): number | bigint {
    switch (value) {
      case undefined: return Constant.UNDEFINED
      case null: return Constant.NULL
      case false: return Constant.FALSE
      case true: return Constant.TRUE
      case '': return Constant.EMPTY_STRING
      case this._globalThis: return Constant.GLOBAL
      default: return this._scopeStore.currentScope.add(value)
    }
  }

  public jsValueFromNapiValue<T = any> (napiValue: number | bigint): T | undefined {
    return this._handleStore.deepDeref(napiValue)
  }

  public deleteHandle (napiValue: number | bigint): void {
    this._handleStore.dealloc(napiValue)
  }
  //#endregion

  //#region References
  public createReference (value: any): Reference {
    return Reference.create(
      this,
      undefined,
      value,
      1,
      ReferenceOwnership.kUserland
    )
  }

  public getRef (ref: napi_ref): Reference | undefined {
    return this._handleStore.deref(ref)
  }
  //#endregion

  //#region Exception handling
  public getTryCatch (address: number | bigint): TryCatch | undefined {
    return TryCatch.deref(address)
  }

  public pushTryCatch (address: number | bigint): TryCatch {
    const tryCatch = new TryCatch(address)
    return tryCatch
  }

  public popTryCatch (address: number | bigint): void {
    if (address !== TryCatch.top?.id) {
      throw new Error('TryCatch mismatch')
    }
    return TryCatch.pop()
  }

  public setLastException (err: any) {
    this._lastException.resetTo(err)
  }

  public throwException (err: any) {
    if (TryCatch.top) {
      TryCatch.top.setError(err)
    } else {
      this.setLastException(err)
    }
    return err
  }

  public hasPendingException (): boolean {
    return !this._lastException.isEmpty()
  }

  public getAndClearLastException (): any {
    const err = this._lastException.deref()
    this._lastException.reset()
    return err
  }
  //#endregion

  //#region Templates
  public createSignature (template: FunctionTemplate): Signature {
    return new Signature(template)
  }

  public createObjectTemplate (constructor: any) {
    return new ObjectTemplate(this, constructor)
  }

  public setInternalField (obj: any, index: number, value: any): void {
    setInternalField(obj, index, value)
  }

  public getInternalField (obj: any, index: number): any {
    return getInternalField(obj, index)
  }

  public getInternalFieldCount (obj: any): number {
    return getInternalFieldCount(obj)
  }

  public createFunctionTemplate (
    callback: (info: napi_callback_info, v8FunctionCallback: Ptr) => Ptr,
    v8FunctionCallback: Ptr,
    data: any,
    signature?: Signature
  ) {
    const functionTemplate = new FunctionTemplate(
      this,
      callback,
      v8FunctionCallback,
      data,
      signature
    )

    return functionTemplate
  }
  //#endregion

  //#region Scope management
  public getCurrentScope (): HandleScope {
    return this._scopeStore.currentScope
  }

  public openScope (): HandleScope {
    return this._scopeStore.openScope(this._handleStore)
  }

  public closeScope (_scope?: HandleScope): void {
    this._scopeStore.closeScope()
  }

  public getHandleScope (scope: napi_handle_scope): HandleScope | undefined {
    return this._scopeStore.deref(scope)
  }

  public getCallbackInfo (info: napi_callback_info): ICallbackInfo {
    return this._scopeStore.deref(info)!.callbackInfo
  }
  //#endregion

  //#region External
  public createExternal (data: number | bigint): External {
    return new External(data)
  }

  public getExternalValue (external: External): number | bigint {
    return getExternalValue(external)
  }

  public isExternal (value: unknown): boolean {
    return isExternal(value)
  }
  //#endregion

  //#region Promises
  public createResolver<T> (): Resolver<T> {
    return this.features.withResolvers.call<PromiseConstructor, [], Resolver<T>>(Promise)
  }
  //#endregion
}
