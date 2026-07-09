/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  roots: ["<rootDir>/tests/backend"],
  testMatch: ["**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  globalSetup: "<rootDir>/tests/global-setup.ts",
  globalTeardown: "<rootDir>/tests/global-teardown.ts",
  moduleNameMapper: {
    "^uuid$": "<rootDir>/tests/__mocks__/uuid.cjs",
    "^jose$": "<rootDir>/tests/__mocks__/jose.cjs",
    "^file-type$": "<rootDir>/tests/__mocks__/file-type.cjs",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          verbatimModuleSyntax: false,
          module: "ESNext",
          moduleResolution: "node",
          target: "ES2022",
          esModuleInterop: true,
          isolatedModules: true,
          resolveJsonModule: true,
        },
      },
    ],
  },
  transformIgnorePatterns: [],
  testTimeout: 60_000,
  clearMocks: true,
};
