---
name: manual-cli-setup
description: "WEBシステム操作マニュアル作成の準備フェーズを実行します（CLI版）。Playwright CLIを使用し、ルーティング調査・認証確認・Phase設計・スキャフォールディングを行います。"
---

# マニュアル作成: 準備フェーズ（CLI版）

WEBシステムの操作マニュアル（スクリーンショット付きMarkdown）を半自動で生成するための準備を行います。
Playwright MCP の代わりに `@playwright/cli` を使用し、トークン消費を大幅に削減します。
以下の Step 1〜5 を順に実行してください。

---

## Step 1. 環境確認

### 1-1. Playwright CLI の確認

`@playwright/cli` が利用可能であることを確認してください。

```bash
npx @playwright/cli --version
```

コマンドが見つからない場合は、ユーザーに以下を伝えてください:

```
このスキルは @playwright/cli が必要です。
以下のコマンドでインストールしてください:

npm install -D @playwright/cli

ブラウザバイナリのインストールも必要な場合:
npx playwright install chromium
```

### 1-2. 日本語フォントの確認（WSL2環境）

WSL2環境の場合、日本語フォントが必要です。未インストールの場合はユーザーに以下を案内してください:

```bash
sudo apt install fonts-noto-cjk
```

### 1-3. アプリケーション起動確認

撮影対象のWEBアプリケーションがアクセス可能であることをユーザーに確認してください。

### 1-4. SSL証明書の確認（https の場合）

対象URLが `https://` で自己署名証明書を使っている場合、Playwright CLI がSSLエラーで接続できない。
ユーザーに確認し、必要であれば以下の設定ファイルを生成する:

```bash
mkdir -p .playwright && cat > .playwright/cli.config.json << 'EOF'
{ "ignoreHTTPSErrors": true }
EOF
```

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
├── .gitignore             ← auth-state.json を除外
├── analysis/              ← コードベース調査メモ（Phase毎）
├── pages/                 ← マニュアル本体（Markdown）
└── screenshots/           ← スクリーンショット画像
    ├── phase0/
    ├── phase1/
    └── ...
```

### .gitignore の作成

`docs/manual/.gitignore` に以下を記載する:

```
auth-state.json
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
6. UI要素セレクタ情報（フォームのname/id、ボタンテキスト、リンクテキスト）

調査結果は `analysis/phase{N}.md` に記録し、
ドキュメント作成時に「注意事項」「補足説明」として反映する。
セレクタ情報は撮影時の snapshot 呼び出し最小化に活用する。

## スクリーンショット撮影ワークフロー（Playwright CLI）

### セッション管理
- セッション名: `manual`（`-s=manual` フラグで統一）
- セッション開始（冪等）:
  ```bash
  npx @playwright/cli list 2>/dev/null | grep manual && npx @playwright/cli -s=manual close; npx @playwright/cli -s=manual open {URL} && npx @playwright/cli -s=manual resize 1440 900
  ```
- セッション終了: `npx @playwright/cli -s=manual close`

### 認証状態の永続化
- 保存: `npx @playwright/cli -s=manual state-save docs/manual/auth-state.json`
- 復元: `npx @playwright/cli -s=manual state-load docs/manual/auth-state.json`
- auth-state.json がある場合は state-load で復元し、ログイン操作をスキップ

### 撮影フロー（3パターン）

**パターン1: 表示のみ（セレクタ情報不要）**
```bash
npx @playwright/cli -s=manual goto {URL} && npx @playwright/cli -s=manual screenshot --filename=docs/manual/screenshots/phase{N}/{ファイル名}.png
```

**パターン2: フォーム操作あり（セレクタ情報あり）**
```bash
npx @playwright/cli -s=manual snapshot
```
→ ref を確認後:
```bash
npx @playwright/cli -s=manual fill 'ref=XX' 'value' && npx @playwright/cli -s=manual screenshot --filename=...
```

**パターン3: セレクタ情報なし**
各操作前に snapshot → ref取得 → 操作 → screenshot

### コマンド連結ルール
- `&&` 連結OK: `goto`+`screenshot`, `fill`+`fill`, `resize`+`goto`
- 連結NG: `snapshot` の後（出力読み取り必要）, `click` の後（遷移待ち）
- **重要**: `fill`/`click` は `snapshot` の直後に実行すること（間に他コマンドを挟むと ref が無効化される）

### フォーム送信の優先順位
操作の確実性の高い順に試す:
1. `click` コマンドで送信ボタンをクリック（推奨）
2. `press Enter` でフォーム送信
3. `eval '() => document.querySelector("button[type=submit]").click()'`
4. `eval '() => document.querySelector("form").submit()'`（最終手段。フロントエンドJSバリデーションがスキップされる）

### fill/click が失敗する場合のフォールバック
snapshot で取得した ref が `Ref not found` になる場合:
1. snapshot を再取得して最新の ref で再試行
2. それでも失敗する場合は eval で DOM 操作:
   ```bash
   npx @playwright/cli -s=manual eval '() => { document.querySelector("#field_id").value = "入力値"; }'
   ```
3. type コマンド（キーボード入力）も有効:
   ```bash
   npx @playwright/cli -s=manual click 'ref=XX' && npx @playwright/cli -s=manual type 'テキスト'
   ```

### 2FA コード入力の注意
- デバッグ用2FAコードがフラッシュデータ（1回表示で消滅）の場合がある
- コード取得→入力→送信は同一ページロード内で完結させること
- コードが消失した場合は「コード再送信」→ 即取得 → 入力 → 送信

### エラー検出とリカバリ
ブラウザ操作でエラーが発生した場合:
1. `eval '() => document.body.innerText.substring(0, 500)'` でページ内容を確認
2. HTTPエラー（4xx/5xx）やアプリケーションエラーを検出したら**自力リトライせず即停止**
3. ユーザーに選択肢を提示:
   - 「もう一度試しますか？」
   - 「作業を中断しますか？」
   - 「対処法を指示してください」

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

    /claude-plugin-browser:manual-cli-write N

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
- docs/manual/.gitignore（auth-state.json除外）

次のステップ:
1. CLAUDE.md と TODO.md の内容をレビューしてください
2. 問題なければ `/claude-plugin-browser:manual-cli-write 0` で Phase 0 を開始できます
```
