import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const templatePath = join(root, 'public/sw.template.js')
const outputPath = join(root, 'public/sw.js')

const buildId =
  process.env.NETLIFY_DEPLOY_ID ||
  process.env.DEPLOY_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  `local-${Date.now()}`

const template = readFileSync(templatePath, 'utf8')
const output = template.replaceAll('__BUILD_ID__', buildId)
writeFileSync(outputPath, output)

console.log(`[stamp-sw] Generated public/sw.js with build id: ${buildId}`)
