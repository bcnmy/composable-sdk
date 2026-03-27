
Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.


## Code Style

Always refer to `biome.json` for coding style rules — indentation, quotes, semicolons, import order, and lint rules are all defined there. Do not deviate from them.

After writing or modifying any code, always run:

```bash
bun run check
```

This formats and lints in one pass. Fix any errors before considering the task done.

## Build

After writing or modifying any code, always run:

```bash
bun run build
```

Resolve any TypeScript errors before finishing. Do not leave the build in a broken state.

## Documentation

Always use Context7 (`mcp__context7__resolve-library-id` + `mcp__context7__query-docs`) for library/API documentation, code generation, and setup or configuration steps without waiting for an explicit ask.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```