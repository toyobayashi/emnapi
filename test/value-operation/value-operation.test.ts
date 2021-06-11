/* eslint-disable no-new-object */
/* eslint-disable no-new-wrappers */
import { load } from '../util'
import * as assert from 'assert'

const promise = load('value-operation')

const testSym = Symbol('test')

test('Coerce to boolean', () => {
  return promise.then(mod => {
    expect(mod.toBool(true)).toBe(true)
    expect(mod.toBool(1)).toBe(true)
    expect(mod.toBool(-1)).toBe(true)
    expect(mod.toBool('true')).toBe(true)
    expect(mod.toBool('false')).toBe(true)
    expect(mod.toBool({})).toBe(true)
    expect(mod.toBool([])).toBe(true)
    expect(mod.toBool(testSym)).toBe(true)
    expect(mod.toBool(false)).toBe(false)
    expect(mod.toBool(undefined)).toBe(false)
    expect(mod.toBool(null)).toBe(false)
    expect(mod.toBool(0)).toBe(false)
    expect(mod.toBool(Number.NaN)).toBe(false)
    expect(mod.toBool('')).toBe(false)
  })
})

test('Coerce to number', () => {
  return promise.then(mod => {
    expect(mod.toNumber(0)).toBe(0)
    expect(mod.toNumber(1)).toBe(1)
    expect(mod.toNumber(1.1)).toBe(1.1)
    expect(mod.toNumber(-1)).toBe(-1)
    expect(mod.toNumber('0')).toBe(0)
    expect(mod.toNumber('1')).toBe(1)
    expect(mod.toNumber('1.1')).toBe(1.1)
    expect(mod.toNumber([])).toBe(0)
    expect(mod.toNumber(false)).toBe(0)
    expect(mod.toNumber(null)).toBe(0)
    expect(mod.toNumber(Number.NaN)).toBeNaN()
    expect(mod.toNumber({})).toBeNaN()
    expect(mod.toNumber(undefined)).toBeNaN()
    expect(() => { mod.toNumber(testSym) }).toThrow(TypeError)
  })
})

test('Coerce to object', () => {
  return promise.then(mod => {
    expect(mod.toObject({})).toStrictEqual({})
    expect(mod.toObject({ test: 1 })).toStrictEqual({ test: 1 })
    expect(mod.toObject([])).toStrictEqual([])
    expect(mod.toObject([1, 2, 3])).toStrictEqual([1, 2, 3])
    expect(mod.toObject(false)).toStrictEqual(new Boolean(false))
    expect(mod.toObject(true)).toStrictEqual(new Boolean(true))
    expect(mod.toObject('')).toStrictEqual(new String(''))
    expect(mod.toObject(0)).toStrictEqual(new Number(0))
    expect(mod.toObject(Number.NaN)).toStrictEqual(new Number(Number.NaN))
    expect(mod.toObject(testSym)).toStrictEqual(new Object(testSym))

    assert.notDeepStrictEqual(mod.toObject(false), false)
    assert.notDeepStrictEqual(mod.toObject(true), true)
    assert.notDeepStrictEqual(mod.toObject(''), '')
    assert.notDeepStrictEqual(mod.toObject(0), 0)
    assert.ok(!Number.isNaN(mod.toObject(Number.NaN)))
  })
})

test('Coerce to string', () => {
  return promise.then(mod => {
    expect(mod.toString('')).toBe('')
    expect(mod.toString('test')).toBe('test')
    expect(mod.toString(undefined)).toBe('undefined')
    expect(mod.toString(null)).toBe('null')
    expect(mod.toString(false)).toBe('false')
    expect(mod.toString(true)).toBe('true')
    expect(mod.toString(0)).toBe('0')
    expect(mod.toString(1.1)).toBe('1.1')
    expect(mod.toString(Number.NaN)).toBe('NaN')
    expect(mod.toString({})).toBe('[object Object]')
    expect(mod.toString({ toString: () => 'test' })).toBe('test')
    expect(mod.toString([])).toBe('')
    expect(mod.toString([1, 2, 3])).toBe('1,2,3')
    expect(() => { mod.toString(testSym) }).toThrow(TypeError)
  })
})
