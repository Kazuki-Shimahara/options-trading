import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const publicDir = path.resolve(__dirname, '../../public')

describe('PWA manifest.json', () => {
  it('manifest.json exists in public directory', () => {
    const manifestPath = path.join(publicDir, 'manifest.json')
    expect(fs.existsSync(manifestPath)).toBe(true)
  })

  it('manifest.json is valid JSON', () => {
    const manifestPath = path.join(publicDir, 'manifest.json')
    const content = fs.readFileSync(manifestPath, 'utf-8')
    expect(() => JSON.parse(content)).not.toThrow()
  })

  it('has required PWA fields', () => {
    const manifestPath = path.join(publicDir, 'manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

    expect(manifest.name).toBeDefined()
    expect(manifest.short_name).toBeDefined()
    expect(manifest.start_url).toBeDefined()
    expect(manifest.display).toBeDefined()
    expect(manifest.background_color).toBeDefined()
    expect(manifest.theme_color).toBeDefined()
    expect(manifest.icons).toBeDefined()
    expect(Array.isArray(manifest.icons)).toBe(true)
  })

  it('has correct app name and description', () => {
    const manifestPath = path.join(publicDir, 'manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

    expect(manifest.name).toBe('NK225 Options')
    expect(manifest.short_name).toBe('NK225')
    expect(manifest.description).toBe(
      '日経225オプション取引の記録・分析・シグナル通知アプリ'
    )
  })

  it('display mode is standalone for native-like experience', () => {
    const manifestPath = path.join(publicDir, 'manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

    expect(manifest.display).toBe('standalone')
  })

  it('has icons with required sizes (192x192 and 512x512)', () => {
    const manifestPath = path.join(publicDir, 'manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })

  it('icons have correct type and src', () => {
    const manifestPath = path.join(publicDir, 'manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

    for (const icon of manifest.icons) {
      expect(icon.src).toBeDefined()
      expect(icon.type).toBe('image/png')
      expect(icon.sizes).toBeDefined()
    }
  })

  it('has start_url set to root', () => {
    const manifestPath = path.join(publicDir, 'manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

    expect(manifest.start_url).toBe('/')
  })

  it('has scope set to root', () => {
    const manifestPath = path.join(publicDir, 'manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

    expect(manifest.scope).toBe('/')
  })

  it('has orientation set to portrait', () => {
    const manifestPath = path.join(publicDir, 'manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

    expect(manifest.orientation).toBe('portrait')
  })
})

describe('layout.tsx manifest link', () => {
  it('layout.tsx contains link to manifest.json', () => {
    const layoutPath = path.resolve(__dirname, '../app/layout.tsx')
    const content = fs.readFileSync(layoutPath, 'utf-8')

    expect(content).toContain('manifest')
    expect(content).toContain('/manifest.json')
  })

  it('layout.tsx contains theme-color meta tag', () => {
    const layoutPath = path.resolve(__dirname, '../app/layout.tsx')
    const content = fs.readFileSync(layoutPath, 'utf-8')

    expect(content).toContain('themeColor')
  })

  it('layout.tsx contains apple-touch-icon link', () => {
    const layoutPath = path.resolve(__dirname, '../app/layout.tsx')
    const content = fs.readFileSync(layoutPath, 'utf-8')

    expect(content).toContain('apple-touch-icon')
  })

  it('layout.tsx contains apple-mobile-web-app-capable meta', () => {
    const layoutPath = path.resolve(__dirname, '../app/layout.tsx')
    const content = fs.readFileSync(layoutPath, 'utf-8')

    expect(content).toContain('apple-mobile-web-app-capable')
  })
})
