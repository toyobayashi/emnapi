#ifndef EMNAPI_V8_IMPL_H_
#define EMNAPI_V8_IMPL_H_

#include "v8.h"

#if !defined(V8_EXTERN)
#define V8_EXTERN __attribute__((__import_module__("env")))
#endif

namespace v8 {

namespace v8impl {

enum class Constant : v8::internal::Address {
  kHole,
  kEmpty,
  kUndefined,
  kNull,
  kFalse,
  kTrue,
  kGlobal,
  kEmptyString,
};

static_assert(sizeof(v8::Local<v8::Value>) == sizeof(internal::Address),
              "Cannot convert between v8::Local<v8::Value> and internal::Address");

inline internal::Address AddressFromV8LocalValue(v8::Local<v8::Value> local) {
  return reinterpret_cast<internal::Address>(*local);
}

inline v8::Local<v8::Value> V8LocalValueFromAddress(internal::Address v) {
  v8::Local<v8::Value> local;
  memcpy(static_cast<void*>(&local), &v, sizeof(v));
  return local;
}

}

}

#endif
