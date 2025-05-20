'use strict'
const assert = require('assert')
const { load } = require('../util')

const p = load('nan_converters')
module.exports = p.then(converters => {
  assert.strictEqual(typeof converters.toBoolean, 'function');
  assert.strictEqual(typeof converters.toNumber, 'function');
  assert.strictEqual(typeof converters.toString, 'function');
  assert.strictEqual(typeof converters.toDetailString, 'function');
  assert.strictEqual(typeof converters.toFunction, 'function');
  assert.strictEqual(typeof converters.toObject, 'function');
  assert.strictEqual(typeof converters.toInteger, 'function');
  assert.strictEqual(typeof converters.toUint32, 'function');
  assert.strictEqual(typeof converters.toInt32, 'function');
  assert.strictEqual(typeof converters.toArrayIndex, 'function');
  assert.strictEqual(typeof converters.booleanValue, 'function');
  assert.strictEqual(typeof converters.numberValue, 'function');
  assert.strictEqual(typeof converters.integerValue, 'function');
  assert.strictEqual(typeof converters.uint32Value, 'function');
  assert.strictEqual(typeof converters.int32Value, 'function');
  assert.strictEqual(converters.toBoolean(true), true);
  assert.strictEqual(converters.toNumber(15.3), 15.3);
  assert.strictEqual(converters.toString('sol'), 'sol');
  assert.strictEqual(converters.toDetailString('sol'), 'sol');
  assert.strictEqual(converters.toFunction(test), test);
  assert.strictDeepEqual(converters.toObject({prop : 'x'}), {prop : 'x'});
  assert.strictEqual(converters.toInteger(12), 12);
  assert.strictEqual(converters.toUint32(12), 12);
  assert.strictEqual(converters.toInt32(-12), -12);
  assert.strictEqual(converters.toArrayIndex('12'), 12);
  assert.strictEqual(converters.booleanValue(true), true);
  assert.strictEqual(converters.numberValue(15.3), 15.3);
  assert.strictEqual(converters.integerValue(12), 12);
  assert.strictEqual(converters.uint32Value(12), 12);
  assert.strictEqual(converters.int32Value(-12), -12);

  var conversionFailed = {};
  assert.strictEqual(converters.toFunction(null, conversionFailed), conversionFailed);
  assert.strictEqual(converters.toFunction({}, conversionFailed), conversionFailed);
})
