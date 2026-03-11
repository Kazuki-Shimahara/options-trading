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
