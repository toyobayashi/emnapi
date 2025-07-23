import type { Isolate } from './Isolate'
import type { FunctionTemplate } from './FunctionTemplate'
import type { ObjectTemplate } from './ObjectTemplate'

/** @public */
export enum PropertyAttribute {
  /** None. */
  None = 0,
  /** ReadOnly, i.e., not writable. */
  ReadOnly = 1 << 0,
  /** DontEnum, i.e., not enumerable. */
  DontEnum = 1 << 1,
  /** DontDelete, i.e., not configurable. */
  DontDelete = 1 << 2
}

/** @public */
export class Template {
  protected ctx: Isolate
  protected _properties: Map<string | symbol, [any, number]> = new Map()

  public constructor (ctx: Isolate) {
    this.ctx = ctx
  }

  public set (name: string | symbol, value: any, attr: number): void {
    this._properties.set(name, [value, attr])
  }

  protected _addPropertiesToInstance (instance: any): void {
    this._properties.forEach((property, name) => {
      const [v, attr] = property
      if (v instanceof Template) {
        if ('newInstance' in v) {
          Object.defineProperty(instance, name, {
            value: (v as ObjectTemplate).newInstance(6),
            writable: !(attr & 1), // ReadOnly
            enumerable: !(attr & 2), // DontEnum
            configurable: !(attr & 4) // DontDelete
          })
        } else if ('getFunction' in v) {
          Object.defineProperty(instance, name, {
            value: (v as FunctionTemplate).getFunction(),
            writable: !(attr & 1), // ReadOnly
            enumerable: !(attr & 2), // DontEnum
            configurable: !(attr & 4) // DontDelete
          })
        }
      } else {
        Object.defineProperty(instance, name, {
          value: v,
          writable: !(attr & 1), // ReadOnly
          enumerable: !(attr & 2), // DontEnum
          configurable: !(attr & 4) // DontDelete
        })
      }
    })
  }
}
