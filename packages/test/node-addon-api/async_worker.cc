#include <chrono>
#include <condition_variable>
#include <mutex>
#include <thread>
#include "assert.h"
#include "napi.h"

using namespace Napi;

class TestWorker : public AsyncWorker {
 public:
  static void DoWork(const CallbackInfo& info) {
    bool succeed = info[0].As<Boolean>();
    Object resource = info[1].As<Object>();
    Function cb = info[2].As<Function>();
    Value data = info[3];

    TestWorker* worker = new TestWorker(cb, "TestResource", resource);
    worker->Receiver().Set("data", data);
    worker->_succeed = succeed;
    worker->Queue();
  }

 protected:
  void Execute() override {
    if (!_succeed) {
      SetError("test error");
    }
  }

 private:
  TestWorker(Function cb, const char* resource_name, const Object& resource)
      : AsyncWorker(cb, resource_name, resource) {}
  bool _succeed;
};

class TestWorkerWithResult : public AsyncWorker {
 public:
  static void DoWork(const CallbackInfo& info) {
    bool succeed = info[0].As<Boolean>();
    Object resource = info[1].As<Object>();
    Function cb = info[2].As<Function>();
    Value data = info[3];

    TestWorkerWithResult* worker =
        new TestWorkerWithResult(cb, "TestResource", resource);
    worker->Receiver().Set("data", data);
    worker->_succeed = succeed;
    worker->Queue();
  }

 protected:
  void Execute() override {
    if (!_succeed) {
      SetError("test error");
    }
  }

  std::vector<napi_value> GetResult(Napi::Env env) override {
    return {Boolean::New(env, _succeed),
            String::New(env, _succeed ? "ok" : "error")};
  }

 private:
  TestWorkerWithResult(Function cb,
                       const char* resource_name,
                       const Object& resource)
      : AsyncWorker(cb, resource_name, resource) {}
  bool _succeed;
};

class TestWorkerNoCallback : public AsyncWorker {
 public:
  static Value DoWork(const CallbackInfo& info) {
    napi_env env = info.Env();
    bool succeed = info[0].As<Boolean>();
    Object resource = info[1].As<Object>();

    TestWorkerNoCallback* worker =
        new TestWorkerNoCallback(env, "TestResource", resource);
    worker->_succeed = succeed;
    worker->Queue();
    return worker->_deferred.Promise();
  }

 protected:
  void Execute() override {}
  virtual void OnOK() override { _deferred.Resolve(Env().Undefined()); }
  virtual void OnError(const Napi::Error& /* e */) override {
    _deferred.Reject(Env().Undefined());
  }

 private:
  TestWorkerNoCallback(napi_env env,
                       const char* resource_name,
                       const Object& resource)
      : AsyncWorker(env, resource_name, resource),
        _deferred(Napi::Promise::Deferred::New(env)) {}
  Promise::Deferred _deferred;
  bool _succeed;
};

class EchoWorker : public AsyncWorker {
 public:
  EchoWorker(Function& cb, std::string& echo) : AsyncWorker(cb), echo(echo) {}
  ~EchoWorker() {}

  void Execute() override {
    // Simulate cpu heavy task
    std::this_thread::sleep_for(std::chrono::milliseconds(30));
  }

  void OnOK() override {
    HandleScope scope(Env());
    Callback().Call({Env().Null(), String::New(Env(), echo)});
  }

 private:
  std::string echo;
};

class FailCancelWorker : public AsyncWorker {
 private:
  bool taskIsRunning = false;
  std::mutex mu;
  std::condition_variable taskStartingCv;
  void NotifyJSThreadTaskHasStarted() {
    {
      std::lock_guard<std::mutex> lk(mu);
      taskIsRunning = true;
      taskStartingCv.notify_one();
    }
  }

 public:
  FailCancelWorker(Function& cb) : AsyncWorker(cb) {}
  ~FailCancelWorker() {}

  void WaitForWorkerTaskToStart() {
    std::unique_lock<std::mutex> lk(mu);
    taskStartingCv.wait(lk, [this] { return taskIsRunning; });
    taskIsRunning = false;
  }

  static void DoCancel(const CallbackInfo& info) {
    Function cb = info[0].As<Function>();

    FailCancelWorker* cancelWorker = new FailCancelWorker(cb);
    cancelWorker->Queue();
    cancelWorker->WaitForWorkerTaskToStart();

#ifdef NAPI_CPP_EXCEPTIONS
    try {
      cancelWorker->Cancel();
    } catch (Napi::Error&) {
      Napi::Error::New(info.Env(), "Unable to cancel async worker tasks")
          .ThrowAsJavaScriptException();
    }
#else
    cancelWorker->Cancel();
#endif
  }

  void Execute() override {
    NotifyJSThreadTaskHasStarted();
    std::this_thread::sleep_for(std::chrono::seconds(1));
  }

  void OnOK() override {}

  void OnError(const Error&) override {}
};

class CancelWorker : public AsyncWorker {
 public:
  CancelWorker(Function& cb) : AsyncWorker(cb) {}
  ~CancelWorker() {}

  static void DoWork(const CallbackInfo& info) {
    Function cb = info[0].As<Function>();
    std::string echo = info[1].As<String>();
    int threadNum = info[2].As<Number>().Uint32Value();

    for (int i = 0; i < threadNum; i++) {
      AsyncWorker* worker = new EchoWorker(cb, echo);
      worker->Queue();
      assert(worker->Env() == info.Env());
    }

    AsyncWorker* cancelWorker = new CancelWorker(cb);
    cancelWorker->Queue();

#ifdef NAPI_CPP_EXCEPTIONS
    try {
      cancelWorker->Cancel();
    } catch (Napi::Error&) {
      Napi::Error::New(info.Env(), "Unable to cancel async worker tasks")
          .ThrowAsJavaScriptException();
    }
#else
    cancelWorker->Cancel();
#endif
  }

  void Execute() override {
    // Simulate cpu heavy task
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
  }

  void OnOK() override {
    Napi::Error::New(this->Env(),
                     "OnOk should not be invoked on successful cancellation")
        .ThrowAsJavaScriptException();
  }

  void OnError(const Error&) override {
    Napi::Error::New(this->Env(),
                     "OnError should not be invoked on successful cancellation")
        .ThrowAsJavaScriptException();
  }
};

Object InitAsyncWorker(Env env) {
  Object exports = Object::New(env);
  exports["doWork"] = Function::New(env, TestWorker::DoWork);
  exports["doWorkNoCallback"] =
      Function::New(env, TestWorkerNoCallback::DoWork);
  exports["doWorkWithResult"] =
      Function::New(env, TestWorkerWithResult::DoWork);
  exports["tryCancelQueuedWork"] = Function::New(env, CancelWorker::DoWork);

  exports["expectCancelToFail"] =
      Function::New(env, FailCancelWorker::DoCancel);
  return exports;
}
