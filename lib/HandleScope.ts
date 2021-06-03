// Handle

interface IHandleScope {
  handles: IHandle[]
  dispose (): void
}

interface IEscapableHandleScope {
  parent: IHandleScope | IEscapableHandleScope
  handles: IHandle[]
  escape (handle: number | IHandle): IHandle | null
  dispose (): void
}

declare var HandleScope: new () => IHandleScope
declare var EscapableHandleScope: new (parentScope: IHandleScope | IEscapableHandleScope) => IEscapableHandleScope
declare var rootScope: IHandleScope
declare var scopeList: ILinkedList<IHandleScope>

declare var __webpack_public_path__: any
declare var global: typeof globalThis

declare function callInNewHandleScope<Args extends any[], T = any> (fn: (scope: IHandleScope, ...args: Args) => T, ...args: Args): T
declare function callInNewEscapableHandleScope<Args extends any[], T = any> (fn: (scope: IEscapableHandleScope, ...args: Args) => T, ...args: Args): T
declare function getCurrentScope (): IHandleScope | IEscapableHandleScope
declare function findHandleById (handleId: number): IHandle | null

mergeInto(LibraryManager.library, {
  $HandleScope__deps: [],
  $HandleScope: function () {
    HandleScope = class HandleScope {
      public handles: IHandle[]
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
  },

  $EscapableHandleScope__deps: ['$Handle', '$rootScope'],
  $EscapableHandleScope: function () {
    EscapableHandleScope = class EscapableHandleScope {
      public parent: IHandleScope | IEscapableHandleScope
      public handles: IHandle[]
      public constructor (parentScope: IHandleScope | IEscapableHandleScope) {
        this.handles = []
        this.parent = parentScope
      }
      public escape (handle: number | IHandle): IHandle | null {
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
  },

  $rootScope: function () {
    rootScope = new HandleScope()
    rootScope.handles.push(new Handle(undefined))
    rootScope.handles.push(new Handle(null))
    rootScope.handles.push(new Handle(false))
    rootScope.handles.push(new Handle(true))
    rootScope.handles.push(new Handle(NaN))
    rootScope.handles.push(new Handle((function (defaultValue) {
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
    
      return g || defaultValue;
    })(this)))
  },
  $rootScope__deps: ['$Handle', '$HandleScope'],

  $scopeList: function () {
    scopeList = new LinkedList()
    scopeList.push(rootScope)
  },
  $scopeList__deps: ['$LinkedList', '$rootScope'],

  $callInNewHandleScope: function (fn) {
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
  },
  $callInNewHandleScope__deps: ['$HandleScope', '$scopeList'],

  $callInNewEscapableHandleScope: function (fn) {
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
  },
  $callInNewEscapableHandleScope__deps: ['$EscapableHandleScope', '$scopeList', '$getCurrentScope'],

  $getCurrentScope: function () {
    return ((scopeList as any)._last as IListNode<IHandleScope | IEscapableHandleScope>).element
  },
  $getCurrentScope__deps: ['$scopeList'],

  $findHandleById: function (handleId: number): IHandle | null {
    let node = ((scopeList as any)._last as IListNode<IHandleScope | IEscapableHandleScope>)
    let scope: IHandleScope | IEscapableHandleScope
    while (node.element !== undefined) {
      scope = node.element
      const arr = scope.handles.filter(h => h.id === handleId)
      if (arr.length > 0) {
        return arr[0]
      }
      node = node.prev
    }
    return null
  },
  $findHandleById__deps: ['$scopeList'],
})
