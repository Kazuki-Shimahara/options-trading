import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendLineFlexMessage } from '../line-notify'

describe('sendLineFlexMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('LINE_CHANNEL_ACCESS_TOKEN', 'test-token')
    vi.stubEnv('LINE_USER_ID', 'test-user-id')
  })

  it('LINE Messaging APIにFlex Messageを送信する', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    const flexMessage = {
      type: 'flex' as const,
      altText: '今日のサマリー',
      contents: { type: 'bubble' as const, body: { type: 'box' as const, layout: 'vertical' as const, contents: [] } },
    }

    await sendLineFlexMessage(flexMessage)

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.line.me/v2/bot/message/push',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          to: 'test-user-id',
          messages: [flexMessage],
        }),
      })
    )
  })

  it('LINE_CHANNEL_ACCESS_TOKENが未設定の場合エラー', async () => {
    vi.stubEnv('LINE_CHANNEL_ACCESS_TOKEN', '')

    const flexMessage = {
      type: 'flex' as const,
      altText: 'test',
      contents: { type: 'bubble' as const, body: { type: 'box' as const, layout: 'vertical' as const, contents: [] } },
    }

    await expect(sendLineFlexMessage(flexMessage)).rejects.toThrow(
      'LINE_CHANNEL_ACCESS_TOKEN'
    )
  })

  it('LINE_USER_IDが未設定の場合エラー', async () => {
    vi.stubEnv('LINE_USER_ID', '')

    const flexMessage = {
      type: 'flex' as const,
      altText: 'test',
      contents: { type: 'bubble' as const, body: { type: 'box' as const, layout: 'vertical' as const, contents: [] } },
    }

    await expect(sendLineFlexMessage(flexMessage)).rejects.toThrow(
      'LINE_USER_ID'
    )
  })

  it('APIレスポンスがエラーの場合エラーをスロー', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad Request'),
    })

    const flexMessage = {
      type: 'flex' as const,
      altText: 'test',
      contents: { type: 'bubble' as const, body: { type: 'box' as const, layout: 'vertical' as const, contents: [] } },
    }

    await expect(sendLineFlexMessage(flexMessage)).rejects.toThrow(
      'LINE API error'
    )
  })
})
