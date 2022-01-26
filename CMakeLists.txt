cmake_minimum_required(VERSION 3.9)

project(emnapi)

option(EMNAPI_LIB_NO_RUNTIME "Use library without runtime code" OFF)

add_library(emnapi STATIC "${CMAKE_CURRENT_SOURCE_DIR}/src/emnapi.c")

target_include_directories(emnapi PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/include")

if(EMNAPI_LIB_NO_RUNTIME)
  target_link_options(emnapi INTERFACE "--js-library=${CMAKE_CURRENT_SOURCE_DIR}/dist/library_napi_no_runtime.js")
else()
  target_link_options(emnapi INTERFACE "--js-library=${CMAKE_CURRENT_SOURCE_DIR}/dist/library_napi.js")
endif()
