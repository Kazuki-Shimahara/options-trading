import { describe, it, expect } from 'vitest'
import nextConfig from '../../next.config'

describe('Security Headers', () => {
  it('next.config.ts exports a headers function', () => {
    expect(nextConfig.headers).toBeDefined()
    expect(typeof nextConfig.headers).toBe('function')
  })

  it('returns security headers for all routes', async () => {
    const headers = await nextConfig.headers!()
    const allRoutesEntry = headers.find(
      (h: { source: string }) => h.source === '/(.*)'
    )

    expect(allRoutesEntry).toBeDefined()
    const headerMap = new Map(
      allRoutesEntry!.headers.map((h: { key: string; value: string }) => [h.key, h.value])
    )

    // X-Frame-Options
    expect(headerMap.get('X-Frame-Options')).toBe('DENY')

    // X-Content-Type-Options
    expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff')

    // Referrer-Policy
    expect(headerMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')

    // Permissions-Policy
    expect(headerMap.has('Permissions-Policy')).toBe(true)

    // Content-Security-Policy
    expect(headerMap.has('Content-Security-Policy')).toBe(true)
  })

  it('CSP includes required directives', async () => {
    const headers = await nextConfig.headers!()
    const allRoutesEntry = headers.find(
      (h: { source: string }) => h.source === '/(.*)'
    )
    const headerMap = new Map(
      allRoutesEntry!.headers.map((h: { key: string; value: string }) => [h.key, h.value])
    )
    const csp = headerMap.get('Content-Security-Policy')!

    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain('script-src')
    expect(csp).toContain('style-src')
    expect(csp).toContain('img-src')
    expect(csp).toContain('connect-src')
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('Permissions-Policy restricts sensitive APIs', async () => {
    const headers = await nextConfig.headers!()
    const allRoutesEntry = headers.find(
      (h: { source: string }) => h.source === '/(.*)'
    )
    const headerMap = new Map(
      allRoutesEntry!.headers.map((h: { key: string; value: string }) => [h.key, h.value])
    )
    const permissionsPolicy = headerMap.get('Permissions-Policy')!

    expect(permissionsPolicy).toContain('camera=()')
    expect(permissionsPolicy).toContain('microphone=()')
    expect(permissionsPolicy).toContain('geolocation=()')
  })
})
