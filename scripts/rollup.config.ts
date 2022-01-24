import typescript from '@rollup/plugin-typescript';
// import path from 'path';
// import { terser } from 'rollup-plugin-terser';

// const projectRootDir = path.resolve(__dirname, '..', '..');

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/umd/web-worker-helper.js',
        format: 'umd',
        name: 'webWorkerHelper',
        sourcemap: true,
        // plugins: [terser()],
      },
    ],
    plugins: [typescript()],
  },
  {
    input: 'src/workers/null-worker.ts',
    output: [
      {
        file: 'dist/null-worker.js',
        format: 'iife',
        sourcemap: true,
      },
    ],
    plugins: [typescript()],
  },
];
