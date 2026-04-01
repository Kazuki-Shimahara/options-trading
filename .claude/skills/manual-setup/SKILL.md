---
name: manual-setup
description: WEBシステム操作マニュアル作成の準備フェーズを実行します。ルーティング調査・認証確認・Phase設計・スキャフォールディングを行います。
---

# マニュアル作成: 準備フェーズ

WEBシステムの操作マニュアル（スクリーンショット付きMarkdown）を半自動で生成するための準備を行います。
以下の Step 1〜5 を順に実行してください。

---

## Step 1. 環境確認

### 1-1. Playwright MCP の確認

Playwright MCPサーバーが利用可能であることを確認してください。
利用できない場合は、ユーザーに以下を伝えてください:

```
このスキルは Playwright MCP が必要です。
プラグインの .mcp.json で設定済みですが、MCP サーバーが起動していることを確認してください。
```

### 1-2. 日本語フォントの確認（WSL2環境）

WSL2環境の場合、日本語フォントが必要です。未インストールの場合はユーザーに以下を案内してください:

```bash
sudo apt install fonts-noto-cjk
```

### 1-3. アプリケーション起動確認

撮影対象のWEBアプリケーションがアクセス可能であることをユーザーに確認してください。

---

## Step 2. ルーティング調査

**目的:** コードベースから全画面・全URLを網羅的に洗い出す。

### 調査手順

プロジェクトのフレームワークを特定し、適切な手法でルート一覧を取得してください。

#### Laravel
```bash
# ルート一覧を出力
php artisan route:list --columns=method,uri,name,action,middleware

# Docker環境の場合
docker compose exec app php artisan route:list --columns=method,uri,name,action,middleware
```
加えて `routes/web.php`, `routes/api.php` を読み、グルーピング構造・ミドルウェアを把握する。

#### Next.js / Nuxt.js（ファイルベースルーティング）
1. `pages/` または `app/` ディレクトリのファイル構造を走査する
2. `[id]` や `[...slug]` 等の動的ルートを特定する
3. `middleware.ts` での認証・リダイレクトを確認する
4. `layout.tsx` からナビゲーション構造を把握する

#### React Router / Vue Router
1. ルーター定義ファイル（`router.ts`, `routes.tsx` 等）を探す
2. ルート定義からパス・コンポーネント・ガードを抽出する

#### Rails
```bash
rails routes
```

#### 汎用的な探し方
1. Glob: `**/route*.*` `**/router*.*` `**/pages/**` `**/app/**`
2. Grep: `"path:"` `"Route"` `"router"` `"get("` `"post("` `"createBrowserRouter"`
3. ナビゲーションコンポーネントから辿る（sidebar, menu, nav 等）

### 調査結果の記録

`docs/manual/route-inventory.md` に以下のフォーマットで記録する:

```markdown
# ルート一覧（自動調査結果）

調査日: YYYY-MM-DD
調査対象: （調査したファイルを記載）

## ○○系（要認証: ロール名）
| HTTP | URL | Controller/Component | 画面種別 | 備考 |
|------|-----|---------------------|---------|------|
| GET | /path | Controller@method | 一覧 | |

## マニュアル対象外
- API専用エンドポイント（POST/PUT/DELETE で画面なし）
- 開発/デバッグ用ルート
- リダイレクト専用ルート
- webhook/callback
```

### 対象外の判定基準

- **APIのみ**（GETでない & 対応するビューがない）→ 関連画面の操作手順内で言及
- **開発/デバッグ用**（telescope, debugbar, horizon等）
- **リダイレクト専用**（`/` → `/dashboard` 等）
- **webhook/callback**（外部サービスからの受信エンドポイント）

---

## Step 3. 認証・アカウント情報の取得

**目的:** マニュアル撮影に使うテスト用アカウント情報を確保する。

### コードベースからの事前調査

ユーザーへの質問を具体的にするために、事前にコードから以下を調査:
- **ロール/権限の種類** — ミドルウェアやEnum定義から把握
- **認証フロー** — ログイン画面のController/コンポーネントから2FA等の追加ステップを把握
- **Seeder / テストデータ** — テストアカウントが定義されていれば確認

### ユーザーへの質問

以下をユーザーに確認してください:

```
マニュアル撮影用に以下を教えてください:

1. テスト環境のURL（例: https://localhost, https://staging.example.com）
2. 撮影に使うアカウント情報（ロール別に必要です）
   - ロール名 / ユーザーID / パスワード
   - 例: 管理者 admin@example.com / Pass1234
   - 例: 一般ユーザー user@example.com / Pass1234
3. ログイン時の追加手順があれば
   - 2FAの有無（テスト環境でのバイパス方法）
   - 初回ログイン時のパスワード変更の有無
   - SSO等のスコープ外にすべき認証方式
```

---

## Step 4. Phase設計

**目的:** Step 2で洗い出した画面一覧を、マニュアルの章（Phase）に分類する。

### 分類の原則

1. **ロール別に大分類** — 管理者（Admin）系 / 一般ユーザー系 / 共通（認証等）
2. **機能領域で中分類** — ルーティングの prefix/group 構造をそのまま活かす。1Phaseに10〜15画面が目安
3. **Phase 0 は認証・ログイン系に固定**
4. **最終Phase は操作フロー**（画面をまたぐ業務シナリオ）

### Phase設計の出力

ユーザーに以下のフォーマットで提示し、レビューを依頼する:

