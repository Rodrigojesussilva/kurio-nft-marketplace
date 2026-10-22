import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const directory = path.resolve('src/assets/images')
const files = (await readdir(directory)).filter((name) => name.endsWith('.png'))
const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage()
  for (const name of files) {
    const source = (await readFile(path.join(directory, name))).toString('base64')
    const encoded = await page.evaluate(async (data) => {
      const image = new Image()
      image.src = `data:image/png;base64,${data}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      canvas.getContext('2d').drawImage(image, 0, 0)
      return canvas.toDataURL('image/webp', 0.9).split(',')[1]
    }, source)
    const outputPath = path.join(directory, name.replace(/\.png$/, '.webp'))
    await writeFile(outputPath, Buffer.from(encoded, 'base64'))
    console.log(`${name}: ${(await stat(path.join(directory, name))).size} -> ${path.basename(outputPath)}: ${(await stat(outputPath)).size}`)
  }
} finally {
  await browser.close()
}
