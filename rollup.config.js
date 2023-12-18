import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';
import svelte from 'rollup-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import postcss from 'rollup-plugin-postcss';
import htmlBundle from 'rollup-plugin-html-bundle';
import { sharedPlugins } from './config/rollup.plugins';

// Minifier

const production = !process.env.ROLLUP_WATCH


export default [
  {
    input: 'src/ui/main.ts',
    output: {
      format: 'umd',
      name: 'ui',
      file: 'public/bundle.js',
    },
    plugins: [
      ...sharedPlugins,
      postcss({
        plugins: []
      }),
      svelte({
        // enable run-time checks when not in production
        dev: !production,
        preprocess: sveltePreprocess({ postcss: true }),
        onwarn: (warning, handler) => {
          const { code, frame } = warning
          if (code === "css-unused-selector" && frame.includes("shape")) return

          handler(warning)
        },
      }),
      // Handle external dependencies and prepare
      // the terrain for svelte later on
      resolve({
        browser: true,
        dedupe: (importee) =>
          importee === 'svelte' || importee.startsWith('svelte/'),
        extensions: ['.svelte', '.mjs', '.js', '.json', '.node', '.ts'],
      }),


      // This inject the bundled version of main.js
      // into the the template
      htmlBundle({
        template: 'src/index.html',
        target: 'public/index.html',
        inline: true,
      }),

      // If dev mode, serve and livereload
      !production && serve(),
      !production && livereload('public'),

    ],
    watch: {
      clearScreen: true,
    },
  },

  // CODE.JS
  // The part that communicate with Figma directly
  // Communicate with main.js via event send/binding
  {
    input: 'src/code/index.ts',
    output: {
      file: 'public/code.js',
      format: 'iife',
      name: 'code',
    },
    plugins: [
      ...sharedPlugins,
      resolve({
        extensions: ['.mjs', '.js', '.json', '.node', '.ts'],
      }),
    ],
  },
]

function serve() {
  let started = false

  return {
    writeBundle() {
      if (!started) {
        started = true

        require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: true,
        })
      }
    },
  }
}
