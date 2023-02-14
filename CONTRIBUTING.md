# Contribute to emnapi

Please feel free to open an issue or PR anytime.

This doc will explain the structure of this project and some points need to note before contributing.

## Packages

- `packages/emnapi` (`devDependencies`)

    The main package of emnapi, including emnapi C headers, CMake configurations and
    the [Emscripten JavaScript library](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#implement-a-c-api-in-javascript) build.

    The TypeScript `module` compiler option for this package is set to `none`, because we finally need to build
    a Emscripten JavaScript library file which is designed for being used in link time. The library file is not
    a regular JavaScript file, it may contain some macros wrapped in `{{{  }}}` only available in Emscripten,
    and all function body string will be inlined to runtime code, so the module system and closures are not
    available.

    For example, the `$makeMalloc(...)` in TypeScript source code will be transformed to `{{{ makeMalloc(...) }}}`

- `packages/core` (`dependencies`)

    This package is designed for using emnapi on non-Emscripten platform, it is a trasformed output of `packages/emnapi`
    by using `packages/emnapi/transformer`.
    
    For common WebAssembly loading case, we can't use the Emscripten JavaScript library file built in `packages/emnapi` package.
    We need to manually provide imported symbols to the second parameter of `WebAssembly.instantiate`,
    so this is the use case of this package.

- `packages/runtime` (`dependencies`)

    Provide runtime implementation of `napi_value` / `napi_handle_scope` / `napi_ref` etc.

- `packages/node` (`dependencies`)

    Some APIs make sense on Node.js only, such as `napi_async_init`, `napi_async_destroy` and `napi_make_callback`.
    This package provide native Node.js bindings for JavaScript implementation as bridge.

## Environment Requirements

- Node.js `>= 16`
- npm `>= 8`
- `npm install -g node-gyp`
- [Emscripten](https://github.com/emscripten-core/emscripten) `>= 3.1.9`, `EMSDK` environment variable
- [wasi-sdk](https://github.com/WebAssembly/wasi-sdk) `latest`, `WASI_SDK_PATH` environment variable
- [CMake](https://github.com/Kitware/CMake) `>= 3.13`
- [ninja-build](https://github.com/ninja-build/ninja)

## Macro

Macro is heavily used in `packages/emnapi`, there are two kinds of macro.

- `$macroName(...)`: transformed to `{{{ macroName(...) }}}`
- `$CUSTOM_MACRO!(...)`: powered by [ts-macros](https://github.com/GoogleFeud/ts-macros)
