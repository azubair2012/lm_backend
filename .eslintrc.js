module.exports = {
    parser: '@typescript-eslint/parser',
    extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
    ],
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    rules: {
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        'prefer-const': 'error',
        'no-var': 'error',
        'no-console': 'off',
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'indent': ['error', 2],
        'comma-dangle': ['error', 'never'],
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never']
    },
    env: {
        node: true,
        es6: true,
        jest: true
    }
};