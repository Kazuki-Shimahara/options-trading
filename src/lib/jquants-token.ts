/**
 * J-Quants トークン管理ユーティリティ
 *
 * Supabaseにトークンを永続化し、有効期限に基づいた自動更新を行う。
 * - リフレッシュトークン有効期限: 1週間
 * - IDトークン有効期限: 24時間
 */

import { supabase } from './supabase'
import { getIdToken, getRefreshToken } from './jquants'

// --- 型定義 ---

export interface JQuantsTokenRecord {
  id: string
  refresh_token: string
  id_token: string | null
  refresh_token_expires_at: string
  id_token_expires_at: string | null
  created_at: string
  updated_at: string
}

// IDトークンの有効期限バッファ（5分前に更新）
const ID_TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000
// リフレッシュトークンの有効期限バッファ（1時間前に更新）
const REFRESH_TOKEN_EXPIRY_BUFFER_MS = 60 * 60 * 1000
// リフレッシュトークンの有効期間（1週間）
const REFRESH_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000
// IDトークンの有効期間（24時間）
const ID_TOKEN_LIFETIME_MS = 24 * 60 * 60 * 1000

// --- トークン永続化 ---

/**
 * トークンをSupabaseに保存する
 *
 * 既存レコードがある場合はupdateし、なければinsertする（シングルテナント想定）。
 */
export async function saveTokens(
  refreshToken: string,
  idToken: string | null,
  refreshTokenExpiresAt: Date,
  idTokenExpiresAt: Date | null,
): Promise<void> {
  // 既存レコードを取得
  const { data: existing } = await supabase
    .from('j_quants_tokens')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    // 既存レコードを更新
    const { error } = await supabase
      .from('j_quants_tokens')
      .update({
        refresh_token: refreshToken,
        id_token: idToken,
        refresh_token_expires_at: refreshTokenExpiresAt.toISOString(),
        id_token_expires_at: idTokenExpiresAt?.toISOString() ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) {
      throw new Error(`Failed to update tokens: ${error.message}`)
    }
  } else {
    // 新規レコードを作成
    const { error } = await supabase.from('j_quants_tokens').insert({
      refresh_token: refreshToken,
      id_token: idToken,
      refresh_token_expires_at: refreshTokenExpiresAt.toISOString(),
      id_token_expires_at: idTokenExpiresAt?.toISOString() ?? null,
    })

    if (error) {
      throw new Error(`Failed to save tokens: ${error.message}`)
    }
  }
}

/**
 * Supabaseからトークンレコードを取得する
 */
export async function getStoredTokens(): Promise<JQuantsTokenRecord | null> {
  const { data, error } = await supabase
    .from('j_quants_tokens')
    .select('*')
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data as JQuantsTokenRecord
}

// --- トークン有効性チェック ---

function isTokenExpired(expiresAt: string | null, bufferMs: number): boolean {
  if (!expiresAt) return true
  const expiryTime = new Date(expiresAt).getTime()
  return Date.now() >= expiryTime - bufferMs
}

// --- 自動更新付きトークン取得 ---

/**
 * 有効なIDトークンを取得する
 *
 * 1. Supabaseに保存されたトークンを確認
 * 2. IDトークンが有効ならそのまま返す
 * 3. IDトークンが期限切れならリフレッシュトークンで再取得
 * 4. リフレッシュトークンも期限切れならメールアドレス/パスワードで再認証
 *
 * @returns 有効なIDトークン
 * @throws リフレッシュトークンが期限切れかつ認証情報が未設定の場合
 */
export async function getValidIdToken(): Promise<string> {
  const stored = await getStoredTokens()

  // 保存されたトークンがない場合 → 初期認証が必要
  if (!stored) {
    return await reauthenticateAndSave()
  }

  // IDトークンが有効ならそのまま返す
  if (
    stored.id_token &&
    !isTokenExpired(stored.id_token_expires_at, ID_TOKEN_EXPIRY_BUFFER_MS)
  ) {
    return stored.id_token
  }

  // リフレッシュトークンが有効 → IDトークンを再取得
  if (
    !isTokenExpired(
      stored.refresh_token_expires_at,
      REFRESH_TOKEN_EXPIRY_BUFFER_MS,
    )
  ) {
    return await refreshIdTokenAndSave(stored.refresh_token)
  }

  // リフレッシュトークンも期限切れ → メールアドレス/パスワードで再認証
  return await reauthenticateAndSave()
}

/**
 * リフレッシュトークンを使ってIDトークンを再取得し、Supabaseに保存する
 */
async function refreshIdTokenAndSave(refreshToken: string): Promise<string> {
  const idToken = await getIdToken(refreshToken)
  const idTokenExpiresAt = new Date(Date.now() + ID_TOKEN_LIFETIME_MS)

  // リフレッシュトークンの有効期限は変わらないので、既存の値を保持
  const stored = await getStoredTokens()
  const refreshTokenExpiresAt = stored
    ? new Date(stored.refresh_token_expires_at)
    : new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS)

  await saveTokens(refreshToken, idToken, refreshTokenExpiresAt, idTokenExpiresAt)

  return idToken
}

/**
 * メールアドレス/パスワードで再認証し、トークンをSupabaseに保存する
 */
async function reauthenticateAndSave(): Promise<string> {
  const mailAddress = process.env.J_QUANTS_MAIL_ADDRESS
  const password = process.env.J_QUANTS_PASSWORD

  if (!mailAddress || !password) {
    throw new Error(
      'J-Quants credentials not configured. Set J_QUANTS_MAIL_ADDRESS and J_QUANTS_PASSWORD environment variables.',
    )
  }

  // リフレッシュトークンを取得
  const refreshToken = await getRefreshToken(mailAddress, password)
  const refreshTokenExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_LIFETIME_MS,
  )

  // IDトークンを取得
  const idToken = await getIdToken(refreshToken)
  const idTokenExpiresAt = new Date(Date.now() + ID_TOKEN_LIFETIME_MS)

  // 保存
  await saveTokens(refreshToken, idToken, refreshTokenExpiresAt, idTokenExpiresAt)

  return idToken
}
