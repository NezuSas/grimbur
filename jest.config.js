module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    // Audio and image files are only ever passed around by reference in tests.
    moduleNameMapper: { '\.(wav|png)$': '<rootDir>/tests/helpers/fileMock.js' },
    testMatch: ['**/tests/**/*.test.ts'],
    setupFilesAfterEnv: [],
};