```markdown
| Phase | 対象 | 画面数 | ログインアカウント |
|-------|------|--------|-----------------|
| 0 | ログイン・認証 | 6 | （未ログイン→各アカウント） |
| 1 | Admin — ○○ | 13 | 管理者 |
| 2 | Admin — △△ | 9 | 管理者 |
| ... | ... | ... | ... |
| N | 操作フロー撮影 | - | 複数アカウント |
```

---

## Step 5. スキャフォールディング

**目的:** Step 2〜4の調査結果をもとに、マニュアル作成に必要なファイル・ディレクトリを自動生成する。

### 生成するディレクトリ構成

```
docs/manual/
├── README.md              ← 人間向け概要（Phase目次・作業手順）
├── CLAUDE.md              ← Claude Code向け作業指示（全情報集約）
├── TODO.md                ← Phase別の進捗チェックリスト
├── route-inventory.md     ← Step 2 の調査結果（すでに作成済み）
├── analysis/              ← コードベース調査メモ（Phase毎）
├── pages/                 ← マニュアル本体（Markdown）
└── screenshots/           ← スクリーンショット画像
    ├── phase0/
    ├── phase1/
    └── ...
```

### CLAUDE.md に含めるセクション

```markdown
# マニュアル作成 — Claude Code 作業指示

## 作業の進め方
1. TODO.md を確認して、未着手のPhaseを特定する
2. 対象Phaseのコードベース調査を行う → analysis/phase{N}.md に記録
3. スクリーンショット撮影を行う → screenshots/phase{N}/ に保存
4. 調査結果+スクリーンショットでマニュアルドキュメントを作成 → pages/phase{N}.md
5. TODO.md を更新して完了チェックを入れる

3つすべて（調査 + 撮影 + ドキュメント）が完了して初めてPhase完了。

## ログインアカウント
（Step 3 の調査結果を記載）

## コードベース調査（撮影前に実施）
各Phaseの撮影を開始する前に、対象画面のソースコードを調査し、
以下の観点で画面から読み取れない情報を洗い出すこと。

1. バリデーションルール（FormRequest / フロントエンド）
2. 権限・ロール別の表示差分（Policy / @can）
3. 操作の前提条件・ステータス遷移
4. 副作用・連動処理（Event / Observer / 通知）
5. 業務ロジック上の制約（計算式・自動処理）

調査結果は `analysis/phase{N}.md` に記録し、
ドキュメント作成時に「注意事項」「補足説明」として反映する。

## スクリーンショット撮影ルール
- ブラウザ解像度: 1440x900
- ファイル名: `{phase}-{番号}_{画面名}.png`
  - 例: `0-1_login.png`, `1-8_order_general.png`
- 保存先: `screenshots/phase{N}/`
- 撮影対象:
  - ページ初期表示
  - フォーム入力後（代表的な入力例）
  - モーダル表示時
  - 確認画面
  - 完了/結果画面
  - エラー表示時（代表的なバリデーションエラー）

## マニュアルドキュメント作成ルール
- 保存先: `pages/phase{N}.md`
- 文書トーン: ですます調
- 操作手順は具体的に（「クリックします」「入力します」）
- 専門用語にはカッコ書きで補足

## Phase別撮影対象一覧
（Step 4 のPhase設計結果を記載 — 全画面のURL・操作内容をテーブル形式で）
```

### TODO.md のフォーマット

```markdown
# マニュアル作成 進捗管理

## Phase 0: ログイン・認証
- [ ] コードベース調査
- [ ] スクリーンショット撮影
- [ ] ドキュメント作成

## Phase 1: ○○
- [ ] コードベース調査
- [ ] スクリーンショット撮影
- [ ] ドキュメント作成

...
```

### README.md のフォーマット

```markdown
# ○○システム 操作マニュアル

○○システムの全画面を対象としたスクリーンショット付き操作マニュアルです。

## マニュアル目次

| Phase | 内容 | ドキュメント |
|-------|------|------------|
| 0 | ログイン・認証 | [phase0.md](pages/phase0.md) |
| 1 | ... | [phase1.md](pages/phase1.md) |

進捗状況は [TODO.md](TODO.md) を参照してください。

## 作業の進め方

Claude Codeで以下のスキルを実行してください:

    /claude-plugin-browser:manual-write N

Claude Codeは CLAUDE.md の指示に従い、
コード調査→撮影→ドキュメント作成→TODO.md更新まで実行します。

## 前提条件
- アプリケーションが起動していること
- WSL2環境に日本語フォントがインストールされていること
```

### ディレクトリの作成

Phase数に応じて以下のディレクトリを作成:
- `docs/manual/analysis/`
- `docs/manual/pages/`
- `docs/manual/screenshots/phase0/`
- `docs/manual/screenshots/phase1/`
- ...（Phase数分）

---

## 完了確認

すべての Step が完了したら、ユーザーに以下を伝えてください:

```
準備フェーズが完了しました。

生成されたファイル:
- docs/manual/route-inventory.md（ルーティング調査結果）
- docs/manual/CLAUDE.md（作業指示）
- docs/manual/TODO.md（進捗管理）
- docs/manual/README.md（概要）

次のステップ:
1. CLAUDE.md と TODO.md の内容をレビューしてください
2. 問題なければ `/claude-plugin-browser:manual-write 0` で Phase 0 を開始できます
```
