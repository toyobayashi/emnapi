cmake_minimum_required(VERSION 3.9)

project(emnapi)

add_library(emnapi STATIC "${CMAKE_CURRENT_SOURCE_DIR}/src/emnapi.c")
target_include_directories(emnapi PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/include")
target_link_options(emnapi INTERFACE "--js-library=${CMAKE_CURRENT_SOURCE_DIR}/dist/library_napi.js")

add_library(emnapi_noruntime STATIC "${CMAKE_CURRENT_SOURCE_DIR}/src/emnapi.c")
target_include_directories(emnapi_noruntime PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/include")
target_link_options(emnapi_noruntime INTERFACE "--js-library=${CMAKE_CURRENT_SOURCE_DIR}/dist/library_napi_no_runtime.js")