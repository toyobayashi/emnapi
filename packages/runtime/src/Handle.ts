import { isReferenceType, _global } from './util'

/** @internal */
export interface IReferenceBinding {
  wrapped: number // wrapped Reference id
  tag: [number, number, number, number] | null
  data: void_p
}

function External (this: any): void {
  Object.setPrototypeOf(this, null)
}
External.prototype = null as any

/** @internal */
export const NEVER = {}

/** @internal */
export function isObject (value: unknown): value is object {
  return value !== NEVER && typeof value === 'object' && value !== null
}

/** @internal */
export function isExternal (value: unknown): value is object {
  return value !== NEVER && isReferenceType(value) && Object.getPrototypeOf(value) === null
}

/** @internal */
export function isTypedArray (value: unknown): boolean {
  return (ArrayBuffer.isView(value)) && !(value instanceof DataView)
}

/** @internal */
export class HandleStore {
  public static ID_UNDEFINED = 1 as const
  public static ID_NULL = 2 as const
  public static ID_FALSE = 3 as const
  public static ID_TRUE = 4 as const
  public static ID_GLOBAL = 5 as const

  public static MIN_ID = 6 as const

  private readonly _values: any[] = [
    NEVER,
    undefined,
    null,
    false,
    true,
    _global
  ]

  private _next: number = HandleStore.MIN_ID

  // js object -> IReferenceBinding
  private static readonly _objWeakMap: WeakMap<object, IReferenceBinding> = new WeakMap()

  public static initObjectBinding<S extends object> (value: S): IReferenceBinding {
    const binding: IReferenceBinding = {
      wrapped: 0,
      tag: null,
      data: 0
    }
    HandleStore._objWeakMap.set(value, binding)
    return binding
  }

  public static getObjectBinding<S extends object> (value: S): IReferenceBinding {
    if (HandleStore._objWeakMap.has(value)) {
      return HandleStore._objWeakMap.get(value)!
    }
    return HandleStore.initObjectBinding(value)
  }

  public push<S> (value: S): number {
    const next = this._next
    const values = this._values
    values[next] = value
    this._next++
    return next
  }

  public pushExternal (data: void_p): number {
    const value = new (External as any)()
    const h = this.push(value)
    const binding = HandleStore.initObjectBinding(value)
    binding.data = data
    return h
  }

  public erase (start: number, end: number): void {
    this._next = start
    const values = this._values
    for (let i = start; i < end; ++i) {
      values[i] = NEVER
    }
  }

  public get (id: Ptr): any {
    return this._values[id as any]
  }

  public indexOf (value: any): number {
    return this._values.indexOf(value)
  }

  public swap (a: number, b: number): void {
    const values = this._values
    const h = values[a]
    values[a] = values[b]
    values[b] = h
  }
}
