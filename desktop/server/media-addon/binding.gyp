{
  "targets": [
    {
      "target_name": "media",
      "sources": [ "media.cc" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "libraries": [
        "-lwindowsapp",
        "-lruntimeobject"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "defines": [ "NAPI_CPP_EXCEPTIONS" ],
      "conditions": [
        ["OS=='win'", {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1
            },
            "VCLinkerTool": {
              "AdditionalDependencies": [
                "ole32.lib",
                "oleaut32.lib"
              ]
            }
          }
        }]
      ]
    }
  ]
}

