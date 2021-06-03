#ifndef __LIB_H__
#define __LIB_H__

#ifdef _MSC_VER
  #if _MSC_VER < 1910 // MSVC 2017-
    #error MSVC 2017 or later is required.
  #endif
#endif

#ifdef __cplusplus
  #ifndef EXTERN_C
    #define EXTERN_C extern "C"
  #endif
  #ifndef EXTERN_C_START
    #define EXTERN_C_START extern "C" {
  #endif
  #ifndef EXTERN_C_END
    #define EXTERN_C_END }
  #endif
#else
  #ifndef EXTERN_C
    #define EXTERN_C
  #endif
  #ifndef EXTERN_C_START
    #define EXTERN_C_START
  #endif
  #ifndef EXTERN_C_END
    #define EXTERN_C_END
  #endif
#endif

#if defined(WIN32) || defined(_WIN32) || defined(__CYGWIN__) || defined(__MINGW__)
  #ifdef LIB_BUILD_DLL
    #ifdef __GNUC__
      #define _LIB_EXPORT __attribute__((dllexport))
    #else
      #define _LIB_EXPORT __declspec(dllexport)
    #endif
  #else
    #ifdef LIB_USE_DLL
      #ifdef __GNUC__
        #define _LIB_EXPORT __attribute__((dllimport))
      #else
        #define _LIB_EXPORT __declspec(dllimport)
      #endif
    #else
      #define _LIB_EXPORT
    #endif
  #endif
  #define _LIB_LOCAL
#else
  #if __GNUC__ >= 4 && defined(LIB_BUILD_DLL)
    #define _LIB_EXPORT __attribute__((visibility("default")))
    #define _LIB_LOCAL  __attribute__((visibility("hidden")))
  #else
    #define _LIB_EXPORT
    #define _LIB_LOCAL
  #endif
#endif

#ifndef LIB_CALL
  #if defined(WIN32) || defined(_WIN32)
  #define LIB_CALL /* __stdcall */
  #else
  #define LIB_CALL /* __cdecl */
  #endif
#endif

#if defined(_MSC_VER)
  #define LIB_API(ret_type) EXTERN_C _LIB_EXPORT ret_type LIB_CALL
#elif defined(__EMSCRIPTEN__)
  #include <emscripten.h>
  #define LIB_API(ret_type) EXTERN_C _LIB_EXPORT LIB_CALL ret_type EMSCRIPTEN_KEEPALIVE
#else
  #define LIB_API(ret_type) EXTERN_C _LIB_EXPORT LIB_CALL ret_type
#endif

LIB_API(int) add(int a, int b);

#endif
