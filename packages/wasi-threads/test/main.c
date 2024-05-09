#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void *print_message_function(void *ptr) {
  char *message;
  message = (char *)ptr;
  printf("%s \n", message);
  return NULL;
}

__attribute__((visibility("default")))
int fn(int join) {
  pthread_t thread1, thread2;
  const char *message1 = "Thread 1";
  const char *message2 = "Thread 2";
  int iret1, iret2;

  iret1 = pthread_create(&thread1, NULL, print_message_function,
                          (void *)message1);
  iret2 = pthread_create(&thread2, NULL, print_message_function,
                          (void *)message2);

  if (join) {
    printf("pthread_join()\n");
    pthread_join(thread1, NULL);
    pthread_join(thread2, NULL);
  }

  printf("Thread 1 returns: %d\n", iret1);
  printf("Thread 2 returns: %d\n", iret2);
  return 0;
}

#ifdef __WASI_COMMAND__
int main(int argc, char **argv) {
  printf("argc: %d \n", argc);
  for (int i = 0; i < argc; ++i) {
    printf("argv[%d]: %s \n", i, *(argv + i));
  }
  if (argc > 1) {
    return strcmp(*(argv + 1), "web") == 0 ? fn(0) : fn(1);
  } else {
    return fn(1);
  }
}
#endif
