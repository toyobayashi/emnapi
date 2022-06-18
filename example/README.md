```bash
npm install -D @tybys/emnapi
```

* Use C

  ```bash
  mkdir build
  emcc -O3 -I../include --js-library=../dist/library_napi.js -sEXPORTED_FUNCTIONS=['_malloc','_free'] -sALLOW_MEMORY_GROWTH=1 -o build/hello.js hello.c ../src/emnapi.c
  node ./index
  ```

* Use C++

  ```bash
  mkdir build

  # em++ -O3 -DNAPI_DISABLE_CPP_EXCEPTIONS -DNODE_ADDON_API_ENABLE_MAYBE -I../include --js-library=../dist/library_napi.js -sALLOW_MEMORY_GROWTH=1 -o build/hello.js hello.cpp ../src/emnapi.c

  # Compile
  emcc -O3 -I../include -c -o build/emnapi.o ../src/emnapi.c
  em++ -O3 -I../include -DNAPI_DISABLE_CPP_EXCEPTIONS -DNODE_ADDON_API_ENABLE_MAYBE -c -o build/hello.o hello.cpp

  # Link
  em++ -O3 --js-library=../dist/library_napi.js -sEXPORTED_FUNCTIONS=['_malloc','_free'] -sALLOW_MEMORY_GROWTH=1 -o build/hello.js ./build/hello.o ./build/emnapi.o

  node ./index
  ```

* Use CMake

  ```bash
  mkdir -p build
  emcmake cmake -DCMAKE_BUILD_TYPE=Release -H. -Bbuild
  cmake --build build
  node ./index
  ```

  Or in Visual Studio Developer Command Prompt:

  ```bat
  mkdir build
  emcmake cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_MAKE_PROGRAM=nmake -G "NMake Makefiles" -H. -Bbuild
  cmake --build build
  node ./index
  ```
