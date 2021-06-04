namespace emnapi {

export class Handle {
  private static _count: number = 0
  public static store: { [id: number]: any } = Object.create(null)

  public id: number
  public nativeObject: Pointer | null
  public constructor (value) {
    this.id = Handle._count
    this.nativeObject = null
    Handle.store[this.id] = value
    Handle._count = (Handle._count + 1) % 0x100000000
  }
  public dispose () {
    if (this.id in Handle.store) {
      delete Handle.store[this.id]
    }
  }
}

}
