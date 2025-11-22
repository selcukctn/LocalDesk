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
              "ExceptionHandling": 1,
              "RuntimeLibrary": 2,
              "AdditionalOptions": ["/ZW", "/EHsc", "/std:c++17"]
            },
            "VCLinkerTool": {
              "AdditionalDependencies": [
                "windowsapp.lib",
                "runtimeobject.lib"
              ]
            }
          }
        }]
      ]
    }
  ]
}

