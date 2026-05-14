# @daily-tour/shared-config

Shared ESLint 9 (flat config), Prettier 3, and TypeScript config presets for all Daily Tour packages.

## ESLint

Each package creates its own `eslint.config.js` that imports the right preset:

**Node service:**

```js
// eslint.config.js
import { eslintNode } from "@daily-tour/shared-config";
export default eslintNode;
```

**React app:**

```js
// eslint.config.js
import { eslintReact } from "@daily-tour/shared-config";
export default eslintReact;
```

You can also extend a base config by importing from the sub-path directly:

```js
import nodeConfig from "@daily-tour/shared-config/eslint/node";
```

## TypeScript

Extend the appropriate preset in your package's `tsconfig.json`:

**Node service:**

```json
{ "extends": "@daily-tour/shared-config/tsconfig/node" }
```

**React / Vite app:**

```json
{ "extends": "@daily-tour/shared-config/tsconfig/react" }
```

Both presets extend the root `tsconfig.base.json`. The node preset uses `NodeNext` module resolution; the react preset uses `bundler` mode (Vite-compatible).

## Prettier

The root `.prettierrc` already references this package. To use it in a new workspace root, create `.prettierrc` with:

```
"@daily-tour/shared-config/prettier"
```

### Config values

| Option | Value |
|---|---|
| `printWidth` | 100 |
| `singleQuote` | false (double quotes) |
| `semi` | true |
| `trailingComma` | "all" |
| `arrowParens` | "always" |
| `endOfLine` | "lf" |
