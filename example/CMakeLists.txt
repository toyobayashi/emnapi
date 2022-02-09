cmake_minimum_required(VERSION 3.9)

project(emnapiexample)

add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/node_modules/@tybys/emnapi")

add_executable(hello
  hello.c
)

target_link_libraries(hello emnapi)
# target_link_libraries(hello emnapi_noruntime)
target_link_options(hello PRIVATE
  "-sALLOW_MEMORY_GROWTH=1"
  "-sNODEJS_CATCH_EXIT=0"
)
