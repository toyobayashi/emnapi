declare function constexpr (condition: string): boolean

export function constexprChoice (): number {
  if (constexpr('MEMORY64 == 1')) {
    return 64
  } else if (constexpr('MEMORY64 == 0')) {
    return 32
  } else {
    return 0
  }
}
