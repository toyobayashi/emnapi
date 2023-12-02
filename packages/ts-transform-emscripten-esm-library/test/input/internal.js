const fortyTwo = 42
export const $bar = fortyTwo

export function $x () {
  return fortyTwo
}

function y () {
  return fortyTwo
}

export function z () {
  return y()
}

export { y as $foo }
