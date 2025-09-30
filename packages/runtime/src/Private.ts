const globalPrivateRegistry = new Map<string, Private>()

const map = new WeakMap<Private, WeakMap<object, any>>()

export class Private {
  private _name: string

  public constructor (name: string) {
    this._name = name
  }

  public name (): string {
    return this._name
  }

  static forApi (name: string): Private {
    let privateInstance = globalPrivateRegistry.get(name)
    if (!privateInstance) {
      privateInstance = new Private(name)
      globalPrivateRegistry.set(name, privateInstance)
    }
    return privateInstance
  }
}

export function setPrivate (obj: any, key: Private, value: any): void {
  if (!(key instanceof Private)) {
    throw new TypeError('Expected key to be an instance of Private')
  }
  let m = map.get(key)
  if (!m) {
    m = new WeakMap<object, any>()
    map.set(key, m)
  }
  m.set(obj, value)
}

export function getPrivate (obj: any, key: Private): any {
  if (!(key instanceof Private)) {
    throw new TypeError('Expected key to be an instance of Private')
  }
  const m = map.get(key)
  if (!m) {
    return undefined
  }
  return m.get(obj)
}

export function hasPrivate (obj: any, key: Private): boolean {
  if (!(key instanceof Private)) {
    throw new TypeError('Expected key to be an instance of Private')
  }
  const m = map.get(key)
  if (!m) {
    return false
  }
  return m.has(obj)
}

export function deletePrivate (obj: any, key: Private): boolean {
  if (!(key instanceof Private)) {
    throw new TypeError('Expected key to be an instance of Private')
  }
  const m = map.get(key)
  if (!m || !m.has(obj)) {
    return true
  }
  return m.delete(obj)
}
