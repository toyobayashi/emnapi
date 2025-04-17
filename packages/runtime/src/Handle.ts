import { BaseArrayStore, CountIdAllocator } from './Store'
import { Features } from './util'

export class HandleStore extends BaseArrayStore<any> {
  public static MIN_ID = 6 as const

  private _allocator: CountIdAllocator

  public constructor (features: Features) {
    super(HandleStore.MIN_ID)
    this._allocator = new CountIdAllocator(HandleStore.MIN_ID)

    this._values[GlobalHandle.UNDEFINED] = undefined
    this._values[GlobalHandle.NULL] = null
    this._values[GlobalHandle.FALSE] = false
    this._values[GlobalHandle.TRUE] = true
    this._values[GlobalHandle.GLOBAL] = features.getGlobalThis()
  }

  public push<S> (value: S): number {
    const next = this._allocator.aquire()
    this._values[next] = value
    return next
  }

  public override dealloc (i: number | bigint): void {
    this._values[i as number] = undefined
  }

  public erase (start: number, end: number): void {
    this._allocator.next = start
    for (let i = start; i < end; ++i) {
      this.dealloc(i)
    }
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
