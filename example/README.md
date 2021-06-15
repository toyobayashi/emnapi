```bash
npm install
npm run build:lib
```

* Use C

  ```
  emcc -O3 -I../include --js-library=../dist/library_napi.js -sALLOW_MEMORY_GROWTH=1 -sEXPORTED_FUNCTIONS=['_malloc','_free'] -o hello.js hello.c
  ```

* Use C++

  ```
  em++ -O3 -I../include --js-library=../dist/library_napi.js -sALLOW_MEMORY_GROWTH=1 -sEXPORTED_FUNCTIONS=['_malloc','_free'] -o hello.js hello.cpp
  ```
