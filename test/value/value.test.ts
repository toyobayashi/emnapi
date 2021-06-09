import { load } from '../util'
import * as assert from 'assert'

const promise = load('value')

test('Create int32', () => {
  return promise.then(mod => {
    expect(mod.i32()).toBe(996)
  })
})

test('Create utf8', () => {
  return promise.then(mod => {
    expect(mod.utf8()).toBe('utf8')
  })
})

test('Create array', () => {
  return promise.then(mod => {
    expect(mod.array()).toEqual([])
  })
})

test('Create array with length', () => {
  return promise.then(mod => {
    expect(mod.arrayWithLength()).toHaveLength(6)
  })
})

test('Create symbol', () => {
  return promise.then(mod => {
    expect(mod.symbol().toString()).toBe('Symbol(symbol)')
  })
})


test('Get undefined', () => {
  return promise.then(mod => {
    expect(mod.undef()).toBe(undefined)
  })
})

test('Get null', () => {
  return promise.then(mod => {
    expect(mod.nil()).toBe(null)
  })
})

test('Get boolean', () => {
  return promise.then(mod => {
    expect(mod.bool(true)).toBe(true)
    expect(mod.bool(false)).toBe(false)
  })
})

test('Get global', () => {
  return promise.then(mod => {
    expect(mod.global()).toBe(global)
  })
})

test('Create double', () => {
  return promise.then(mod => {
    expect(mod.double()).toBe(9.96)
  })
})

test('Get double', () => {
  return promise.then(mod => {
    expect(mod.getDouble(Math.PI)).toBe(Math.PI + 1)
  })
})

test('Get napi version', () => {
  return promise.then(mod => {
    expect(mod.getVersion()).toBe(6)
  })
})

test('Create uint32', () => {
  return promise.then(mod => {
    expect(mod.uint32()).toBe(4294967295)
  })
})

test('Get uint32', () => {
  return promise.then(mod => {
    expect(mod.getUint32(4294967295)).toBe(0)
  })
})

test('Get int32', () => {
  return promise.then(mod => {
    expect(mod.getInt32(996)).toBe(997)
  })
})

function testInt64 (mod: any, input: number, expected = input): void {
  assert.strictEqual(mod.TestInt64Truncation(input), expected)
}

test('test int64', () => {
  return promise.then(mod => {
    // Both V8 and ChakraCore return a sentinel value of `0x8000000000000000` when
    // the conversion goes out of range, but V8 treats it as unsigned in some cases.
    const RANGEERROR_POSITIVE = Math.pow(2, 63)
    const RANGEERROR_NEGATIVE = -Math.pow(2, 63)

    // Test zero
    testInt64(mod, 0.0, 0)
    testInt64(mod, -0.0, 0)

    // Test min/max safe integer range
    testInt64(mod, Number.MIN_SAFE_INTEGER)
    testInt64(mod, Number.MAX_SAFE_INTEGER)

    // Test within int64_t range (with precision loss)
    testInt64(mod, -Math.pow(2, 63) + (Math.pow(2, 9) + 1))
    testInt64(mod, Math.pow(2, 63) - (Math.pow(2, 9) + 1))

    // Test min/max double value
    testInt64(mod, -Number.MIN_VALUE, 0)
    testInt64(mod, Number.MIN_VALUE, 0)
    testInt64(mod, -Number.MAX_VALUE, RANGEERROR_NEGATIVE)
    testInt64(mod, Number.MAX_VALUE, RANGEERROR_POSITIVE)

    // Test outside int64_t range
    testInt64(mod, -Math.pow(2, 63) + (Math.pow(2, 9)), RANGEERROR_NEGATIVE)
    testInt64(mod, Math.pow(2, 63) - (Math.pow(2, 9)), RANGEERROR_POSITIVE)

    // Test non-finite numbers
    testInt64(mod, Number.POSITIVE_INFINITY, 0)
    testInt64(mod, Number.NEGATIVE_INFINITY, 0)
    testInt64(mod, Number.NaN, 0)
  })
})
