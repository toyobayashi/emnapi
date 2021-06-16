```bash
npm install -D @tybys/emnapi
```

* Use C

  ```
  mkdir build
  emcc -O3 -I../include --js-library=../dist/library_napi.js -sALLOW_MEMORY_GROWTH=1 -sEXPORTED_FUNCTIONS=['_malloc','_free'] -o build/hello.js hello.c
  node ./index
  ```

* Use C++

  ```
  mkdir build
  em++ -O3 -I../include --js-library=../dist/library_napi.js -sALLOW_MEMORY_GROWTH=1 -sEXPORTED_FUNCTIONS=['_malloc','_free'] -o build/hello.js hello.cpp
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
