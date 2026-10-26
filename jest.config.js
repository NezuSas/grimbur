module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    // Audio and image files are only ever passed around by reference in tests.
    moduleNameMapper: { '\.(wav|ogg|m4a|png|jpe?g)$': '<rootDir>/tests/helpers/fileMock.js' },
    testMatch: ['**/tests/**/*.test.ts'],
    // The rules tests need the Firestore emulator: `npm run test:rules`.
    testPathIgnorePatterns: ['/node_modules/', '/tests/rules/'],
    setupFilesAfterEnv: [],
};
