class EmnapiError extends Error {
  constructor (message?: string) {
    super(message)
    const ErrorConstructor: any = new.target
    const proto = ErrorConstructor.prototype

    if (!(this instanceof EmnapiError)) {
      const setPrototypeOf = (Object as any).setPrototypeOf
      if (typeof setPrototypeOf === 'function') {
        setPrototypeOf.call(Object, this, proto)
      } else {
        // eslint-disable-next-line no-proto
        (this as any).__proto__ = proto
      }
      if (typeof (Error as any).captureStackTrace === 'function') {
        (Error as any).captureStackTrace(this, ErrorConstructor)
      }
    }
  }
}

Object.defineProperty(EmnapiError.prototype, 'name', {
  configurable: true,
  writable: true,
  value: 'EmnapiError'
})

class NotSupportWeakRefError extends EmnapiError {
  constructor (api: string, message: string) {
    super(`${api}: The current runtime does not support "FinalizationRegistry" and "WeakRef".${message ? ` ${message}` : ''}`)
  }
}

Object.defineProperty(NotSupportWeakRefError.prototype, 'name', {
  configurable: true,
  writable: true,
  value: 'NotSupportWeakRefError'
})

class NotSupportBigIntError extends EmnapiError {
  constructor (api: string, message: string) {
    super(`${api}: The current runtime does not support "BigInt".${message ? ` ${message}` : ''}`)
  }
}

Object.defineProperty(NotSupportBigIntError.prototype, 'name', {
  configurable: true,
  writable: true,
  value: 'NotSupportBigIntError'
})

export {
  EmnapiError,
  NotSupportWeakRefError,
  NotSupportBigIntError
}
