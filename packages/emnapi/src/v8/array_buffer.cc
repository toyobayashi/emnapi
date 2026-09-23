#include <algorithm>
#include <cstdlib>
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
  V8_EXTERN void _v8_backing_store_set(
      internal::Address backing_store, internal::Address buffer,
      internal::Address data, size_t byte_length);
  V8_EXTERN internal::Address _v8_backing_store_data(
      internal::Address backing_store);
  V8_EXTERN size_t _v8_backing_store_byte_length(
      internal::Address backing_store);
  V8_EXTERN void _v8_backing_store_delete(
      internal::Address backing_store);
}

BackingStore::BackingStore()
{
}

BackingStore::~BackingStore() {
  _v8_backing_store_delete(reinterpret_cast<internal::Address>(this));
}

void* BackingStore::Data() const {
  return reinterpret_cast<void*>(_v8_backing_store_data(
      reinterpret_cast<internal::Address>(this)));
}

size_t BackingStore::ByteLength() const {
  return _v8_backing_store_byte_length(
      reinterpret_cast<internal::Address>(this));
}

size_t ArrayBuffer::ByteLength() const {
  return _v8_array_buffer_byte_length(
      reinterpret_cast<internal::Address>(this));
}

std::shared_ptr<BackingStore> ArrayBuffer::GetBackingStore() {
  size_t byte_length = 0;
  const internal::Address buffer = reinterpret_cast<internal::Address>(this);
  internal::Address data = _v8_array_buffer_get_backing_store(
      buffer, &byte_length);
  void* token = std::malloc(1);
  std::shared_ptr<BackingStore> backing_store(
      reinterpret_cast<BackingStore*>(token),
      [](BackingStore* store) {
        _v8_backing_store_delete(
            reinterpret_cast<internal::Address>(store));
        std::free(store);
      });
  _v8_backing_store_set(
      reinterpret_cast<internal::Address>(backing_store.get()),
      buffer, data, byte_length);
  return backing_store;
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
