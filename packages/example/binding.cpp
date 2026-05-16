#include <napi.h>
#include <time.h>
#include <pthread.h>

struct RunContext {
  int current;
  int total;
};

struct RunData {
  Napi::ThreadSafeFunction tsfn;
  Napi::FunctionReference done_ref;
  pthread_mutex_t mutex;
  int ref_count;
  RunContext context;

  RunData() : ref_count(2), context{0, 5} {
    pthread_mutex_init(&mutex, NULL);
  }

  ~RunData() { pthread_mutex_destroy(&mutex); }

  void unref() {
    pthread_mutex_lock(&mutex);
    int remaining = --ref_count;
    pthread_mutex_unlock(&mutex);
    if (remaining == 0) delete this;
  }
};

class RunWorker : public Napi::AsyncWorker {
 public:
  explicit RunWorker(Napi::Env env, RunData* data)
      : Napi::AsyncWorker(env, "run_work"), data_(data) {}

  void Execute() override {
    struct timespec ts;
    ts.tv_sec = 0;
    ts.tv_nsec = 200 * 1000 * 1000;  // 200ms

    for (int i = 0; i < 5; i++) {
      nanosleep(&ts, nullptr);
      RunContext* ctx = data_->tsfn.GetContext();
      int cur = ++ctx->current;
      int tot = ctx->total;

      napi_status status = data_->tsfn.BlockingCall(
          [cur, tot](Napi::Env env, Napi::Function jsCb) {
            jsCb.Call({Napi::Number::New(env, cur),
                       Napi::Number::New(env, tot)});
          });
      if (status != napi_ok) break;
    }

    data_->tsfn.Release();
  }

  void OnOK() override { data_->unref(); }
  void OnError(const Napi::Error& /*e*/) override { data_->unref(); }

 private:
  RunData* data_;
};

static Napi::Value Run(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsFunction()) {
    Napi::TypeError::New(env, "first argument must be a function")
        .ThrowAsJavaScriptException();
    return env.Undefined();
  }

  RunData* data = new RunData();

  if (info.Length() >= 2) {
    if (!info[1].IsFunction()) {
      delete data;
      Napi::TypeError::New(env, "second argument must be a function")
          .ThrowAsJavaScriptException();
      return env.Undefined();
    }
    data->done_ref = Napi::Persistent(info[1].As<Napi::Function>());
  }

  data->tsfn = Napi::ThreadSafeFunction::New(
      env,
      info[0].As<Napi::Function>(),
      "run_tsfn",
      0,
      1,
      &data->context,
      [](Napi::Env env, RunData* finalizeData, RunContext* ctx) {
        if (!finalizeData->done_ref.IsEmpty()) {
          finalizeData->done_ref.Call({});
          finalizeData->done_ref.Reset();
        }
        finalizeData->unref();
      },
      data);

  auto* worker = new RunWorker(env, data);
  worker->Queue();

  return env.Undefined();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("run", Napi::Function::New(env, Run));
  return exports;
}

NODE_API_MODULE(binding, Init)
