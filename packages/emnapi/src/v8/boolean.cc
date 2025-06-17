#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN bool _v8_boolean_value(const Boolean*);
}

void Boolean::CheckCast(v8::Data*) {}

bool Boolean::Value() const {
  return _v8_boolean_value(this);
}

}
