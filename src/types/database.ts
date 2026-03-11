export type TradeType = 'call' | 'put'
export type TradeStatus = 'open' | 'closed'

export interface Trade {
  id: string
  user_id: string | null
  created_at: string
  updated_at: string
  trade_date: string
  trade_type: TradeType
  strike_price: number
  expiry_date: string
  quantity: number
  entry_price: number
  exit_price: number | null
  exit_date: string | null
  pnl: number | null
  iv_at_entry: number | null
  memo: string | null
  status: TradeStatus
  defeat_tags: string[] | null
  entry_delta: number | null
  entry_gamma: number | null
  entry_theta: number | null
  entry_vega: number | null
}

export interface JQuantsToken {
  id: string
  refresh_token: string
  id_token: string | null
  refresh_token_expires_at: string
  id_token_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface PushSubscriptionRecord {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      trades: {
        Row: Trade
        Insert: Omit<Trade, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Trade, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      j_quants_tokens: {
        Row: JQuantsToken
        Insert: Omit<JQuantsToken, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<JQuantsToken, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
    }
      push_subscriptions: {
        Row: PushSubscriptionRecord
        Insert: Omit<PushSubscriptionRecord, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PushSubscriptionRecord, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
