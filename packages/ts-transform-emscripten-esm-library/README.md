# @emnapi/ts-transform-emscripten-esm-library

Example: see https://github.com/toyobayashi/emnapi/blob/main/packages/ts-transform-emscripten-esm-library/test

```js
const {
  transformWithOptions
} = require('@emnapi/ts-transform-emscripten-esm-library')

/** @type {string} */
const output = transformWithOptions(
  'filename.js',
  /** @type {string} */ input,
  {
    /** @type {string[]} */
    defaultLibraryFuncsToInclude: [ /* ... */],

    /** @type {string[]} */
    exportedRuntimeMethods: [ /* ... */ ],

    /** @type {boolean} */
    processDirective: true
  }
)
```

<table>
<thead>
<tr><th>input</th><th>output</th></tr>
</thead>
<tbody>
<tr>
<td>

```js
export function x () {
  return 42
}
```

</td>
<td>

```js
function _x() {
  return 42
}
mergeInto(LibraryManager.library, {
  x: _x
})
```

</td>
</tr>

<tr>
<td>

```js
export function $x () {
  return 42
}
```

</td>
<td>

```js
function x() {
  return 42
}
mergeInto(LibraryManager.library, {
  $x: x
})
```

</td>
</tr>

<tr>
<td>

```js
export const x = getX()

function getX() {
  return 42
}
```

</td>
<td>

```js
const _x = getX()
function getX() {
    return 42;
}
mergeInto(LibraryManager.library, {
  $getX: getX,
  x: "getX()",
  x__deps: ["$getX"]
});
```

</td>
</tr>

<tr>
<td>

```js
const localVar = 10

function f () {
  console.log(localVar)
}

function localFunc() {
  f()
  console.log(localVar)
}

export {
  localVar as exportedVar,
  localFunc as exportedFunc
}
```

</td>
<td>

```js
const _exportedVar = 10
function f() {
  console.log(_exportedVar)
}
function _exportedFunc() {
  f()
  console.log(_exportedVar)
}
mergeInto(LibraryManager.library, {
  exportedVar: "10",
  $f: f,
  $f__deps: ["exportedVar"],
  exportedFunc: _exportedFunc,
  exportedFunc__deps: ["$f", "exportedVar"]
})
```

</td>
</tr>

<tr>
<td>

```js
/** @__deps $external */
export function x() {}

/**
 * @__deps emscripten_resize_heap
 * @__deps $runtimeKeepalivePush
 * @__deps $runtimeKeepalivePop
 * @__sig v
 * @__postset
 * ```
 * console.log(42);
 * console.log(_y);
 * ```
 *
 * @returns {void}
 */
export function y() {
  runtimeKeepalivePush()
  runtimeKeepalivePop()
  _emscripten_resize_heap()
  return x()
}
```

</td>
<td>

```js
/** @__deps $external */
function _x() { }
/**
 * @__deps emscripten_resize_heap
 * @__deps $runtimeKeepalivePush
 * @__deps $runtimeKeepalivePop
 * @__sig v
 * @__postset
 * ```
 * console.log(42);
 * console.log(_y);
 * ```
 *
 * @returns {void}
 */
function _y() {
  runtimeKeepalivePush()
  runtimeKeepalivePop()
  _emscripten_resize_heap()
  return _x()
}
mergeInto(LibraryManager.library, {
  x: _x,
  x__deps: ["$external"],
  y: _y,
  y__deps: ["x", "emscripten_resize_heap", "$runtimeKeepalivePush", "$runtimeKeepalivePop"],
  y__sig: "v",
  y__postset: "console.log(42);\nconsole.log(_y);"
})
```

</td>
</tr>
</tbody>
</table>
