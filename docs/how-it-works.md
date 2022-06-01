# 中文文档

[中文文档](https://emnapi-docs.vercel.app/zh/guide/)

# 源码结构

使用 NPM 8 workspace 做 monorepo。

核心实现使用 TypeScript，极少部分使用 C。

由于 Emscripten JavaScript 链接库需要交给工具链在链接时运行，最终输出的 JavaScript library 文件形如：

```js
// 链接时 Emscripten 工具链的运行时

mergeInto(LibraryManager.library, {
  $emnapi: undefined,
  // 构建脚本中把运行时代码替换到这里
  $emnapi__postset: '__EMNAPI_RUNTIME_REPLACE__',

  napi_create_external: function () {
    // 这里的代码被内联进真正的运行时
    emnapi.runtimeFunction1()
  },
  napi_create_external__deps: ['$emnapi', /* ... */],

  $myInternalFunction: function () {
    // 这里的代码被内联进真正的运行时
    emnapi.runtimeFunction2()
  },
  $myInternalFunction__deps: ['$emnapi'],
  // ...
})
```

链接器会把函数体字符串内联进输出的运行时代码中，受限于这种模式，开发时不太方便用 ESModule / CommonJS 那样的模块系统，而是使用多文件命名空间合并的方式代替模块化开发。

最核心的两部分：

- **NAPI 实现**：`packages/emnapi`，这部分代码在工具链的运行时里运行，提供的函数实现会被按需链接进运行时
- **emnapi 运行时**：`packages/runtime`，这部分代码是函数实现依赖的运行时代码

# 大体思路

## 假的 NAPI 透明指针

`napi_env`，`napi_value` 等类型实际上是指针，在 JS 中用 32 位范围内（WASM 是 32 位的）的整数 `number` 表示即可，这些 `number` 不必是真实的 WASM 内存地址，所以我写了一个 `Store` 基类来专门分配和存储指针，不同类型的指针由 Store 的子类去存储：

```ts
interface IStoreValue {
  id: number
  dispose (): void
  [x: string]: any
}

class Store<T extends IStoreValue> { /* ... */ }

// napi_env
class Env implements IStoreValue { /* ... */ }
class EnvStore extends Store<Env> { /* ... */ }

// napi_value
class Handle<S> implements IStoreValue { /* ... */ }
class HandleStore extends Store<Handle<any>> { /* ... */ }

// napi_deferred
class Deferred<T> implements IStoreValue { /* ... */ }
class DeferredStore extends Store<Deferred> { /* ... */ }

// ...
```

如上，用 `Handle` 类表示 `napi_value`，用 `Env` 类表示 `napi_env`，创建类实例的时候先要把实例塞进对应类型的 Store 里去，分配一个数字类型的 `id`。

## Handle 与 HandleScope

`HandleStore` 中可以存在多个相同原始类型值的 Handle，但是引用类型（`object` / `function`）只能存在一个 Handle，因为引用类型可以被 `napi_wrap`、`napi_add_finalizer` 等 API 绑定指针和清理回调函数，这些数据必须一一对应记录在 Handle 关联的 `Reference` 中，引用的对象和对应的 Handle 放在了 HandleStore 的 WeakMap 中，方便弱引用取回它的初始 Handle 而不是再分配一个 Handle，引用和析构清理回调的实现将会在下面的 [Reference](#Reference) 部分提到。

```ts
class Handle<S> implements IStoreValue {
  /* ... */

  public refs: Reference[]
}

class HandleStore extends Store<Handle<any>> {
  /* ... */

  // js object -> Handle
  private _objWeakMap: WeakMap<object, Handle<object>>
}
```

每个 Env 有一个 HandleScope 链表，`Handle` 需要放进当前最尾的 `HandleScope` 里面。

```ts
// napi_handle_scope
interface IHandleScope extends IStoreValue {
  readonly env: napi_env
  parent: IHandleScope | null
  child: IHandleScope | null
  handles: Array<Handle<any>>
  add<V> (value: V): Handle<V>
  addHandle<H extends Handle<any>> (handle: H): H
  clearHandles (): void
  dispose (): void
}

class HandleScope implements IHandleScope { /* ... */ }
// napi_escapable_handle_scope
class EscapableHandleScope extends HandleScope { /* ... */ }
class ScopeStore extends Store<IHandleScope> { /* ... */ }

class Env implements IStoreValue {
  private currentScope: IHandleScope | null = null
  /* ... */
}
```

当 HandleScope `dispose()` 的时候，对里面的所有 Handle 检查是否可以从 HandleStore 中删除，只有不存在引用或只存在弱引用的 Handle 可以被删除。

```ts
class HandleScope implements IHandleScope {
  /* ... */

  public clearHandles (): void {
    if (this.handles.length > 0) {
      const handles = this.handles
      for (let i = 0; i < handles.length; i++) {
        const handle = handles[i]
        handle.inScope = null
        handle.tryDispose()
      }
      this.handles = []
    }
  }

  public dispose (): void {
    if (this._disposed) return
    this._disposed = true
    this.clearHandles()
    this.parent = null
    this.child = null
    this._envObject.scopeStore.remove(this.id)
    this._envObject = undefined!
  }
}
```

```ts
class Handle<S> implements IStoreValue {
  /* ... */

  public tryDispose (): void {
    // 非全局 且 无引用或只存在弱引用 且 不在 HandleScope 中
    // 即可从 HandleStore 中删除
    if (
      this.id < HandleStore.getMinId ||
      this.inScope !== null ||
      this.refs.some(ref => ref.refcount > 0)
    ) return
    this.dispose()
  }

  public dispose (): void {
    if (this.id === 0) return
    if (this.refs.length > 0) {
      // 由 napi_create_reference / napi_wrap /
      // napi_create_external / napi_add_finalizer
      // 添加的 Reference 放在这个数组里
      // Reference 记录了绑定的数据指针和清理回调函数指针
      const refs = this.refs
      for (let i = 0; i < refs.length; i++) {
        refs[i].queueFinalizer(this.value as unknown as object)
      }
    }
    const id = this.id
    this._envObject.handleStore.remove(id)
    this.refs = []
    this.id = 0
    // 释放引用，同时解除 WeakMap 里的循环引用，等待 GC
    this.value = undefined!
  }
}
```

## EscapableHandleScope

可逃逸的 HandleScope 可以把当前 Scope 的 handle 转移到 scope 链表的上一层 scope 中，escape 方法只能调用一次。

```ts
class EscapableHandleScope extends HandleScope {
  /* ... */

  public escape (handle: number | Handle<any>): Handle<any> | null {
    if (this._escapeCalled) return null
    this._escapeCalled = true
    // 中间省略
    const h = this._envObject.handleStore.get(handleId)
    if (h && this.parent !== null) {
      this.handles.splice(index, 1)
      this._envObject.handleStore.remove(handleId)
      // 拿出来再加回去的过程回从 WeakMap 中找到最初的 Handle
      // 所以不会丢失 Reference
      const newHandle = this.parent.add(h.value)
      return newHandle
    }
    return null
  }
}
```

## Reference

这部分的实现思路比较绕而且难以理解，实现过程抄了亿点点 Node.js 源码。

`Reference` 对象记录了以下主要信息：

- `envObject: Env` Env 对象
- `id: number` napi_ref
- `refcount: number` 当前 Reference 的引用计数，大于 0 是强引用，等于 0 是弱引用，由 `napi_reference_ref` 和 `napi_reference_unref` 进行增减
- `handle_id: number` 关联的 napi_value
- `deleteSelf: boolean` 是否在清理回调调用后自动从 RefStore 中删除自己
- `finalize_callback: number` 绑定的原生清理回调函数
- `finalize_data: number` 绑定的原生数据指针
- `finalize_hint: number` 需要传入原生清理回调的指针
- `finalizeRan: boolean` 清理回调是否已被调用过
- `finalizerRegistered: boolean` 是否已注册过 FinalizationRegistry

与 `Reference` 相关的 NAPI 函数有：

- napi_create_reference
- napi_delete_reference
- napi_reference_ref
- napi_reference_unref
- napi_get_reference_value
- napi_create_external
- napi_get_value_external
- napi_add_finalizer
- napi_wrap
- napi_unwrap
- napi_remove_wrap

### napi_create_reference

往 Handle 的 refs 数组里塞一个 Reference `deleteSelf = false`，`refcount` 是由开发者指定的，有可能是强引用也有可能是弱引用。

### napi_delete_reference

调用 `doDelete` 静态方法，强引用直接删，弱引用只把 deleteSelf 设置为 true，等待 GC 触发 finalizer 被调用，被调用后才会删除 Reference

```ts
class Reference implements IStoreValue {
  /* ... */

  public static finalizationGroup = new FinalizationRegistry((ref: Reference) => {
    let error: any
    let caught = false
    if (ref.finalize_callback !== NULL) {
      const scope = ref.envObject.openScope()
      try {
        ref.envObject.callIntoModule((envObject) => {
          envObject.call_viii(ref.finalize_callback, envObject.id, ref.finalize_data, ref.finalize_hint)
          ref.finalize_callback = NULL
        })
      } catch (err) {
        caught = true
        error = err
      }
      ref.envObject.closeScope(scope)
    }
    if (ref.deleteSelf) {
      Reference.doDelete(ref)
    } else {
      ref.finalizeRan = true
      // 如果弱引用且 deleteSelf == false 则存在泄漏
      // 需要手动调用 napi_delete_referece
      // 即 Reference.doDelete(this)
    }
    if (caught) {
      throw error
    }
  })

  public queueFinalizer (value?: object): void {
    if (!Reference.finalizationGroup) return
    if (this.finalizerRegistered) return
    if (!value) {
      value = this.envObject.handleStore.get(this.handle_id)!.value as object
    }
    Reference.finalizationGroup.register(value, this, this)
    this.finalizerRegistered = true
  }

  public static doDelete (ref: Reference): void {
    if ((ref.refcount !== 0) || (ref.deleteSelf) || (ref.finalizeRan)) {
      // 强引用 或 自杀引用 或 清理回调已经调用过
      ref.envObject.refStore.remove(ref.id)
      ref.envObject.handleStore.get(ref.handle_id)?.removeRef(ref)
      Reference.finalizationGroup?.unregister(this)
    } else {
      ref.deleteSelf = true
    }
  }
}
```

### napi_get_reference_value

调用 `get()` 成员方法，看关联的 Handle 还在不在 handleStore 中，在就直接拿过来返回，不在的话再尝试从 WeakMap 里面拿 Handle 加回当前 scope 里来，并把当前 Reference 加回还原 refs 数组中。

```ts
class Reference implements IStoreValue {
  /* ... */

  private objWeakRef!: WeakRef<object> | null

  public static create (
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    deleteSelf: boolean,
    finalize_callback: napi_finalize = 0,
    finalize_data: void_p = 0,
    finalize_hint: void_p = 0
  ): Reference {
    const ref = new Reference(envObject, handle_id, initialRefcount, deleteSelf,
      finalize_callback, finalize_data, finalize_hint)
    envObject.refStore.add(ref)
    const handle = envObject.handleStore.get(handle_id)!
    handle.addRef(ref)
    if (supportFinalizer && isReferenceType(handle.value)) {
      ref.objWeakRef = new WeakRef<object>(handle.value)
    } else {
      ref.objWeakRef = null
    }
    return ref
  }

  public get (): napi_value {
    if (this.envObject.handleStore.has(this.handle_id)) {
      return this.handle_id
    } else {
      if (this.objWeakRef) {
        const obj = this.objWeakRef.deref()
        if (obj) {
          // 这一步检查 HandleStore 的 WeakMap
          this.handle_id = this.envObject.ensureHandleId(obj)
          return this.handle_id
        }
      }
      return NULL
    }
  }
}

function napi_get_reference_value (
  env: napi_env,
  ref: napi_ref,
  result: Pointer<napi_value>
): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    if (!emnapi.supportFinalizer) return envObject.setLastError(napi_status.napi_generic_failure)
    return emnapi.checkArgs(envObject, [ref, result], () => {
      const reference = envObject.refStore.get(ref)!
      const handleId = reference.get()
      if (handleId !== NULL) {
        const handle = envObject.handleStore.get(handleId)!
        handle.addRef(reference)
        envObject.getCurrentScope()?.addHandle(handle)
      }
      HEAP32[result >> 2] = handleId
      return envObject.clearLastError()
    })
  })
}
```

### napi_create_external

`ExternalHandle` 继承 `Handle` 类，里面保存了 data 指针，value 是一个无原型的空对象。

```ts
function External (this: any): void {
  Object.setPrototypeOf(this, null)
}
External.prototype = null as any

class ExternalHandle extends Handle<{}> {
  public static createExternal (envObject: Env, data: void_p = 0): ExternalHandle {
    const h = new ExternalHandle(envObject, data)
    envObject.handleStore.add(h)
    return h
  }

  private readonly _data: void_p

  public constructor (envObject: Env, data: void_p = 0) {
    super(envObject, 0, new (External as any)())
    this._data = data
  }

  public data (): void_p {
    return this._data
  }
}
```

创建 ExternalHandle 然后往 refs 数组里塞一个 `deleteSelf = true` 的弱引用。

```ts
function napi_create_external (
  env: napi_env,
  data: void_p,
  finalize_cb: napi_finalize,
  finalize_hint: void_p,
  result: Pointer<napi_value>
): napi_status {
  return emnapi.preamble(env, (envObject) => {
    if (!emnapi.supportFinalizer) return envObject.setLastError(napi_status.napi_generic_failure)
    return emnapi.checkArgs(envObject, [result], () => {
      const externalHandle = emnapi.ExternalHandle.createExternal(envObject, data)
      envObject.getCurrentScope().addHandle(externalHandle)
      emnapi.Reference.create(envObject, externalHandle.id, 0, true, finalize_cb, data, finalize_hint)
      HEAP32[result >> 2] = externalHandle.id
      return envObject.clearLastError()
    })
  })
}
```

### napi_get_value_external

直接调用 `data()` 成员方法拿到保存的指针。

### napi_add_finalizer

清理回调函数必传，往 Handle refs 数组塞一个 `deleteSelf = 不需要获取 result` 的弱引用，如果要获取 result，则需要手动调用 `napi_delete_reference`

### napi_wrap

同一个 Handle 只能 wrap 一次，清理回调函数非必传，与 napi_add_finalizer 相同，往 Handle refs 数组塞一个 `deleteSelf = 不需要获取 result` 的弱引用，如果要获取 result，则需要手动调用 `napi_delete_reference`，并且把 `ref.id` 挂在 Handle 的 `wrapped` 属性上，只能挂一个，如果对 wrapped 不为 0 的 Handle 调用 napi_wrap 回返回 napi_invalid_arg 错误码。

### napi_unwrap

根据 `wrapped` 属性，取回 napi_wrap 的添加的 Reference 的 data 指针，但不删除 Reference

### napi_remove_wrap

根据 `wrapped` 属性，取回 napi_wrap 的添加的 Reference 的 data 指针，并设置 `wrapped = 0`，调用 `doDelete` 删除 Reference

## 初始化

`NAPI_MODULE` 宏定义了模块初始化函数 `napi_register_wasm_v1`，这个函数被暴露到 Emscripten Module 对象上，可以通过 `Module._napi_register_wasm_v1` 访问到。在 Emscripten 的 `addOnInit`  运行时初始化完成的钩子里，创建 Env，打开 HandleScope，把 exports 对象加进 HandleStore 中，然后把 Env id 和 exports handle id 传进初始化函数调用。

```ts
let emnapiExports: any

function moduleRegister (): any {
  if (registered) return emnapiExports
  registered = true
  env = emnapi.Env.create(
    malloc!,
    free!,
    dynCalls.call_iii,
    dynCalls.call_viii,
    Module
  )
  const scope = env.openScope(emnapi.HandleScope)
  try {
    emnapiExports = env.callIntoModule((envObject) => {
      const exports = {}
      const exportsHandle = scope.add(exports)
      const napiValue = _napi_register_wasm_v1!(envObject.id, exportsHandle.id)
      return (!napiValue) ? undefined : envObject.handleStore.get(napiValue)!.value
    })
  } catch (err) {
    env.closeScope(scope)
    registered = false
    throw err
  }
  env.closeScope(scope)
  return emnapiExports
}

addOnInit(function (Module) {
  __EMNAPI_RUNTIME_INIT__ // 构建时被替换

  _napi_register_wasm_v1 = Module._napi_register_wasm_v1
  delete Module._napi_register_wasm_v1
  const _emnapi_runtime_init = Module._emnapi_runtime_init
  delete Module._emnapi_runtime_init

  callInStack(() => {
    const malloc_pp = stackAlloc(4)
    const free_pp = stackAlloc(4)
    const key_pp = stackAlloc(4)
    const errormessages_pp = stackAlloc(4)
    _emnapi_runtime_init(malloc_pp, free_pp, key_pp, errormessages_pp)
    const malloc_p = HEAP32[malloc_pp >> 2]
    const free_p = HEAP32[free_pp >> 2]
    const key_p = HEAP32[key_pp >> 2]
    malloc = function (size: number) {
      return dynCalls.call_ii(malloc_p, size)
    }
    free = function (ptr: number) {
      return dynCalls.call_vi(free_p, ptr)
    }
    exportsKey = (key_p ? UTF8ToString(key_p) : 'emnapiExports') || 'emnapiExports'
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    errorMessagesPtr = HEAP32[errormessages_pp >> 2] || 0
  })

  // Module.emnapiModuleRegister = moduleRegister
  let exports: any
  try {
    exports = moduleRegister()
  } catch (err) {
    if (typeof Module.onEmnapiInitialized === 'function') {
      Module.onEmnapiInitialized(err || new Error(String(err)))
      return
    } else {
      throw err
    }
  }
  Module[exportsKey] = exports
  if (typeof Module.onEmnapiInitialized === 'function') {
    Module.onEmnapiInitialized(null, exports)
  }
})
```

## 函数绑定

在 JS 中创建函数，打开新的 HandleScope，利用 Emscripten 的 dynCall 调用 C 的函数指针，传入 callbackInfo 的 id。

```ts
function $emnapiCreateFunction<F extends (...args: any[]) => any> (
  envObject: emnapi.Env,
  utf8name: Pointer<const_char>,
  length: size_t,
  cb: napi_callback,
  data: void_p
): { status: napi_status; f: F } {
  const functionName = (utf8name === NULL || length === 0)
    ? ''
    : (length === -1 ? UTF8ToString(utf8name) : UTF8ToString(utf8name, length))

  let f: F

  const makeFunction = () => function (this: any): any {
    'use strict'
    const newTarget = this && this instanceof f ? this.constructor : undefined
    const cbinfo = emnapi.CallbackInfo.create(
      envObject,
      this,
      data,
      arguments.length,
      Array.prototype.slice.call(arguments),
      newTarget
    )
    const scope = envObject.openScope(emnapi.HandleScope)
    let r: napi_value
    try {
      r = envObject.callIntoModule((envObject) => {
        const napiValue = envObject.call_iii(cb, envObject.id, cbinfo.id)
        return (!napiValue) ? undefined : envObject.handleStore.get(napiValue)!.value
      })
    } catch (err) {
      cbinfo.dispose()
      envObject.closeScope(scope)
      throw err
    }
    cbinfo.dispose()
    envObject.closeScope(scope)
    return r
  }

  if (functionName === '') {
    f = makeFunction() as F
  } else {
    if (!(/^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(functionName))) {
      return { status: napi_status.napi_invalid_arg, f: undefined! }
    }
    try {
      f = (new Function('data', 'env', 'cb', 'emnapi',
`return function ${functionName}(){` +
  '"use strict";' +
  `var newTarget=this&&this instanceof ${functionName}?this.constructor:undefined;` +
  'var cbinfo=emnapi.CallbackInfo.create(env,this,data,arguments.length,Array.prototype.slice.call(arguments),newTarget);' +
  'var scope=env.openScope(emnapi.HandleScope);' +
  'var r;' +
  'try{' +
    'r=env.callIntoModule(function(env){' +
      'var napiValue=env.call_iii(cb,env.id,cbinfo.id);' +
      'return !napiValue?undefined:env.handleStore.get(napiValue).value;' +
    '});' +
  '}catch(err){' +
    'cbinfo.dispose();' +
    'env.closeScope(scope);' +
    'throw err;' +
  '}' +
  'cbinfo.dispose();' +
  'env.closeScope(scope);' +
  'return r;' +
'};'))(data, envObject, cb, emnapi)
    } catch (_) {
      f = makeFunction() as F
      if (emnapi.canSetFunctionName) {
        Object.defineProperty(f, 'name', {
          value: functionName
        })
      }
    }
  }

  return { status: napi_status.napi_ok, f }
}

function napi_create_function (
  env: napi_env,
  utf8name: Pointer<const_char>,
  length: size_t,
  cb: napi_callback,
  data: void_p,
  result: Pointer<napi_value>
): napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result, cb], () => {
      const fresult = emnapiCreateFunction(envObject, utf8name, length, cb, data)
      if (fresult.status !== napi_status.napi_ok) return envObject.setLastError(fresult.status)
      const f = fresult.f
      const valueHandle = envObject.getCurrentScope().add(f)
      HEAP32[result >> 2] = valueHandle.id
      return envObject.getReturnStatus()
    })
  })
}
```
