module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'backend/utils/**/*.js',
    'backend/services/deployments/**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  transform: {},
  moduleFileExtensions: ['js', 'json'],
  testTimeout: 10000
};

