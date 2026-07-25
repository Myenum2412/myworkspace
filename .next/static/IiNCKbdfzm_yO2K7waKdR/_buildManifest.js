self.__BUILD_MANIFEST = {
  "__rewrites": {
    "afterFiles": [],
    "beforeFiles": [
      {
        "has": [
          {
            "type": "query",
            "key": "o",
            "value": "(?<orgid>\\d*)"
          },
          {
            "type": "query",
            "key": "p",
            "value": "(?<projectid>\\d*)"
          },
          {
            "type": "query",
            "key": "r",
            "value": "(?<region>[a-z]{2})"
          }
        ],
        "source": "/monitoring(/?)"
      },
      {
        "has": [
          {
            "type": "query",
            "key": "o",
            "value": "(?<orgid>\\d*)"
          },
          {
            "type": "query",
            "key": "p",
            "value": "(?<projectid>\\d*)"
          }
        ],
        "source": "/monitoring(/?)"
      }
    ],
    "fallback": [
      {
        "source": "/api/:path*"
      },
      {
        "source": "/uploads/:path*"
      },
      {
        "source": "/banners/:path*"
      }
    ]
  },
  "sortedPages": [
    "/_app",
    "/_error"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()