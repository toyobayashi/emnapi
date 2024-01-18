{
  'targets': [
    {
      'target_name': 'dlmalloc',
      'type': 'static_library',
      'defines': [
        'PAGESIZE=65536'
      ],
      'sources': [
        'src/malloc/sbrk.c',
        'src/malloc/memcpy.c',
        'src/malloc/memset.c',
        'src/malloc/dlmalloc/dlmalloc.c',
      ],
      'conditions': [
        ['wasm_threads != 0', {
          'defines': [
            'USE_LOCKS=1'
          ],
        }],
      ],
    },
    {
      'target_name': 'emmalloc',
      'type': 'static_library',
      'defines': [
        'PAGESIZE=65536'
      ],
      'sources': [
        'src/malloc/sbrk.c',
        'src/malloc/memcpy.c',
        'src/malloc/memset.c',
        'src/malloc/emmalloc/emmalloc.c',
      ],
      'cflags': [ '-fno-strict-aliasing' ],
      'conditions': [
        ['OS == "mac"', {
          'xcode_settings': {
            'GCC_STRICT_ALIASING': 'NO',
          }
        }],
        ['wasm_threads != 0', {
          'defines': [
            '__EMSCRIPTEN_SHARED_MEMORY__=1'
          ],
        }],
      ],
    }
  ]
}
