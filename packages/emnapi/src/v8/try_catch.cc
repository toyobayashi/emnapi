#include "v8_impl.h"

namespace v8 {

namespace {

TryCatch* current = nullptr;

}

extern "C" {
  V8_EXTERN void _v8_trycatch_construct(TryCatch*);
  V8_EXTERN void _v8_trycatch_destruct(TryCatch*);
  V8_EXTERN bool _v8_trycatch_has_caught(const TryCatch*);
  V8_EXTERN internal::Address _v8_trycatch_rethrow(TryCatch*);
  V8_EXTERN internal::Address _v8_trycatch_exception(const TryCatch*);
  V8_EXTERN void _v8_trycatch_reset(TryCatch*);
}

TryCatch::TryCatch(Isolate* isolate) {
  this->next_ = current;
  current = this;
  this->i_isolate_ = reinterpret_cast<internal::Isolate*>(isolate);
  _v8_trycatch_construct(this);
}

TryCatch::~TryCatch() {
  if (current) {
    current = current->next_;
  }
  _v8_trycatch_destruct(this);
}

bool TryCatch::HasCaught() const {
  return _v8_trycatch_has_caught(this);
}

Local<Value> TryCatch::ReThrow() {
  return v8impl::V8LocalValueFromAddress(_v8_trycatch_rethrow(this));
}

Local<Value> TryCatch::Exception() const {
  return v8impl::V8LocalValueFromAddress(_v8_trycatch_exception(this));
}

void TryCatch::Reset() {
  _v8_trycatch_reset(this);
}

}
