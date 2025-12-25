import { defineConfig } from 'prisma/config'

export default defineConfig({
  seed: {
    command: 'node prisma/seed.js'
  }
})
