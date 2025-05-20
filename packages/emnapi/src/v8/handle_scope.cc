#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_open_handle_scope(Isolate* isolate);
  V8_EXTERN internal::Address _v8_handle_scope_escape(internal::Address scope, internal::Address value);
  V8_EXTERN void _v8_close_handle_scope(internal::Address scope);
}

HandleScope::HandleScope(Isolate* isolate)
  : i_isolate_(reinterpret_cast<internal::Isolate*>(isolate)),
    prev_next_(new internal::Address(_v8_open_handle_scope(isolate))),
    prev_limit_(nullptr) {}

HandleScope::~HandleScope() {
  _v8_close_handle_scope(*prev_next_);
  delete prev_next_;
}

internal::Address* HandleScope::CreateHandle(v8::internal::Isolate*, internal::Address value) {
  return new internal::Address(value);
}

EscapableHandleScopeBase::EscapableHandleScopeBase(Isolate* isolate): HandleScope(isolate), escape_slot_(nullptr) {}

internal::Address* EscapableHandleScopeBase::EscapeSlot(internal::Address* escape_value) {
  if (escape_slot_ != nullptr) {
    abort();
  }
  internal::Address* prev_next_ = *reinterpret_cast<internal::Address**>(reinterpret_cast<internal::Address>(this) + internal::kApiSystemPointerSize * 1);
  escape_slot_ = reinterpret_cast<internal::Address*>(
    _v8_handle_scope_escape(*prev_next_, reinterpret_cast<internal::Address>(escape_value)));
  return escape_slot_;
}

}
