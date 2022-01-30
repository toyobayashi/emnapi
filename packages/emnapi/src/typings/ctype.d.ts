// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare type Pointer<T> = number
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare type PointerPointer<T> = number
declare type FunctionPointer<T extends (...args: any[]) => any> = Pointer<T>
declare type Const<T> = T

declare type void_p = Pointer<void>
declare type void_pp = Pointer<void_p>
declare type bool = number
declare type char = number
declare type char_p = Pointer<char>
declare type unsigned_char = number
declare type const_char = Const<char>
declare type const_char_p= Pointer<const_char>
declare type char16_t_p= number
declare type const_char16_t_p= number

declare type short = number
declare type unsigned_short = number
declare type int = number
declare type unsigned_int = number
declare type long = number
declare type unsigned_long = number
declare type long_long = bigint
declare type unsigned_long_long = bigint
declare type float = number
declare type double = number
declare type long_double = number
declare type size_t = number

declare type int8_t = number
declare type uint8_t = number
declare type int16_t = number
declare type uint16_t = number
declare type int32_t = number
declare type uint32_t = number
declare type int64_t = bigint
declare type uint64_t = bigint
