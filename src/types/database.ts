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

export type Database = {
  public: {
    Tables: {
      trades: {
        Row: Trade
        Insert: Omit<Trade, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Trade, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
