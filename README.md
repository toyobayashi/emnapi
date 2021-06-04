# emnapi

尝试用 JavaScript 为 emscripten 实现 [Node-API](https://nodejs.org/dist/latest-v14.x/docs/api/n-api.html)

# 构建

设置 `$EMSDK` 环境变量为 emsdk 根目录，并确保 Emscripten 工具链二进制目录（`$EMSDK/upstream/emscripten`）和 CMake 在 `$PATH` 里

未安装 `make` 的 Windows 用户请使用 Visual Studio Developer Command Prompt 跑命令（需要用到 `nmake`）

```bash
npm install
npm run rebuild
```

# 使用

Emscripten 需要 v2.0.13 以上的版本，开启 `DYNCALLS` 选项，链接上一步构建出来的 js 库

```
-I ./include
-sDYNCALLS=1
--js-library=./dist/library_napi.js
```
