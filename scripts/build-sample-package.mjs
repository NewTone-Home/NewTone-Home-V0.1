import { readFile, writeFile } from 'node:fs/promises'
import JSZip from 'jszip'

const root = new URL('../public/sample-content/', import.meta.url)
const zip = new JSZip()
const paths = [
  'manifest.json',
  'chapters/chapter-001.zh-CN.md',
  'chapters/chapter-001.en.md',
  'world/world.json',
]

for (const path of paths) {
  zip.file(path, await readFile(new URL(path, root)))
}

await writeFile(
  new URL('ghost-market.newtone.zip', root),
  await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
)
