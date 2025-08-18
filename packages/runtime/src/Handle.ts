import type { PersistentValueType } from './Persistent'
import { BaseArrayStore, CountIdAllocator } from './Store'
import type { Features } from './util'

export class HandleStore extends BaseArrayStore<any> {
  public static MIN_ID = 8 as const

  private _allocator: CountIdAllocator
  private _features: Features

  /** @internal */
  public readonly refValues: Map<number, PersistentValueType<any>>

  private _erase: (start: number, end: number, weak: boolean) => void
  private _deref: (id: number | bigint) => any

  public constructor (features: Features) {
    super(HandleStore.MIN_ID)
    this._features = features
    this._allocator = new CountIdAllocator(HandleStore.MIN_ID)
    this.refValues = new Map()

    this._values[Constant.UNDEFINED] = undefined
    this._values[Constant.NULL] = null
    this._values[Constant.FALSE] = false
    this._values[Constant.TRUE] = true
    this._values[Constant.GLOBAL] = features.getGlobalThis()
    this._values[Constant.EMPTY_STRING] = ''

    const _erase = (start: number, end: number): void => {
      for (let i = start; i < end; ++i) {
        this.dealloc(i)
      }
    }

    this._erase = this._features.finalizer
      ? this._features.weakSymbol
        ? (start: number, end: number, weak: boolean): void => {
            if (!weak) {
              _erase(start, end)
            } else {
              for (let i = start; i < end; ++i) {
                const value = this._values[i]
                const type = typeof value
                if ((type === 'object' && value !== null) || (type === 'function') || (type === 'symbol' && Symbol.keyFor(value) === undefined)) {
                  this._values[i] = new WeakRef(value)
                }
              }
            }
          }
        : (start: number, end: number, weak: boolean): void => {
            if (!weak) {
              _erase(start, end)
            } else {
              for (let i = start; i < end; ++i) {
                const value = this._values[i]
                const type = typeof value
                if ((type === 'object' && value !== null) || (type === 'function')) {
                  this._values[i] = new WeakRef(value)
                }
              }
            }
          }
      : _erase

    this._deref = this._features.finalizer
      ? (id: number | bigint): any => {
          id = Number(id)
          if (id < 0) {
            const ref = this.refValues.get(id)
            if (ref === undefined) return undefined
            return ref.deref()
          }
          const value = this._values[id]
          if (value instanceof WeakRef && this.isOutOfScope(id)) {
            return value.deref()
          }
          return value
        }
      : (id: number | bigint): any => {
          id = Number(id)
          if (id < 0) {
            const ref = this.refValues.get(id)
            if (ref === undefined) return undefined
            return ref.deref()
          }
          const value = this._values[id as number]
          return value
        }
  }

  public isOutOfScope (id: number): boolean {
    return id >= this._allocator.next
  }

  public deepDeref<R = any> (id: number | bigint): R | undefined {
    return this._deref(id) as R
  }

  public push<S> (value: S): number {
    const next = this._allocator.aquire()
    this._values[next] = value
    return next
  }

  public erase (start: number, end: number, weak: boolean): void {
    this._allocator.next = start
    this._erase(start, end, weak)
  }

  public swap (a: number, b: number): void {
    const values = this._values
    const h = values[a]!
    values[a] = values[b]
    // values[a]!.id = Number(a)
    values[b] = h
    // h.id = Number(b)
  }
}
