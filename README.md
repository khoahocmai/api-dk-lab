# API Lab

API Lab is a fast, lightweight, and modern REST and GraphQL API client for local development and testing.

## Features
- **REST & GraphQL Support**: Send GET, POST, PUT, PATCH, DELETE and GraphQL queries/mutations with full variable support.
- **GraphQL Schema Explorer**: Introspect GraphQL endpoints and generate query/mutation templates with one click.
- **Environment Variables & Presets**: Easily switch environments (`Local`, `Dev`, `Prod`) with variable substitution (`{{Domain}}`, `{{token}}`).
- **Postman Collection v2.1 Import/Export**: Seamlessly import existing collections and export backups.
- **Automated Test Scripts**: Write assertions using JavaScript sandbox (`pm.test`, `pm.expect`, `pm.environment.set`).
- **Code Snippet Generator**: Export requests to cURL, JavaScript Fetch/Axios, Python Requests, Go, and PHP.
- **Lightweight Desktop App**: Powered by Electron, React, and TypeScript with a unified Dark Theme.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
