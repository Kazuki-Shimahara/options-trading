/**
 * Web Push通知 - VAPID-based subscription management
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

/**
 * VAPID公開鍵をUint8Arrayに変換
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Service Workerが対応しているかチェック
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * 現在の通知権限を取得
 */
export function getPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

/**
 * Service Workerを登録
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    console.warn('[Push] Push notifications are not supported in this browser')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
    console.log('[Push] Service Worker registered:', registration.scope)
    return registration
  } catch (error) {
    console.error('[Push] Service Worker registration failed:', error)
    return null
  }
}

/**
 * 通知権限をリクエスト
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported')
  }

  const permission = await Notification.requestPermission()
  console.log('[Push] Permission:', permission)
  return permission
}

/**
 * Push通知をサブスクライブし、サーバーに登録
 */
export async function subscribe(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported')
  }

  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VAPID public key is not configured')
  }

  const permission = await requestPermission()
  if (permission !== 'granted') {
    console.warn('[Push] Permission denied')
    return null
  }

  const registration = await registerServiceWorker()
  if (!registration) {
    throw new Error('Service Worker registration failed')
  }

  try {
    // 既存のサブスクリプションがあれば返す
    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      console.log('[Push] Using existing subscription')
      await saveSubscription(existingSubscription)
      return existingSubscription
    }

    // 新しいサブスクリプションを作成
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })

    console.log('[Push] New subscription created')
    await saveSubscription(subscription)
    return subscription
  } catch (error) {
    console.error('[Push] Subscribe failed:', error)
    throw error
  }
}

/**
 * Push通知のサブスクリプションを解除
 */
export async function unsubscribe(): Promise<boolean> {
  if (!isPushSupported()) return false

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    console.log('[Push] No subscription to unsubscribe')
    return true
  }

  try {
    // サーバーから削除
    await deleteSubscription(subscription)
    // ブラウザから削除
    const result = await subscription.unsubscribe()
    console.log('[Push] Unsubscribed:', result)
    return result
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error)
    return false
  }
}

/**
 * 現在のサブスクリプション状態を取得
 */
export async function getSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null

  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch {
    return null
  }
}

/**
 * サブスクリプションをサーバーに保存
 */
async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to save subscription')
  }
}

/**
 * サブスクリプションをサーバーから削除
 */
async function deleteSubscription(subscription: PushSubscription): Promise<void> {
  const response = await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })

  if (!response.ok) {
    console.error('[Push] Failed to delete subscription from server')
  }
}
