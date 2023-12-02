const localVar = 10

function f () {
  console.log(localVar)
}

function localFunc() {
  f()
  console.log(localVar)
}

export {
  localVar as exportedVar,
  localFunc as exportedFunc
}
