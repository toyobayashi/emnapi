#include <algorithm>
#include <cstring>

#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_array_buffer_view_buffer(
      internal::Address view);
  V8_EXTERN size_t _v8_array_buffer_view_byte_offset(
      internal::Address view);
  V8_EXTERN size_t _v8_array_buffer_view_byte_length(
      internal::Address view);
  V8_EXTERN size_t _v8_array_buffer_byte_length(
      internal::Address buffer);
  V8_EXTERN internal::Address _v8_array_buffer_get_backing_store(
      internal::Address buffer, size_t* byte_length);
}

BackingStore::BackingStore()
    : data_(nullptr), byte_length_(0) {}

BackingStore::BackingStore(void* data, size_t byte_length)
    : data_(data), byte_length_(byte_length) {}

BackingStore::~BackingStore() = default;

void* BackingStore::Data() const {
  return data_;
}

size_t BackingStore::ByteLength() const {
  return byte_length_;
}

size_t ArrayBuffer::ByteLength() const {
  return _v8_array_buffer_byte_length(
      reinterpret_cast<internal::Address>(this));
}

std::shared_ptr<BackingStore> ArrayBuffer::GetBackingStore() {
  size_t byte_length = 0;
  internal::Address data = _v8_array_buffer_get_backing_store(
      reinterpret_cast<internal::Address>(this), &byte_length);
  return std::shared_ptr<BackingStore>(
      new BackingStore(reinterpret_cast<void*>(data), byte_length));
}

void* ArrayBuffer::Data() const {
  return const_cast<ArrayBuffer*>(this)->GetBackingStore()->Data();
}

Local<ArrayBuffer> ArrayBufferView::Buffer() {
  internal::Address value = _v8_array_buffer_view_buffer(
      reinterpret_cast<internal::Address>(this));
  if (!value) return Local<ArrayBuffer>();
  return v8impl::V8LocalValueFromAddress(value).As<ArrayBuffer>();
}

size_t ArrayBufferView::ByteOffset() {
  return _v8_array_buffer_view_byte_offset(
      reinterpret_cast<internal::Address>(this));
}

size_t ArrayBufferView::ByteLength() {
  return _v8_array_buffer_view_byte_length(
      reinterpret_cast<internal::Address>(this));
}

size_t ArrayBufferView::CopyContents(void* dest, size_t byte_length) {
  Local<ArrayBuffer> buffer = Buffer();
  if (buffer.IsEmpty()) return 0;
  std::shared_ptr<BackingStore> store = buffer->GetBackingStore();
  const size_t length = std::min(byte_length, ByteLength());
  if (length != 0) {
    std::memcpy(dest, static_cast<char*>(store->Data()) + ByteOffset(), length);
  }
  return length;
}

bool ArrayBufferView::HasBuffer() const {
  return !const_cast<ArrayBufferView*>(this)->Buffer().IsEmpty();
}

}  // namespace v8
