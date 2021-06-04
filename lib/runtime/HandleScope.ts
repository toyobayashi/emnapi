declare var __webpack_public_path__: any
declare var global: typeof globalThis

namespace emnapi {

export class HandleScope {
  public handles: Handle[]
  public constructor () {
    this.handles = []
  }
  public dispose () {
    const handles = this.handles.slice()
    for (let i = 0; i < handles.length; i++) {
      const handle = handles[i];
      handle.dispose()
    }
    this.handles.length = 0
  }
}

export class EscapableHandleScope {
  public parent: HandleScope | EscapableHandleScope
  public handles: Handle[]
  public constructor (parentScope: HandleScope | EscapableHandleScope) {
    this.handles = []
    this.parent = parentScope
  }
  public escape (handle: number | Handle): Handle | null {
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
      if (handleId in Handle.store) {
        const value = Handle.store[handleId]
        const newHandle = new Handle(value)
        this.parent.handles.push(newHandle)
        return newHandle
      }
    } else {
      return null
    }
    return null
  }
  public dispose () {
    const handles = this.handles.slice()
    for (let i = 0; i < handles.length; i++) {
      const handle = handles[i];
      handle.dispose()
    }
    this.handles.length = 0
  }
}


export const rootScope = new HandleScope()
rootScope.handles.push(new Handle(undefined))
rootScope.handles.push(new Handle(null))
rootScope.handles.push(new Handle(false))
rootScope.handles.push(new Handle(true))
rootScope.handles.push(new Handle(NaN))
rootScope.handles.push(new Handle((function () {
  var g;
  g = (function () { return this; })();

  try {
    g = g || new Function('return this')();
  } catch (_) {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof __webpack_public_path__ === 'undefined') {
      if (typeof global !== 'undefined') return global;
    }
    if (typeof window !== 'undefined') return window;
    if (typeof self !== 'undefined') return self;
  }

  return g;
})()))

export const scopeList = new LinkedList()
scopeList.push(rootScope)

export function callInNewHandleScope<Args extends any[], T = any> (fn: (scope: HandleScope, ...args: Args) => T, ...args: Args): T
export function callInNewHandleScope<Args extends any[], T = any> (fn: (scope: HandleScope, ...args: Args) => T): T {
  const scope = new HandleScope()
  scopeList.push(scope)
  const args = Array.prototype.slice.call(arguments, 1)
  args.unshift(scope)
  let ret: any
  try {
    ret = fn.apply(null, args)
  } catch (err) {
    // TODO
    scope.dispose()
    scopeList.pop()
    throw err
  }
  scope.dispose()
  scopeList.pop()
  return ret
}

export function callInNewEscapableHandleScope<Args extends any[], T = any> (fn: (scope: EscapableHandleScope, ...args: Args) => T, ...args: Args): T
export function callInNewEscapableHandleScope<Args extends any[], T = any> (fn: (scope: EscapableHandleScope, ...args: Args) => T): T {
  const scope = new EscapableHandleScope(getCurrentScope())
  scopeList.push(scope)
  const args = Array.prototype.slice.call(arguments, 1)
  args.unshift(scope)
  let ret: any
  try {
    ret = fn.apply(null, args)
  } catch (err) {
    // TODO
    scope.dispose()
    scopeList.pop()
    throw err
  }
  scope.dispose()
  scopeList.pop()
  return ret
}

export function getCurrentScope () {
  return ((scopeList as any)._last as ListNode<HandleScope | EscapableHandleScope>).element
}

export function findHandleById (handleId: number): Handle | null {
  let node = ((scopeList as any)._last as ListNode<HandleScope | EscapableHandleScope>)
  let scope: HandleScope | EscapableHandleScope
  while (node.element !== undefined) {
    scope = node.element
    const arr = scope.handles.filter(h => h.id === handleId)
    if (arr.length > 0) {
      return arr[0]
    }
    node = node.prev
  }
  return null
}

}
