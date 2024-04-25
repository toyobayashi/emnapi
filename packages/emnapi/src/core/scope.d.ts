declare interface CreateOptions {
  context: Context
  filename?: string
  nodeBinding?: NodeBinding
  childThread?: boolean
  reuseWorker?: boolean
  asyncWorkPoolSize?: number
  waitThreadStart?: boolean
  onCreateWorker?: () => any
  print?: (str: string) => void
  printErr?: (str: string) => void
  postMessage?: (msg: any) => any
}

// factory parameter
declare const options: CreateOptions
