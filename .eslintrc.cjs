module.exports = {
    env: {
        node: true,
        browser: true,
        es2021: true,
        jest: true
    },
    extends: ['eslint:recommended'],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script'
    },
    rules: {
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'no-console': 'off'
    },
    overrides: [
        {
            files: ['src/**/*.js', 'public/**/*.js'],
            parserOptions: {
                sourceType: 'module'
            }
        }
    ]
};
