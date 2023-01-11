cmake_minimum_required(VERSION 3.13)

project(emnapiexample)

set(EMNAPI_WORKER_POOL_SIZE 2)
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/node_modules/@tybys/emnapi")

add_executable(hello
  hello.c
)

target_link_libraries(hello emnapi)
target_link_options(hello PRIVATE
  "-sEXPORTED_FUNCTIONS=['_malloc','_free']"
)

add_executable(async
  async.c
)
target_link_libraries(async emnapi-mt)
target_compile_options(async PRIVATE "-sUSE_PTHREADS=1")
target_link_options(async PRIVATE
  "-sALLOW_MEMORY_GROWTH=1"
  "-sMODULARIZE=1"
  "-sEXPORT_NAME=emscriptenInitAsyncModule"
  "-sEXPORTED_FUNCTIONS=['_malloc','_free']"
  "-sUSE_PTHREADS=1"
  "-sPTHREAD_POOL_SIZE=8"
  "-sPTHREAD_POOL_SIZE_STRICT=2"
)
