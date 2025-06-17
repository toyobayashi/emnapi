import type { Context } from './Context'

export const internalField = new WeakMap<object, any[]>()

/** @public */
export function getInternalField (instance: object, index: number) {
  return internalField.get(instance)?.[index]
}

/** @public */
export function setInternalField (instance: object, index: number, value: any) {
  let fields = internalField.get(instance)
  if (fields) {
    fields[index] = value
  } else {
    fields = []
    fields[index] = value
    internalField.set(instance, fields)
  }
}

/** @public */
export class ObjectTemplate {
  public Ctor: any
  public ctx: Context

  public internalFieldCount: number = 0

  constructor (
    ctx: Context,
    Ctor: any
  ) {
    this.ctx = ctx
    this.Ctor = Ctor ?? Object
  }

  setInternalFieldCount (value: number) {
    this.internalFieldCount = value
  }

  newInstance (_context: any) {
    const { ctx, Ctor, internalFieldCount } = this
    let instance: any
    try {
      instance = new Ctor()
    } catch (err) {
      ctx.throwException(err)
    }
    internalField.set(instance, Array(internalFieldCount))
    return instance
  }
}
