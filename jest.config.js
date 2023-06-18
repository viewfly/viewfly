// eslint-disable-next-line no-undef
module.exports = {
  roots: [
    '<rootDir>/test'
  ],
  testRegex: 'test/(.+)\\.spec\\.(jsx?|tsx?)$',
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.tsx?$': 'ts-jest'
  },
  testEnvironment: 'jsdom',
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '@viewfly/core/jsx-runtime': '<rootDir>/packages/core/src/model/jsx-element',
    '@viewfly/core': '<rootDir>/packages/core/src/public-api.ts',
    '@viewfly/platform-browser': '<rootDir>/packages/platform-browser/src/public-api.ts',
    '@viewfly/scoped-css': '<rootDir>/packages/scoped-css/src/public-api.ts',
    '@viewfly/hooks': '<rootDir>/packages/hooks/src/public-api.ts',
    '@viewfly/router': '<rootDir>/packages/router/src/public-api.ts'
  }
}
