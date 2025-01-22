/** @public */
export interface External extends Record<any, any> {}

const externalValue = new WeakMap<External, number | bigint>()

/** @public */
export function isExternal (object: unknown): object is External {
  return externalValue.has(object as any)
}

/** @public */ // eslint-disable-next-line @typescript-eslint/no-redeclare
export const External = (() => {
  function External (this: External, value: number | bigint): void {
    Object.setPrototypeOf(this, null)
    externalValue.set(this, value)
  }
  External.prototype = null as any
  return External as unknown as {
    new (value: number | bigint): External
    prototype: null
  }
})()

/** @public */
export function getExternalValue (external: External): number | bigint {
  if (!isExternal(external)) {
    throw new TypeError('not external')
  }
  return externalValue.get(external)!
}
