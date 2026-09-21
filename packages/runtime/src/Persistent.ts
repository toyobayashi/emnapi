import { Disposable } from './Disaposable'
import type { Isolate } from './Isolate'
import { ArrayStore } from './Store'
import { supportFinalizer } from './util'

export class PersistentStore extends ArrayStore<Persistent<any>> {
  private _recyleList: (number | bigint)[] = []
  private _recyleListHead = 0

  constructor (initialCapacity: number = 4) {
    super(initialCapacity)
  }

  public markUnused (id: number | bigint): void {
    this._recyleList.push(id)
  }

  public recycle () {
    while (this._recyleListHead < this._recyleList.length) {
      const id = this._recyleList[this._recyleListHead++]
      if (this._recyleListHead === this._recyleList.length) {
        this._recyleList.length = 0
        this._recyleListHead = 0
      }
      const persistent = this.deref(id)!
      persistent.dispose()
    }
  }
}

interface GlobalIdentity {
  reference: Persistent<any>
  count: number
  pending: boolean
  retired: boolean
  objectLike: boolean
  primitiveValue?: unknown
}

/** @internal */
export class GlobalIdentityStore {
  private readonly _isolate: Isolate
  private readonly _objects = new WeakMap<object, GlobalIdentity>()
  private readonly _primitives = new Map<unknown, GlobalIdentity>()
  private readonly _bySlot = new Map<number, GlobalIdentity>()

  public constructor (isolate: Isolate) {
    this._isolate = isolate
  }

  public acquire (value: unknown): number {
    const objectLike = value !== null &&
      (typeof value === 'object' || typeof value === 'function')
    const table = objectLike ? this._objects : this._primitives
    let identity = table.get(value as never)
    if (identity?.retired) identity = undefined

    if (!identity) {
      const reference = new Persistent(this._isolate, value)
      // The actual V8 Persistent owns the value. The canonical identity must
      // not keep a weakly-held value alive by itself.
      if (objectLike) reference.setWeak(undefined, () => {})
      identity = {
        reference,
        count: 0,
        pending: false,
        retired: false,
        objectLike,
        primitiveValue: objectLike ? undefined : value
      }
      table.set(value as never, identity)
      this._bySlot.set(reference.slot(), identity)
    }

    identity.count++
    identity.pending = false
    return identity.reference.slot()
  }

  public retain (slot: number | bigint): void {
    const identity = this._bySlot.get(Number(slot))
    if (!identity || identity.retired) return
    identity.count++
    identity.pending = false
  }

  public release (slot: number | bigint): void {
    const identity = this._bySlot.get(Number(slot))
    if (!identity || identity.retired || identity.count === 0) return
    if (--identity.count !== 0 || identity.pending) return
    identity.pending = true
    Promise.resolve().then(() => {
      identity.pending = false
      if (identity.count !== 0 || identity.retired) return
      identity.retired = true
      this._bySlot.delete(identity.reference.slot())
      if (!identity.objectLike) {
        this._primitives.delete(identity.primitiveValue)
      }
      identity.reference.dispose()
    })
  }
}

export class StrongRef<T> extends Disposable {
  private _value: T

  constructor (value: T) {
    super()
    this._value = value
  }

  deref (): T {
    return this._value
  }

  dispose (): void {
    this._value = undefined!
  }
}

export type PersistentValueType<T> = StrongRef<T> | WeakRef<T extends object ? T : never> | undefined

export class Persistent<T> extends Disposable {
  private _param: any
  private _callback: ((param: any) => void) | undefined
  private _isolate: Isolate
  private _slotId: number
  public id: number

  private static readonly _registry = supportFinalizer
    ? new FinalizationRegistry((value: Persistent<any>) => {
      value.setSlot(undefined)
      const callback = value._callback
      const param = value._param
      value._callback = undefined
      value._param = undefined
      if (typeof callback === 'function') {
        callback(param)
      }
    })
    : undefined!

  constructor (isolate: Isolate, ...args: [T] | []) {
    super()
    this.id = 0
    this._isolate = isolate
    isolate.insertRef(this)
    this._slotId = 0x80000000 + this.id
    this.setSlot(args.length === 0 ? undefined : new StrongRef(args[0]))
  }

  override dispose (): void {
    this.reset()
    this.deleteSlot()
    this._isolate.globalHandleStore.dealloc(this.id)
    this._isolate = undefined!
    this.id = 0
  }

  copy (): Persistent<T> {
    const target = new Persistent<T>(this._isolate)
    target._param = this._param
    target._callback = this._callback
    const ref = this.getSlot()
    if (ref instanceof StrongRef) {
      target.setSlot(new StrongRef(ref.deref()))
    } else if (ref instanceof WeakRef) {
      const value = ref.deref()
      if (value === undefined) {
        target.setSlot(undefined)
      } else {
        target.setSlot(new StrongRef(value))
        target.setWeak(this._param, this._callback!)
      }
    } else {
      target.setSlot(undefined)
    }

    return target
  }

  move (to: Persistent<T>): void {
    if (this === to) return
    to.reset()
    to._param = this._param
    to._callback = this._callback
    to._isolate = this._isolate
    to.setSlot(this.getSlot())
    this.reset()
    this.setSlot(undefined)
  }

  slot (): number {
    return this._slotId
  }

  getSlot (): PersistentValueType<T> {
    return this._isolate.getRefSlotValue(this.slot())
  }

  setSlot (ref: PersistentValueType<T>): void {
    this._isolate.setRefSlotValue(this.slot(), ref)
  }

  deleteSlot (): void {
    this._isolate.deleteRefSlotValue(this.slot())
  }

  setWeak<P> (param: P, callback: (param: P) => void): void {
    const ref = this.getSlot()
    if (!supportFinalizer || ref === undefined || ref instanceof WeakRef) return
    const value = ref.deref()
    try {
      Persistent._registry.register(value as any, this, this)
      const weakRef = new WeakRef<any>(value)
      ref.dispose()
      this.setSlot(weakRef)
      this._param = param
      this._callback = callback
    } catch (err) {
      if (typeof value === 'symbol') {
        // Currently ignore symbols, remain them strong reference

        // may change to this in the future:
        /*
        if (supportWeakSymbol) {
          // global symbols (created by `Symbol.for`) throw
          throw err
        } else {
          // weakly reference symbol failed
          // ignored, remain strong reference
        }
        */
      } else {
        throw err
      }
    }
  }

  clearWeak (): void {
    const ref = this.getSlot()
    if (!supportFinalizer || ref === undefined) return
    if (ref instanceof WeakRef) {
      try {
        Persistent._registry.unregister(this)
      } catch (_) {}
      this._param = undefined
      this._callback = undefined
      const value = ref.deref()
      if (value === undefined) {
        this.setSlot(value)
      } else {
        this.setSlot(new StrongRef(value as T))
      }
    }
  }

  reset (): void {
    if (supportFinalizer) {
      try {
        Persistent._registry.unregister(this)
      } catch (_) {}
    }
    this._param = undefined
    this._callback = undefined
    const ref = this.getSlot()
    if (ref instanceof StrongRef) {
      ref.dispose()
    }
    this.setSlot(undefined)
  }

  resetTo (value: T): void {
    this.reset()
    this.setSlot(new StrongRef(value))
  }

  isEmpty (): boolean {
    return this.getSlot() === undefined
  }

  deref (): T | undefined {
    const ref = this.getSlot()
    if (ref === undefined) return undefined
    return ref.deref()
  }
}
