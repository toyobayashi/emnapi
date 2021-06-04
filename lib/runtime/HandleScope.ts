

namespace emnapi {

interface IHandleScope {
  parent: IHandleScope | null
  handles: Handle<any>[]
  add<S> (value: S): Handle<S>
  dispose (): void
}
export class HandleScope implements IHandleScope {
  public static numberOfHandles (): number {
    return Object.keys(Handle.store).length
  }

  public parent: IHandleScope | null
  public handles: Handle<any>[]
  public constructor (parentScope: IHandleScope | null) {
    this.parent = parentScope
    this.handles = []
  }

  public add<S> (value: S): Handle<S> {
    const h = Handle.create(value)
    this.handles.push(h)
    return h
  }

  public dispose () {
    const handles = this.handles.slice()
    for (let i = 0; i < handles.length; i++) {
      const handle = handles[i];
      handle.dispose()
    }
    this.handles.length = 0
    this.parent = null
  }
}

export class EscapableHandleScope extends HandleScope {
  public constructor (parentScope: IHandleScope | null) {
    super(parentScope)
  }

  public escape (handle: number | Handle<any>): Handle<any> | null {
    let exists: boolean = false
    let handleId: number
    if (typeof handle === 'number') {
      handleId = handle
      exists = this.handles.filter(h => h.id === handle).length > 0
    } else {
      handleId = handle.id
      exists = this.handles.indexOf(handle) !== -1
    }
    if (exists) {
      if (handleId in Handle.store && this.parent !== null) {
        const h = Handle.store[handleId]
        return this.parent.add(h.value)
      } else {
        return null
      }
    } else {
      return null
    }
  }
}

export const scopeList = new LinkedList<IHandleScope>()
scopeList.push(new HandleScope(null))

class TryCatch {
  private _exception: Error | null = null
  public hasCaught (): boolean {
    return this._exception !== null
  }

  public exception (): Error | null {
    return this._exception
  }

  public setError (err: Error): void {
    this._exception = err
  }

  public reset (): void {
    this._exception = null
  }

  public extractException (): Error | null {
    const e = this._exception
    this._exception = null
    return e
  }
}

export const tryCatch = new TryCatch()

function callInNewScope<Scope extends IHandleScope, Args extends any[], ReturnValue = any> (
  ScopeConstructor: new (...args: any[]) => Scope,
  fn: (scope: Scope, ...args: Args) => ReturnValue,
  ...args: Args
): ReturnValue {
  const scope = new ScopeConstructor(getCurrentScope() ?? null)
  scopeList.push(scope)
  let ret: ReturnValue
  try {
    ret = fn(scope, ...args)
  } catch (err) {
    tryCatch.setError(err)
  }
  scope.dispose()
  scopeList.pop()
  return ret!
}

export function callInNewHandleScope<Args extends any[], T = any> (fn: (scope: HandleScope, ...args: Args) => T, ...args: Args): T {
  return callInNewScope(HandleScope, fn, ...args)
}

export function callInNewEscapableHandleScope<Args extends any[], T = any> (fn: (scope: EscapableHandleScope, ...args: Args) => T, ...args: Args): T {
  return callInNewScope(EscapableHandleScope, fn, ...args)
}

export function getCurrentScope () {
  return scopeList.last.element
}

export function findHandleById (handleId: number): Handle<any> | null {
  return handleId in Handle.store ? Handle.store[handleId] : null
}

}
