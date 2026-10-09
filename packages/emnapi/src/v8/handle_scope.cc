#include "v8_impl.h"
#include "internal.h"
#include <cstddef>

namespace v8 {

namespace {

constexpr size_t kLocalHandlesPerBlock = 64;

struct LocalHandleBlock {
  LocalHandleBlock* next;
  size_t used;
  internal::Address slots[kLocalHandlesPerBlock];
};

struct LocalHandleFrame {
  internal::Isolate* isolate;
  LocalHandleFrame* parent;
  LocalHandleBlock* blocks;
  LocalHandleBlock* current_block;
};

thread_local LocalHandleFrame root_local_handle_frame{};
thread_local LocalHandleFrame* current_local_handle_frame =
    &root_local_handle_frame;

LocalHandleFrame* PushLocalHandleFrame(internal::Isolate* isolate) {
  LocalHandleFrame* frame = new LocalHandleFrame{
      isolate, current_local_handle_frame, nullptr, nullptr};
  current_local_handle_frame = frame;
  return frame;
}

void PopLocalHandleFrame(LocalHandleFrame* frame) {
  if (frame == nullptr || frame == &root_local_handle_frame ||
      frame != current_local_handle_frame) {
    abort();
  }
  current_local_handle_frame = frame->parent;
  LocalHandleBlock* block = frame->blocks;
  while (block != nullptr) {
    LocalHandleBlock* next = block->next;
    delete block;
    block = next;
  }
  delete frame;
}

LocalHandleBlock* NewLocalHandleBlock(LocalHandleFrame* frame) {
  LocalHandleBlock* block = new LocalHandleBlock{};
  block->next = frame->blocks;
  frame->blocks = block;
  frame->current_block = block;
  return block;
}

internal::Address* AllocateLocalHandle(LocalHandleFrame* frame,
                                       internal::Isolate* isolate,
                                       internal::Address value) {
  if (frame == nullptr) frame = &root_local_handle_frame;
  if (frame->isolate == nullptr) frame->isolate = isolate;
  if (frame->isolate != isolate) abort();

  LocalHandleBlock* block = frame->current_block;
  if (block == nullptr || block->used == kLocalHandlesPerBlock) {
    block = NewLocalHandleBlock(frame);
  }
  block->slots[block->used] = value;
  return &block->slots[block->used++];
}

size_t CountLocalHandles(const LocalHandleFrame* frame) {
  size_t count = 0;
  for (const LocalHandleBlock* block = frame->blocks; block != nullptr;
       block = block->next) {
    count += block->used;
  }
  return count;
}

}  // namespace

namespace v8impl {

ScopedLocalHandles::ScopedLocalHandles()
    : frame_(PushLocalHandleFrame(reinterpret_cast<internal::Isolate*>(
          Isolate::GetCurrent()))) {}

ScopedLocalHandles::~ScopedLocalHandles() {
  PopLocalHandleFrame(static_cast<LocalHandleFrame*>(frame_));
}

}  // namespace v8impl

extern "C" {
  V8_EXTERN internal::Address _v8_open_handle_scope(Isolate* isolate);
  V8_EXTERN internal::Address _v8_handle_scope_escape(internal::Address scope, internal::Address value);
  V8_EXTERN void _v8_close_handle_scope(internal::Address scope);
}

HandleScope::HandleScope(Isolate* isolate)
  : i_isolate_(reinterpret_cast<internal::Isolate*>(isolate)),
    prev_next_(reinterpret_cast<internal::Address*>(_v8_open_handle_scope(isolate))),
    prev_limit_(reinterpret_cast<internal::Address*>(
        PushLocalHandleFrame(i_isolate_)))
#ifdef V8_ENABLE_CHECKS
    , scope_level_(0)
#endif
    {
#ifdef V8_ENABLE_CHECKS
      internal::HandleScopeData* current = i_isolate_->handle_scope_data();
      current->level++;
      scope_level_ = current->level;
#endif
    }

HandleScope::~HandleScope() {
#ifdef V8_ENABLE_CHECKS
  i_isolate_->handle_scope_data()->level--;
#endif
  PopLocalHandleFrame(reinterpret_cast<LocalHandleFrame*>(prev_limit_));
  _v8_close_handle_scope(reinterpret_cast<internal::Address>(prev_next_));
}

int HandleScope::NumberOfHandles(Isolate* isolate) {
  internal::Isolate* i_isolate = reinterpret_cast<internal::Isolate*>(isolate);
  if (current_local_handle_frame->isolate != i_isolate) return 0;
  return static_cast<int>(CountLocalHandles(current_local_handle_frame));
}

internal::Address* HandleScope::CreateHandleForCurrentIsolate(
    internal::Address value) {
  return CreateHandle(reinterpret_cast<internal::Isolate*>(Isolate::GetCurrent()),
                      value);
}

internal::Address* HandleScope::CreateHandle(internal::Isolate* i_isolate,
                                             internal::Address value) {
  return AllocateLocalHandle(current_local_handle_frame, i_isolate, value);
}

EscapableHandleScopeBase::EscapableHandleScopeBase(Isolate* isolate): HandleScope(isolate), escape_slot_(nullptr) {}

internal::Address* EscapableHandleScopeBase::EscapeSlot(internal::Address* escape_value) {
  if (escape_slot_ != nullptr) {
    return nullptr;
  }
  internal::Address* prev_next_ = *reinterpret_cast<internal::Address**>(reinterpret_cast<internal::Address>(this) + internal::kApiSystemPointerSize * 1);
  const internal::Address escaped_value = _v8_handle_scope_escape(
      reinterpret_cast<internal::Address>(prev_next_), *escape_value);
  if (escaped_value == 0) return nullptr;
  LocalHandleFrame* parent = current_local_handle_frame->parent;
  if (parent == nullptr) parent = &root_local_handle_frame;
  escape_slot_ = AllocateLocalHandle(
      parent, reinterpret_cast<internal::Isolate*>(GetIsolate()), escaped_value);
  return escape_slot_;
}

}
