import { BaseArrayStore, CountIdAllocator } from './Store'
import type { Features } from './util'

export class HandleStore extends BaseArrayStore<any> {
  public static MIN_ID = 8 as const

  private _allocator: CountIdAllocator
  private _features: Features
  private _erase: (start: number, end: number, weak: boolean) => void
  private _deref: (id: number | bigint) => any
  public minRefSlotId: number

  public constructor (features: Features) {
    const minRefSlotId = HandleStore.MIN_ID + 1
    super(minRefSlotId + 1)
    this.minRefSlotId = minRefSlotId

    this._features = features
    this._allocator = new CountIdAllocator(HandleStore.MIN_ID)

    this._values[GlobalHandle.HOLE] = undefined
    this._values[GlobalHandle.EMPTY] = undefined
    this._values[GlobalHandle.UNDEFINED] = undefined
    this._values[GlobalHandle.NULL] = null
    this._values[GlobalHandle.FALSE] = false
    this._values[GlobalHandle.TRUE] = true
    this._values[GlobalHandle.GLOBAL] = features.getGlobalThis()
    this._values[GlobalHandle.EMPTY_STRING] = ''

    for (let i = HandleStore.MIN_ID; i < this._values.length; ++i) {
      this._values[i] = undefined
    }

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
          const value = this._values[id as number]
          if (Number(id) >= this._allocator.next && value && typeof value.deref === 'function') {
            return value.deref()
          }
          return value
        }
      : (id: number | bigint): any => {
          return this._values[id as number]
        }
  }

  public override deref<R = any> (id: number | bigint): R | undefined {
    return this._deref(id) as R
  }

  public push<S> (value: S): number {
    const next = this._allocator.aquire()
    if (next >= this.minRefSlotId) {
      this._expandLocalHandleArea()
    }
    this._values[next] = value
    return next
  }

  public override dealloc (i: number | bigint): void {
    this._values[i as number] = undefined
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

  private _expandLocalHandleArea (): void {
    const oldLength = this._values.length
    const oldMinRefSlotId = this.minRefSlotId
    const newMinRefSlotId = Math.ceil(oldMinRefSlotId * 1.5)
    const delta = newMinRefSlotId - oldMinRefSlotId
    this._values.length += delta
    this.minRefSlotId = newMinRefSlotId

    for (let i = oldLength - 1; i >= oldMinRefSlotId; --i) {
      const value = this._values[i]
      this._values[i + delta] = value
      this._values[i] = undefined
    }
    for (let j = oldLength; j < newMinRefSlotId; ++j) {
      this._values[j] = undefined
    }
  }
}
