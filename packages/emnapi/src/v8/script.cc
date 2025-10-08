#include "v8_impl.h"

namespace v8 {

extern "C" {
  V8_EXTERN internal::Address _v8_unbound_script_bind_to_current_context(UnboundScript*);
  V8_EXTERN internal::Address _v8_script_run(Script* self, Context* context);
  V8_EXTERN internal::Address _v8_script_compiler_compile_unbound_script(
    Isolate* isolate,
    internal::Address source_string,
    int options,
    int no_cache_reason);
}

namespace internal {

class BackgroundDeserializeTask {};

}

void ScriptOrigin::VerifyHostDefinedOptions() const {

}

Local<Script> UnboundScript::BindToCurrentContext() {
  Local<Script> ret;
  internal::Address v = _v8_unbound_script_bind_to_current_context(this);
  memcpy(static_cast<void*>(&ret), &v, sizeof(v));
  return ret;
}

MaybeLocal<Value> Script::Run(Local<Context> context) {
  return v8impl::V8LocalValueFromAddress(_v8_script_run(this, *context));
}

MaybeLocal<Script> ScriptCompiler::Compile(Local<Context> context, Source* source, ScriptCompiler::CompileOptions options, v8::ScriptCompiler::NoCacheReason no_cache_reason) {
  if (!source || source->source_string.IsEmpty()) return Local<Script>();
  MaybeLocal<UnboundScript> unbound = CompileUnboundScript(
    context->GetIsolate(), source, options, no_cache_reason);
  if (unbound.IsEmpty()) return Local<Script>();
  return unbound.ToLocalChecked()->BindToCurrentContext();
}

MaybeLocal<UnboundScript>
ScriptCompiler::CompileUnboundScript(Isolate* isolate,
                                     ScriptCompiler::Source* source,
                                     ScriptCompiler::CompileOptions options,
                                     ScriptCompiler::NoCacheReason reason) {
  if (!source || source->source_string.IsEmpty()) return Local<UnboundScript>();
  Local<UnboundScript> ret;
  internal::Address v = _v8_script_compiler_compile_unbound_script(
    isolate,
    v8impl::AddressFromV8LocalValue(source->source_string),
    options,
    reason
  );
  memcpy(static_cast<void*>(&ret), &v, sizeof(v));
  return ret;
}

ScriptCompiler::ConsumeCodeCacheTask::~ConsumeCodeCacheTask() {

}

ScriptCompiler::CachedData::~CachedData() {
  if (buffer_policy == BufferOwned) {
    if (data != nullptr) {
      delete[] data;
      data = nullptr;
      length = 0;
    }
  }
}

}
