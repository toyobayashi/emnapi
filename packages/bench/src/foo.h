#ifndef SRC_FOO_H_
#define SRC_FOO_H_

class Foo {
 public:
  Foo() :class_counter_(0) {}

  void __attribute__((noinline)) IncrClassCounter() {
    ++class_counter_;
  }

  int class_counter_;
};

#endif
