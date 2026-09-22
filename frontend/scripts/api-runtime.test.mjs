import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Native Node imports catch CommonJS/ESM failures hidden by Vite's bundler.
test('both deployment roots compile and invoke station/location functions as native ESM', () => {
  const workspace = fileURLToPath(new URL('../../', import.meta.url))
  const compiler = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url))
  const output = mkdtempSync(join(tmpdir(), 'car-vault-api-runtime-'))
  try {
    for (const config of ['api/tsconfig.json', 'frontend/api/tsconfig.json']) {
      execFileSync(process.execPath, [compiler, '--project', join(workspace, config), '--noEmit', 'false', '--rootDir', workspace, '--outDir', output], { stdio: 'pipe' })
    }
    mkdirSync(join(output, 'frontend'), { recursive: true })
    for (const file of ['package.json', 'frontend/package.json']) copyFileSync(join(workspace, file), join(output, file))
    const endpoints = ['api/gas-stations.js', 'frontend/api/gas-stations.js', 'api/location-search.js', 'frontend/api/location-search.js']
    const script = `
      import { strict as assert } from 'node:assert';
      globalThis.fetch = async (url) => new Response(JSON.stringify(url.includes('photon') ? { features: [] } : { stations: [] }));
      for (const url of ${JSON.stringify(endpoints.map(file => pathToFileURL(join(output, file)).href))}) {
        const { default: handler } = await import(url);
        const response = { statusCode: 0, setHeader() {}, end(body) { this.body = JSON.parse(body); } };
        const query = url.includes('location-search') ? '?q=Montreal' : '?lat=45.5&lng=-73.56&radius=5&fuelType=ordinaire&sort=distance';
        await handler({ method: 'GET', url: '/' + query }, response);
        assert.equal(response.statusCode, 200, url);
        assert.ok(response.body.stations || response.body.features);
      }
      console.log('4 native function entry points passed');
    `
    const result = execFileSync(process.execPath, ['--input-type=module'], { input: script, encoding: 'utf8' })
    assert.match(result, /4 native function entry points passed/)
  } finally {
    // Delete only the exact temporary directory this test created.
    assert.ok(resolve(output).startsWith(resolve(tmpdir()) + sep))
    rmSync(output, { recursive: true, force: true })
  }
})
