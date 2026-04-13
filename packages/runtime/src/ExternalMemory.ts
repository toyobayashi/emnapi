const kMaxReasonableBytes = BigInt(1) << BigInt(60)
const kMinReasonableBytes = -kMaxReasonableBytes

export class ExternalMemory {
  total: bigint
  onChange: ((current: bigint, old: bigint, delta: bigint) => any) | null

  constructor (onChange?: (current: bigint, old: bigint, delta: bigint) => any) {
    this.total = BigInt(0)
    this.onChange = onChange ?? null
  }

  adjust (changeInBytes: number | bigint): bigint {
    changeInBytes = BigInt(changeInBytes)
    if (!(kMinReasonableBytes <= changeInBytes && changeInBytes < kMaxReasonableBytes)) {
      throw new RangeError(`changeInBytes ${changeInBytes} is out of reasonable range`)
    }
    const old = this.total
    this.total += changeInBytes
    const amount = this.total
    const onChange = this.onChange
    if (changeInBytes) {
      onChange?.(amount, old, changeInBytes)
    }
    return amount
  }
}
