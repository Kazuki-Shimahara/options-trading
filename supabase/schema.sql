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
  entry_vega numeric(10, 2),
  market_env_tags text[],
  entry_iv_rank numeric(5, 2),
  entry_iv_hv_ratio numeric(8, 4),
  is_mini boolean not null default false,
  playbook_id uuid,
  playbook_compliance boolean,
  confidence_level integer check (confidence_level between 1 and 5),
  emotion text check (emotion in ('冷静', '焦り', '興奮', '不安', '楽観'))
);

-- ミニオプション対応マイグレーション（既存テーブルへの適用）
-- ALTER TABLE trades ADD COLUMN IF NOT EXISTS is_mini boolean NOT NULL DEFAULT false;

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

-- RLS
alter table trades enable row level security;

-- trades RLSポリシー: ユーザーは自分のトレードのみ操作可能
create policy "Users can select own trades" on trades
  for select using (auth.uid() = user_id);

create policy "Users can insert own trades" on trades
  for insert with check (auth.uid() = user_id);

create policy "Users can update own trades" on trades
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own trades" on trades
  for delete using (auth.uid() = user_id);

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

-- RLS
alter table iv_history enable row level security;

-- iv_history RLSポリシー: 全ユーザーが参照可能（書き込みはサービスロールのみ）
create policy "Anyone can select iv_history" on iv_history
  for select using (true);

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

-- =============================================
-- ユーザー通知フィルタ設定テーブル
-- =============================================
create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),           -- Phase 4用（現在はNULL許容）
  trading_style text not null default 'all' check (trading_style in ('buy_focused', 'sell_focused', 'all')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at を自動更新するトリガー
create trigger user_preferences_updated_at
  before update on user_preferences
  for each row execute function update_updated_at();

-- インデックス
create index if not exists user_preferences_user_id_idx on user_preferences (user_id);

-- RLS
alter table user_preferences enable row level security;

-- user_preferences RLSポリシー: ユーザーは自分の設定のみ操作可能
create policy "Users can select own preferences" on user_preferences
  for select using (auth.uid() = user_id);

create policy "Users can insert own preferences" on user_preferences
  for insert with check (auth.uid() = user_id);

create policy "Users can update own preferences" on user_preferences
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================
-- Playbookテーブル（取引ルール定義）
-- =============================================
create table if not exists playbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  rules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at を自動更新するトリガー
create trigger playbooks_updated_at
  before update on playbooks
  for each row execute function update_updated_at();

-- インデックス
create index if not exists playbooks_user_id_idx on playbooks (user_id);

-- RLS
alter table playbooks enable row level security;

-- playbooks RLSポリシー: ユーザーは自分のPlaybookのみ操作可能
create policy "Users can select own playbooks" on playbooks
  for select using (auth.uid() = user_id);

create policy "Users can insert own playbooks" on playbooks
  for insert with check (auth.uid() = user_id);

create policy "Users can update own playbooks" on playbooks
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own playbooks" on playbooks
  for delete using (auth.uid() = user_id);

-- trades テーブルに playbook 関連カラムを追加（マイグレーション）
-- ALTER TABLE trades ADD COLUMN IF NOT EXISTS playbook_id uuid;
-- ALTER TABLE trades ADD COLUMN IF NOT EXISTS playbook_compliance boolean;

-- trades.playbook_id の外部キー制約
-- ALTER TABLE trades ADD CONSTRAINT trades_playbook_id_fkey FOREIGN KEY (playbook_id) REFERENCES playbooks(id) ON DELETE SET NULL;

-- 感情トラッキングカラム追加（マイグレーション）
-- ALTER TABLE trades ADD COLUMN IF NOT EXISTS confidence_level integer CHECK (confidence_level BETWEEN 1 AND 5);
-- ALTER TABLE trades ADD COLUMN IF NOT EXISTS emotion text CHECK (emotion IN ('冷静', '焦り', '興奮', '不安', '楽観'));

-- =============================================
-- 含み損益アラート設定テーブル
-- =============================================
create table if not exists pnl_alert_settings (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  threshold_amount numeric(14, 2) not null,
  direction text not null default 'loss' check (direction in ('loss', 'profit', 'both')),
  enabled boolean not null default true,
  cooldown_minutes integer not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at を自動更新するトリガー
create trigger pnl_alert_settings_updated_at
  before update on pnl_alert_settings
  for each row execute function update_updated_at();

-- インデックス
create index if not exists pnl_alert_settings_trade_id_idx on pnl_alert_settings (trade_id);
create index if not exists pnl_alert_settings_enabled_idx on pnl_alert_settings (enabled);

-- RLS
alter table pnl_alert_settings enable row level security;

-- =============================================
-- 含み損益アラート通知履歴テーブル
-- =============================================
create table if not exists pnl_alert_notifications (
  id uuid primary key default gen_random_uuid(),
  alert_setting_id uuid not null references pnl_alert_settings(id) on delete cascade,
  trade_id uuid not null references trades(id) on delete cascade,
  triggered_pnl numeric(14, 2) not null,
  threshold_amount numeric(14, 2) not null,
  sent_at timestamptz not null default now()
);

-- インデックス
create index if not exists pnl_alert_notifications_setting_id_idx on pnl_alert_notifications (alert_setting_id);
create index if not exists pnl_alert_notifications_sent_at_idx on pnl_alert_notifications (sent_at desc);
