import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const publicUrl = new URL('../public/', import.meta.url)
const source = await readFile(new URL('favicon.svg', publicUrl), 'utf8')
// Preserve the vector artwork. Android supplies the outer shape, so the canvas
// must be opaque all the way to its edges rather than pre-rounded.
const artwork = source.replace(/<svg[^>]*>/, '').replace('</svg>', '')
  .replace(/<title[^>]*>.*?<\/title>/s, '')
  .replace(/<rect width="128" height="128"[^>]*\/>/, '')
function svg(scale) {
  // Artwork center is (68,64). At 0.95 scale its strokes fit inside the
  // guaranteed circular maskable safe zone (radius 51.2 in a 128px canvas).
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="#0F172A"/><g transform="translate(64 64) scale(${scale}) translate(-68 -64)">${artwork}</g></svg>`
}
await writeFile(new URL('icon.svg', publicUrl), svg(1))
await writeFile(new URL('maskable-icon.svg', publicUrl), svg(0.95))
for (const size of [192, 512]) {
  for (const [prefix, scale] of [['icon', 1], ['maskable-icon', 0.95]]) {
    await sharp(Buffer.from(svg(scale))).resize(size, size).removeAlpha().png()
      .toFile(fileURLToPath(new URL(`${prefix}-${size}.png`, publicUrl)))
  }
}
await sharp(Buffer.from(svg(1))).resize(180, 180).removeAlpha().png()
  .toFile(fileURLToPath(new URL('apple-touch-icon.png', publicUrl)))
console.log('Generated opaque standard, Android maskable and Apple icons.')
