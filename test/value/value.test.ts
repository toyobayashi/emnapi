import { load } from '../util'

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
