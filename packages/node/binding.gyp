{
  "variables": {
    "module_name": "emnapi_node_binding",
    "module_path": "./dist"
  },
  'targets': [
    {
      'target_name': '<(module_name)',
      'sources': [
        'src/binding.cpp',
      ],
    },
    {
      "target_name": "action_after_build",
      "type": "none",
      "dependencies": [ "<(module_name)" ],
      "copies": [
        {
          "files": [ "<(PRODUCT_DIR)/<(module_name).node" ],
          "destination": "<(module_path)"
        }
      ]
    }
  ]
}
