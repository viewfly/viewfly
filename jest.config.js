// eslint-disable-next-line no-undef
module.exports = {
  roots: [
    '<rootDir>/test'
  ],
  setupFiles: ['jest-canvas-mock'],
  testRegex: 'test/(.+)\\.spec\\.(jsx?|tsx?)$',
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.tsx?$': 'ts-jest'
  },
  testEnvironment: 'jsdom',
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '@viewfly/core/jsx-runtime': '<rootDir>/packages/core/jsx-runtime.umd',
    '@viewfly/core': '<rootDir>/packages/core/src/public-api.ts',
    '@viewfly/platform-browser': '<rootDir>/packages/platform-browser/src/public-api.ts'
  }
}
