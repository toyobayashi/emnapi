const fortyTwo = 42

/**
 * @__sig ii
 * @param {number} _ 
 */
export const bar = _ => _

/**
 * @__postset
 * ```
 * console.log(obj)
 * ```
 */
const obj = {
  foo: fortyTwo,
  bar (param) {
    bar(param)
  }
}

const arr = [fortyTwo]

/**
 * @__sig i
 */
export const fe = function () {
  return obj.foo === arr[0]
}

/**
 * @__sig ii
 * @param {number} param 
 */
export const af = (param) => {
  obj.bar(param)
}
