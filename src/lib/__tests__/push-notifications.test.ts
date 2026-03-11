import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  urlBase64ToUint8Array,
  subscribeToPush,
  unsubscribeFromPush,
} from '../push-notifications'

// Mock navigator and ServiceWorker APIs
const mockSubscription = {
  endpoint: 'https://push.example.com/subscription/abc123',
  toJSON: () => ({
    endpoint: 'https://push.example.com/subscription/abc123',
    keys: {
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key',
    },
  }),
  unsubscribe: vi.fn().mockResolvedValue(true),
}

const mockPushManager = {
  subscribe: vi.fn().mockResolvedValue(mockSubscription),
  getSubscription: vi.fn().mockResolvedValue(null),
}

const mockRegistration = {
  pushManager: mockPushManager,
}

describe('urlBase64ToUint8Array', () => {
  it('VAPID公開鍵をUint8Arrayに変換する', () => {
    // Base64url encoded "hello"
    const base64String = 'aGVsbG8'
    const result = urlBase64ToUint8Array(base64String)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })

  it('パディング付きのBase64urlを正しく変換する', () => {
    const base64String = 'AAEC' // [0, 1, 2]
    const result = urlBase64ToUint8Array(base64String)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result[0]).toBe(0)
    expect(result[1]).toBe(1)
    expect(result[2]).toBe(2)
  })
})

describe('subscribeToPush', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  it('PushManagerで購読しAPIに保存する', async () => {
    // Valid base64url-encoded VAPID key (65 bytes of zeros)
    const vapidKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
    const result = await subscribeToPush(
      mockRegistration as unknown as ServiceWorkerRegistration,
      vapidKey
    )

    expect(mockPushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    })
    expect(global.fetch).toHaveBeenCalledWith('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: mockSubscription.toJSON(),
      }),
    })
    expect(result).toBe(mockSubscription)
  })

  it('API保存が失敗した場合エラーをスローする', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(
      subscribeToPush(
        mockRegistration as unknown as ServiceWorkerRegistration,
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      )
    ).rejects.toThrow('購読情報の保存に失敗しました')
  })
})

describe('unsubscribeFromPush', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
  })

  it('既存の購読を解除しAPIから削除する', async () => {
    mockPushManager.getSubscription.mockResolvedValue(mockSubscription)

    await unsubscribeFromPush(
      mockRegistration as unknown as ServiceWorkerRegistration
    )

    expect(mockSubscription.unsubscribe).toHaveBeenCalled()
    expect(global.fetch).toHaveBeenCalledWith('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: mockSubscription.endpoint,
      }),
    })
  })

  it('購読がない場合は何もしない', async () => {
    mockPushManager.getSubscription.mockResolvedValue(null)

    await unsubscribeFromPush(
      mockRegistration as unknown as ServiceWorkerRegistration
    )

    expect(mockSubscription.unsubscribe).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
