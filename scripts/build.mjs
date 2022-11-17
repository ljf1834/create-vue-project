import * as esbuild from 'esbuild'

await esbuild.build({
  bundle: true,
  entryPoints: ['main.ts'],
  outfile: 'outfile.cjs',
  format: 'cjs',
  platform: 'node',
  target: 'node14',
	watch: true,
	treeShaking: true,
  plugins: [
    {
      name: 'alias',
      setup({ onResolve, resolve }) {
        onResolve({ filter: /^prompts$/, namespace: 'file' }, async ({ importer, resolveDir }) => {
          // we can always use non-transpiled code since we support 14.16.0+
          const result = await resolve('prompts/lib/index.js', { importer, resolveDir })
          return result
        })
      }
    },
  ]
}).then(() => {
	console.log('watching...')
})
