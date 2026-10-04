import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

// Latency benchmarks for the Generate route. Not part of `npm test`: they call
// the real AI APIs (costs a few cents per run) and take minutes. Run with
//   npx vitest run --config vitest.bench.config.ts
const merged = mergeConfig(base, defineConfig({ test: { environment: "node", testTimeout: 20 * 60_000 } }));

// mergeConfig concatenates arrays, which would pull every unit test in too.
merged.test!.include = ["tests/bench/**/*.bench.test.ts"];
merged.test!.setupFiles = ["tests/bench/loadEnv.ts"];

export default merged;
