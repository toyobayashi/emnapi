import { load } from '../util'

const promise = load('string')

test('Empty string', () => {
  return promise.then(test_string => {
    const empty = ''
    expect(test_string.TestLatin1(empty)).toStrictEqual(empty)
    expect(test_string.TestUtf8(empty)).toStrictEqual(empty)
    expect(test_string.TestUtf16(empty)).toStrictEqual(empty)
    expect(test_string.Utf16Length(empty)).toStrictEqual(0)
    expect(test_string.Utf8Length(empty)).toStrictEqual(0)
  })
})

test('String 1', () => {
  return promise.then(test_string => {
    const str1 = 'hello world'
    expect(test_string.TestLatin1(str1)).toStrictEqual(str1)
    expect(test_string.TestUtf8(str1)).toStrictEqual(str1)
    expect(test_string.TestUtf16(str1)).toStrictEqual(str1)
    expect(test_string.TestLatin1Insufficient(str1)).toStrictEqual(str1.slice(0, 3))
    expect(test_string.TestUtf8Insufficient(str1)).toStrictEqual(str1.slice(0, 3))
    expect(test_string.TestUtf16Insufficient(str1)).toStrictEqual(str1.slice(0, 3))
    expect(test_string.Utf16Length(str1)).toStrictEqual(11)
    expect(test_string.Utf8Length(str1)).toStrictEqual(11)
  })
})

test('String 2', () => {
  return promise.then(test_string => {
    const str2 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    expect(test_string.TestLatin1(str2)).toStrictEqual(str2)
    expect(test_string.TestUtf8(str2)).toStrictEqual(str2)
    expect(test_string.TestUtf16(str2)).toStrictEqual(str2)
    expect(test_string.TestLatin1Insufficient(str2)).toStrictEqual(str2.slice(0, 3))
    expect(test_string.TestUtf8Insufficient(str2)).toStrictEqual(str2.slice(0, 3))
    expect(test_string.TestUtf16Insufficient(str2)).toStrictEqual(str2.slice(0, 3))
    expect(test_string.Utf16Length(str2)).toStrictEqual(62)
    expect(test_string.Utf8Length(str2)).toStrictEqual(62)
  })
})

test('String 3', () => {
  return promise.then(test_string => {
    const str3 = '?!@#$%^&*()_+-=[]{}/.,<>\'"\\'
    expect(test_string.TestLatin1(str3)).toStrictEqual(str3)
    expect(test_string.TestUtf8(str3)).toStrictEqual(str3)
    expect(test_string.TestUtf16(str3)).toStrictEqual(str3)
    expect(test_string.TestLatin1Insufficient(str3)).toStrictEqual(str3.slice(0, 3))
    expect(test_string.TestUtf8Insufficient(str3)).toStrictEqual(str3.slice(0, 3))
    expect(test_string.TestUtf16Insufficient(str3)).toStrictEqual(str3.slice(0, 3))
    expect(test_string.Utf16Length(str3)).toStrictEqual(27)
    expect(test_string.Utf8Length(str3)).toStrictEqual(27)
  })
})

test('String 4', () => {
  return promise.then(test_string => {
    const str4 = '¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿'
    expect(test_string.TestLatin1(str4)).toStrictEqual(str4)
    expect(test_string.TestUtf8(str4)).toStrictEqual(str4)
    expect(test_string.TestUtf16(str4)).toStrictEqual(str4)
    expect(test_string.TestLatin1Insufficient(str4)).toStrictEqual(str4.slice(0, 3))
    expect(test_string.TestUtf8Insufficient(str4)).toStrictEqual(str4.slice(0, 1))
    expect(test_string.TestUtf16Insufficient(str4)).toStrictEqual(str4.slice(0, 3))
    expect(test_string.Utf16Length(str4)).toStrictEqual(31)
    expect(test_string.Utf8Length(str4)).toStrictEqual(62)
  })
})

test('String 5', () => {
  return promise.then(test_string => {
    const str5 = 'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþ'
    expect(test_string.TestLatin1(str5)).toStrictEqual(str5)
    expect(test_string.TestUtf8(str5)).toStrictEqual(str5)
    expect(test_string.TestUtf16(str5)).toStrictEqual(str5)
    expect(test_string.TestLatin1Insufficient(str5)).toStrictEqual(str5.slice(0, 3))
    expect(test_string.TestUtf8Insufficient(str5)).toStrictEqual(str5.slice(0, 1))
    expect(test_string.TestUtf16Insufficient(str5)).toStrictEqual(str5.slice(0, 3))
    expect(test_string.Utf16Length(str5)).toStrictEqual(63)
    expect(test_string.Utf8Length(str5)).toStrictEqual(126)
  })
})

test('String 6', () => {
  return promise.then(test_string => {
    const str6 = '\u{2003}\u{2101}\u{2001}\u{202}\u{2011}'
    expect(test_string.TestUtf8(str6)).toStrictEqual(str6)
    expect(test_string.TestUtf16(str6)).toStrictEqual(str6)
    expect(test_string.TestUtf8Insufficient(str6)).toStrictEqual(str6.slice(0, 1))
    expect(test_string.TestUtf16Insufficient(str6)).toStrictEqual(str6.slice(0, 3))
    expect(test_string.Utf16Length(str6)).toStrictEqual(5)
    expect(test_string.Utf8Length(str6)).toStrictEqual(14)
  })
})

test('String throws', () => {
  return promise.then(test_string => {
    expect(() => {
      test_string.TestLargeUtf8()
    }).toThrow(new Error('Invalid argument'))

    expect(() => {
      test_string.TestLargeLatin1()
    }).toThrow(new Error('Invalid argument'))

    expect(() => {
      test_string.TestLargeUtf16()
    }).toThrow(new Error('Invalid argument'))

    expect(() => {
      test_string.TestMemoryCorruption(' '.repeat(64 * 1024))
    }).not.toThrow()
  })
})
