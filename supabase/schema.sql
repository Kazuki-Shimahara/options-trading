-- 売買履歴テーブル
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),           -- Phase 4用（現在はNULL許容）
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  trade_date date not null,
  trade_type text not null check (trade_type in ('call', 'put')),
  strike_price integer not null,
  expiry_date date not null,                         -- 限月（必須）
  quantity integer not null check (quantity > 0),
  entry_price numeric(10, 2) not null,
  exit_price numeric(10, 2),
  exit_date date,                                    -- 決済日
  pnl numeric(14, 2),                                -- 小数点2桁
  iv_at_entry numeric(6, 2),
  memo text,
  status text not null default 'open' check (status in ('open', 'closed')),
  defeat_tags text[],
  entry_delta numeric(8, 4),
  entry_gamma numeric(10, 6),
  entry_theta numeric(10, 2),
  entry_vega numeric(10, 2)
);

-- updated_at を自動更新するトリガー
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trades_updated_at
  before update on trades
  for each row execute function update_updated_at();

-- インデックス
create index if not exists trades_trade_date_idx on trades (trade_date desc);
create index if not exists trades_status_idx on trades (status);
create index if not exists trades_user_id_idx on trades (user_id);

-- RLS（Phase 4で有効化）
alter table trades enable row level security;
-- Phase 4でのポリシー追加例:
-- create policy "Users can only see own trades" on trades for select using (auth.uid() = user_id);

-- =============================================
-- J-Quants API トークン管理テーブル
-- =============================================
create table if not exists j_quants_tokens (
  id uuid primary key default gen_random_uuid(),
  refresh_token text not null,
  id_token text,
  refresh_token_expires_at timestamptz not null,
  id_token_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- updated_at を自動更新するトリガー
create trigger j_quants_tokens_updated_at
  before update on j_quants_tokens
  for each row execute function update_updated_at();

-- =============================================
-- IVキャッシュテーブル（Phase 2用）
-- =============================================
create table if not exists iv_history (
  id uuid primary key default gen_random_uuid(),
  recorded_at timestamptz not null default now(),
  underlying_price numeric(10, 2) not null,
  strike_price integer not null,
  expiry_date date not null,
  option_type text not null check (option_type in ('call', 'put')),
  iv numeric(8, 4) not null,
  iv_rank numeric(5, 2),
  iv_percentile numeric(5, 2),
  hv20 numeric(8, 4),
  hv60 numeric(8, 4),
  nikkei_vi numeric(6, 2),
  pcr numeric(6, 3),
  data_source text not null
);

-- インデックス
create index if not exists iv_history_recorded_at_idx on iv_history (recorded_at desc);
create index if not exists iv_history_strike_expiry_idx on iv_history (strike_price, expiry_date);
create index if not exists iv_history_option_type_idx on iv_history (option_type);

-- RLS（Phase 4で有効化）
alter table iv_history enable row level security;

-- =============================================
-- Web Push購読管理テーブル
-- =============================================
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- updated_at を自動更新するトリガー
create trigger push_subscriptions_updated_at
  before update on push_subscriptions
  for each row execute function update_updated_at();

-- インデックス
create index if not exists push_subscriptions_endpoint_idx on push_subscriptions (endpoint);
