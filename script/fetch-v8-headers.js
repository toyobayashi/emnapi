import fs from 'fs-extra'
import path from 'path'
import { spawnSync } from './spawn.js'
import envPaths from 'env-paths'

const cacheDir = envPaths('node-gyp', { suffix: '' }).cache
const targetVersion = process.env.NODE_VERSION || '22.16.0'
const versionDir = path.join(cacheDir, targetVersion)

if (!fs.existsSync(versionDir)) {
  spawnSync('npx', ['node-gyp', 'install', '--target', targetVersion, '--arch', 'x64'])
}

const includeDir = path.join(cacheDir, targetVersion, 'include/node')

const items = fs.readdirSync(includeDir).filter(item => {
  return item.startsWith('v8') || item === 'cppgc' || item === 'libplatform'
}).map(item => path.join(includeDir, item))

const emnapiInclude = path.join(import.meta.dirname, '..', 'packages', 'emnapi', 'include', 'node')
for (const item of items) {
  const dest = path.join(emnapiInclude, path.basename(item))
  if (fs.existsSync(dest)) {
    fs.removeSync(dest)
  }
  fs.copySync(item, dest)
}

const v8config = path.join(emnapiInclude, 'v8config.h')
const v8configContent = fs.readFileSync(v8config, 'utf-8')
fs.writeFileSync(v8config,
  v8configContent
    .replace(/(#elif defined\(_M_IX86\) \|\| defined\(__i386__\))/g, '$1 || defined(__wasm32__)')
    .replace(/(#if defined\(_M_X64\) \|\| defined\(__x86_64__\))/g, '$1 || defined(__wasm64__)')
  ,
  'utf-8'
)

const replaceList = {
  'v8config.h': (code) => {
    return code
      .replace(/(#elif defined\(_M_IX86\) \|\| defined\(__i386__\))/g, '$1 || defined(__wasm32__)')
      .replace(/(#if defined\(_M_X64\) \|\| defined\(__x86_64__\))/g, '$1 || defined(__wasm64__)')
  },
  'v8-local-handle.h': (code) => {
    return code
      .replace(/(template <.*?>)(\r?\n)?\s*(.+)\s+Escape\((.+?)\)\s\{(.*\r?\n)*?\s\s\}/, `$1
  $3 Escape($4) {
#ifdef V8_ENABLE_DIRECT_LOCAL
    if (value.IsEmpty()) return value;
    return Local<T>::FromAddress(reinterpret_cast<internal::Address>(EscapeSlot(reinterpret_cast<internal::Address*>(*value))));
#else
    if (value.IsEmpty()) return value;
    return Local<T>::FromSlot(EscapeSlot(value.slot()));
#endif
  }`)
      .replace(/V8_INLINE static Local<T> New\(Isolate\* isolate,\r?\n\s*const PersistentBase<T>& that\) \{(.*\r?\n)*? {2}\}/, `
  V8_INLINE static Local<T> New(Isolate* isolate,
                                const PersistentBase<T>& that) {
    T* value = that.template value<T, true>();
    internal::Address address = api_internal::LocalFromGlobalReference(reinterpret_cast<internal::Address>(value));
    return New(isolate, address);
  }
`)
      .replace(/(V8_EXPORT void ToLocalEmpty\(\);)/, '$1\nV8_EXPORT internal::Address LocalFromGlobalReference(internal::Address* global_reference);')
  },
  'v8-object.h': (code) => {
    return code
      .replace(/(.+)\s+Object::GetInternalField\((.+?)\)\s\{(.*\r?\n)*?\}/, `$1 Object::GetInternalField($2) {
  return SlowGetInternalField(index);
}`)
      .replace(/(.+)\s+Object::GetAlignedPointerFromInternalField\((.+?)\)\s\{(.*\r?\n)*?\}/, `$1 Object::GetAlignedPointerFromInternalField($2) {
  return SlowGetAlignedPointerFromInternalField(index);
}`)
      .replace(/(.+)\s+Object::GetAlignedPointerFromInternalField\((.+?,\r?\n.+?)\)\s\{(.*\r?\n)*?\}/, `$1 Object::GetAlignedPointerFromInternalField($2) {
  return SlowGetAlignedPointerFromInternalField(isolate, index);
}`)
  },
  'v8-value.h': (code) => {
    return code
      .replace(/(.+)\s+Value::IsUndefined\((.*?)\)(.*?)\{(.*\r?\n)*?\s*\}/, `$1 Value::IsUndefined($2)$3{
  return FullIsUndefined();
}`)
      .replace(/(.+)\s+Value::IsNull\((.*?)\)(.*?)\{(.*\r?\n)*?\s*\}/, `$1 Value::IsNull($2)$3{
  return FullIsNull();
}`)
      .replace(/(.+)\s+Value::IsNullOrUndefined\((.*?)\)(.*?)\{(.*\r?\n)*?\s*\}/, `$1 Value::IsNullOrUndefined($2)$3{
  return FullIsNull() || FullIsUndefined();
}`)
      .replace(/(.+)\s+Value::IsTrue\((.*?)\)(.*?)\{(.*\r?\n)*?\s*\}/, `$1 Value::IsTrue($2)$3{
  return FullIsTrue();
}`)
      .replace(/(.+)\s+Value::IsFalse\((.*?)\)(.*?)\{(.*\r?\n)*?\s*\}/, `$1 Value::IsFalse($2)$3{
  return FullIsFalse();
}`)
      .replace(/(.+)\s+Value::IsString\((.*?)\)(.*?)\{(.*\r?\n)*?\s*\}/, `$1 Value::IsString($2)$3{
  return FullIsString();
}`)
  }
}

Object.entries(replaceList).forEach(([fileName, replacer]) => {
  const filePath = path.join(emnapiInclude, fileName)
  const fileContent = fs.readFileSync(filePath, 'utf8')
  fs.writeFileSync(filePath, replacer(fileContent), 'utf8')
})
