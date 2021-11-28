```bash
npm install -D @tybys/emnapi
```

* Use C

  ```
  mkdir build
  emcc -O3 -I../include --js-library=../dist/library_napi.js -sALLOW_MEMORY_GROWTH=1 -o build/hello.js hello.c ../src/emnapi.c
  node ./index
  ```

* Use C++

  ```
  mkdir build
  em++ -O3 -DNAPI_DISABLE_CPP_EXCEPTIONS -DNODE_ADDON_API_ENABLE_MAYBE -I../include --js-library=../dist/library_napi.js -sALLOW_MEMORY_GROWTH=1 -o build/hello.js hello.cpp ../src/emnapi.c
  node ./index
  ```

* Use CMake

  ```bash
  mkdir build
  cd build
  emcmake cmake -DCMAKE_BUILD_TYPE=Release ..
  cmake --build .
  cd ..
  node ./index
  ```

  Or in Visual Studio Developer Command Prompt:

  ```bat
  mkdir build
  cd build
  emcmake cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_MAKE_PROGRAM=nmake -G "NMake Makefiles" ..
  cmake --build .
  cd ..
  node ./index
  ```
