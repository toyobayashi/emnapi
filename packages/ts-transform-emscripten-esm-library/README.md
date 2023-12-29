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
    processDirective: true,

    /** @type {boolean} */
    processParseTools: true,

    /** @type {string} */
    runtimeModuleSpecifier: 'emscripten:runtime',

    /** @type {string} */
    parseToolsModuleSpecifier: 'emscripten:parse-tools'
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
(typeof addToLibrary === "function"
  ? addToLibrary :
  (...args) => mergeInto(
    LibraryManager.library, ...args)
)({
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
(typeof addToLibrary === "function"
  ? addToLibrary :
  (...args) => mergeInto(
    LibraryManager.library, ...args)
)({
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
(typeof addToLibrary === "function"
  ? addToLibrary :
  (...args) => mergeInto(
    LibraryManager.library, ...args)
)({
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
(typeof addToLibrary === "function"
  ? addToLibrary :
  (...args) => mergeInto(
    LibraryManager.library, ...args)
)({
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
(typeof addToLibrary === "function"
  ? addToLibrary :
  (...args) => mergeInto(
    LibraryManager.library, ...args)
)({
  x: _x,
  x__deps: ["$external"],
  y: _y,
  y__deps: [
    "x",
    "emscripten_resize_heap",
    "$runtimeKeepalivePush",
    "$runtimeKeepalivePop"
  ],
  y__sig: "v",
  y__postset: "console.log(42);\nconsole.log(_y);"
})
```

</td>
</tr>

<tr>
<td>

```js
export function getPointerSize () {
  let result
  // #if MEMORY64
  result = 8
  // #else
  result = 4
  // #endif
  return result
}
```

</td>
<td>

```js
function _getPointerSize() {
  let result
#if MEMORY64
  result = 8
#else
  result = 4
#endif
  return result
}
(typeof addToLibrary === "function"
  ? addToLibrary :
  (...args) => mergeInto(
    LibraryManager.library, ...args)
)({
  getPointerSize: _getPointerSize
})
```

</td>
</tr>

<tr>
<td>

```js
import {
  from64,
  makeSetValue,
  SIZE_TYPE,
  POINTER_SIZE
} from 'emscripten:parse-tools'
import {
  wasmMemory,
  HEAPU8
} from 'emscripten:runtime'

export function getPointerSize (ret) {
  from64('ret')
  makeSetValue('ret', 0, POINTER_SIZE, SIZE_TYPE)
  console.log(HEAPU8.buffer === wasmMemory.buffer)
  return POINTER_SIZE
}
```

</td>
<td>

```js
function _getPointerSize(ret) {
  {{{ from64('ret') }}}
  {{{ makeSetValue('ret', 0, POINTER_SIZE, SIZE_TYPE) }}}
  console.log(HEAPU8.buffer === wasmMemory.buffer)
  return {{{ POINTER_SIZE }}}
}
(typeof addToLibrary === "function"
  ? addToLibrary :
  (...args) => mergeInto(
    LibraryManager.library, ...args)
)({
  getPointerSize: _getPointerSize
});
```

</td>
</tr>
</tbody>
</table>
