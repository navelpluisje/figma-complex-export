import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import alias from '@rollup/plugin-alias';
import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH

export const sharedPlugins = [
  alias({
    entries: [
      { find: '@utils', replacement: '../utils' },
      { find: '@components', replacement: '../components' },
      { find: '@constants', replacement: '../constants' },
      { find: '@stores', replacement: '../stores' }
    ]
  }),
  commonjs({ transformMixedEsModules: true }),
  typescript({
    sourceMap: !production,
    inlineSources: !production
  }),
  // If prod mode, we minify
  production && terser(),
];
