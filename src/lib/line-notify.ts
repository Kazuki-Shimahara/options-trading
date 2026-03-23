/**
 * LINE Messaging API クライアント
 * Flex Messageを指定ユーザーにPush送信する
 */

import type { FlexMessage } from '@/lib/daily-summary'

const LINE_API_URL = 'https://api.line.me/v2/bot/message/push'

/**
 * LINE Flex Messageを送信する
 */
export async function sendLineFlexMessage(message: FlexMessage): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured')
  }

  const userId = process.env.LINE_USER_ID
  if (!userId) {
    throw new Error('LINE_USER_ID is not configured')
  }

  const response = await fetch(LINE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [message],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`LINE API error (${response.status}): ${errorText}`)
  }
}
