/**
 * J-Quants API クライアント
 *
 * JPX公式のJ-Quants API v3に接続し、オプション・先物価格データを取得する。
 * 認証トークンの自動管理機能を含む。
 *
 * @see https://jpx.gitbook.io/j-quants-api
 */

const JQUANTS_API_BASE = 'https://api.jquants.com/v1'

// --- API エンドポイント定義 ---
const ENDPOINTS = {
  // 認証
  TOKEN_AUTH_USER: '/token/auth_user',
  TOKEN_AUTH_REFRESH: '/token/auth_refresh',
  // マーケットデータ
  OPTION_INDEX_OPTION: '/option/index_option',
  DERIVATIVES_FUTURES: '/derivatives/futures',
  INDICES: '/indices',
} as const

// --- 型定義 ---

export interface JQuantsAuthResponse {
  refreshToken: string
}

export interface JQuantsRefreshResponse {
  idToken: string
}

export interface JQuantsOptionPrice {
  Date: string
  Code: string
  WholeDayOpen: number | null
  WholeDayHigh: number | null
  WholeDayLow: number | null
  WholeDayClose: number | null
  Volume: number | null
  OpenInterest: number | null
  TurnoverValue: number | null
  ContractMonth: string
  StrikePrice: number
  PutCallDivision: string // "1" = Put, "2" = Call
  ImpliedVolatility: number | null
  UnderlyingPrice: number | null
  TheoreticalPrice: number | null
}

export interface JQuantsOptionPricesResponse {
  index_option: JQuantsOptionPrice[]
}

export interface JQuantsFuturesPrice {
  Date: string
  Code: string
  WholeDayOpen: number | null
  WholeDayHigh: number | null
  WholeDayLow: number | null
  WholeDayClose: number | null
  Volume: number | null
  OpenInterest: number | null
  TurnoverValue: number | null
  ContractMonth: string
}

export interface JQuantsFuturesPricesResponse {
  futures: JQuantsFuturesPrice[]
}

export interface JQuantsIndicesResponse {
  indices: {
    Date: string
    Code: string
    Open: number | null
    High: number | null
    Low: number | null
    Close: number | null
  }[]
}

export class JQuantsApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string,
  ) {
    super(message)
    this.name = 'JQuantsApiError'
  }
}

// --- 認証関連 ---

/**
 * メールアドレス/パスワードでリフレッシュトークンを取得する
 */
export async function getRefreshToken(
  mailAddress: string,
  password: string,
): Promise<string> {
  const response = await fetch(
    `${JQUANTS_API_BASE}${ENDPOINTS.TOKEN_AUTH_USER}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mailaddress: mailAddress,
        password: password,
      }),
    },
  )

  if (!response.ok) {
    throw new JQuantsApiError(
      `Failed to get refresh token: ${response.statusText}`,
      response.status,
      ENDPOINTS.TOKEN_AUTH_USER,
    )
  }

  const data = (await response.json()) as JQuantsAuthResponse
  return data.refreshToken
}

/**
 * リフレッシュトークンからIDトークン（アクセストークン）を取得する
 */
export async function getIdToken(refreshToken: string): Promise<string> {
  const params = new URLSearchParams({ refreshtoken: refreshToken })
  const response = await fetch(
    `${JQUANTS_API_BASE}${ENDPOINTS.TOKEN_AUTH_REFRESH}?${params}`,
    {
      method: 'POST',
    },
  )

  if (!response.ok) {
    throw new JQuantsApiError(
      `Failed to get ID token: ${response.statusText}`,
      response.status,
      ENDPOINTS.TOKEN_AUTH_REFRESH,
    )
  }

  const data = (await response.json()) as JQuantsRefreshResponse
  return data.idToken
}

// --- 認証付きAPI呼び出し ---

/**
 * 認証付きでJ-Quants APIを呼び出す
 *
 * @param endpoint - APIエンドポイントパス
 * @param idToken - IDトークン
 * @param params - クエリパラメータ
 */
export async function fetchWithAuth<T>(
  endpoint: string,
  idToken: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${JQUANTS_API_BASE}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  })

  if (!response.ok) {
    throw new JQuantsApiError(
      `API request failed: ${response.statusText}`,
      response.status,
      endpoint,
    )
  }

  return (await response.json()) as T
}

// --- データ取得ヘルパー ---

/**
 * オプション価格を取得する
 *
 * @param idToken - IDトークン
 * @param date - 取得日（YYYY-MM-DD形式）。省略時は直近営業日
 */
export async function fetchOptionPrices(
  idToken: string,
  date?: string,
): Promise<JQuantsOptionPrice[]> {
  const params: Record<string, string> = {}
  if (date) {
    params.date = date
  }

  const data = await fetchWithAuth<JQuantsOptionPricesResponse>(
    ENDPOINTS.OPTION_INDEX_OPTION,
    idToken,
    params,
  )
  return data.index_option ?? []
}

/**
 * 先物価格を取得する
 *
 * @param idToken - IDトークン
 * @param date - 取得日（YYYY-MM-DD形式）。省略時は直近営業日
 */
export async function fetchFuturesPrices(
  idToken: string,
  date?: string,
): Promise<JQuantsFuturesPrice[]> {
  const params: Record<string, string> = {}
  if (date) {
    params.date = date
  }

  const data = await fetchWithAuth<JQuantsFuturesPricesResponse>(
    ENDPOINTS.DERIVATIVES_FUTURES,
    idToken,
    params,
  )
  return data.futures ?? []
}

/**
 * 指数データ（日経平均・日経VIなど）を取得する
 *
 * @param idToken - IDトークン
 * @param code - 指数コード（例: "0000" = 日経225）
 * @param date - 取得日（YYYY-MM-DD形式）
 */
export async function fetchIndices(
  idToken: string,
  code?: string,
  date?: string,
): Promise<JQuantsIndicesResponse['indices']> {
  const params: Record<string, string> = {}
  if (code) params.code = code
  if (date) params.date = date

  const data = await fetchWithAuth<JQuantsIndicesResponse>(
    ENDPOINTS.INDICES,
    idToken,
    params,
  )
  return data.indices ?? []
}
