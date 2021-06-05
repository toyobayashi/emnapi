import { load } from '../util'

const promise = load('error')

test('Get last error info', () => {
  return promise.then(mod => {
    const ret = mod.getLastError()
    expect(ret.code).toBe(1)
    expect(ret.msg).toBe('Invalid argument')
  })
})

test('Throw value', () => {
  return promise.then(mod => {
    try {
      mod.throwUndef()
      return Promise.reject(new Error('Should throw undefined'))
    } catch (error) {
      expect(error).toBe(undefined)
      return Promise.resolve() // avoid typescript complaining
    }
  })
})

test('Throw error', () => {
  return promise.then(mod => {
    try {
      mod.throwError()
      return Promise.reject(new Error('Should throw error'))
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect(error.code).toBe('CODE 1')
      expect(error.message).toBe('msg 1')
      return Promise.resolve() // avoid typescript complaining
    }
  })
})

test('Throw type error', () => {
  return promise.then(mod => {
    try {
      mod.throwTypeError()
      return Promise.reject(new Error('Should throw type error'))
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError)
      expect(error.code).toBe('CODE 2')
      expect(error.message).toBe('msg 2')
      return Promise.resolve() // avoid typescript complaining
    }
  })
})

test('Throw range error', () => {
  return promise.then(mod => {
    try {
      mod.throwRangeError()
      return Promise.reject(new Error('Should throw range error'))
    } catch (error) {
      expect(error).toBeInstanceOf(RangeError)
      expect(error.code).toBe('CODE 3')
      expect(error.message).toBe('msg 3')
      return Promise.resolve() // avoid typescript complaining
    }
  })
})

test('Create error & Is Error', () => {
  return promise.then(mod => {
    const error = mod.createError()
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe('CODE 4')
    expect(error.message).toBe('msg 4')
    expect(mod.isError(error)).toBe(true)
  })
})
