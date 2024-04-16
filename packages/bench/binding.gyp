{
  "targets": [
    {
      "target_name": "napi",
      "sources": [
        "src/node-api.cpp"
      ]
    },
    {
      "target_name": "naa",
      "sources": [
        "src/node-addon-api.cpp"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').targets\"):node_addon_api",
      ]
    }
  ]
}
