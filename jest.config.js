// eslint-disable-next-line no-undef
module.exports = {
  roots: [
    '<rootDir>/test'
  ],
  testRegex: 'test/(.+)\\.spec\\.(jsx?|tsx?)$',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testEnvironment: 'jsdom',
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '@viewfly/core': '<rootDir>/packages/core/src/index.ts',
    '@viewfly/platform-browser': '<rootDir>/packages/platform-browser/src/index.ts',
    '@viewfly/router': '<rootDir>/packages/router/src/index.ts'
  }
}
