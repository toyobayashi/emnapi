int fib(int n) {
  if (n < 2) return n;
  int tmp[2] = { 0, 1 };
  for (int i = 2; i <= n; ++i) {
    tmp[1] = tmp[1] + tmp[0];
    tmp[0] = tmp[1] - tmp[0];
  }
  return tmp[1];
}
