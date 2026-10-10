#ifndef EMNAPI_V8_IMPL_H_
#define EMNAPI_V8_IMPL_H_

#include "v8.h"
#include <vector>

#if !defined(V8_EXTERN)
#define V8_EXTERN __attribute__((__import_module__("env")))
#endif

namespace v8 {

namespace v8impl {

class ScopedLocalHandles {
 public:
  ScopedLocalHandles();
  ~ScopedLocalHandles();

  ScopedLocalHandles(const ScopedLocalHandles&) = delete;
  ScopedLocalHandles& operator=(const ScopedLocalHandles&) = delete;

 private:
  void* frame_;
};

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

template <typename T>
inline internal::Address AddressFromV8LocalValue(v8::Local<T> local) {
  if (local.IsEmpty()) {
    return static_cast<internal::Address>(Constant::kEmpty);
  }
  return internal::ValueHelper::ValueAsAddress(*local);
}

template <typename T>
inline T* HandleValuePointer(T* value) {
  return reinterpret_cast<T*>(internal::ValueHelper::ValueAsAddress(value));
}

inline std::vector<internal::Address> AddressArrayFromV8LocalValues(
    int length, const v8::Local<v8::Value>* values) {
  std::vector<internal::Address> addresses;
  if (length <= 0) return addresses;
  addresses.reserve(static_cast<size_t>(length));
  for (int i = 0; i < length; ++i) {
    addresses.push_back(AddressFromV8LocalValue(values[i]));
  }
  return addresses;
}

inline v8::Local<v8::Value> V8LocalValueFromAddress(internal::Address v) {
  if (v == static_cast<internal::Address>(Constant::kEmpty)) {
    return v8::Local<v8::Value>();
  }
  internal::Address* slot = HandleScope::CreateHandleForCurrentIsolate(v);
  v8::Local<v8::Value> local;
  static_assert(sizeof(local) == sizeof(slot),
                "Cannot convert between v8::Local<v8::Value> and handle slot");
  memcpy(static_cast<void*>(&local), &slot, sizeof(slot));
  return local;
}

}

}

#endif
