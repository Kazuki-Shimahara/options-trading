---
name: manual-cli-write
description: "WEBシステム操作マニュアルを Phase 番号指定で作成します（CLI版）。Playwright CLIを使用し、コードベース調査→スクリーンショット撮影→ドキュメント作成を行います。"
args: "<phase>"
---

# マニュアル作成: 実行フェーズ（CLI版） — Phase $ARGS

Phase $ARGS のマニュアル作成を実行します。
Playwright MCP の代わりに `@playwright/cli` を使用し、トークン消費を大幅に削減します。
以下の Step A〜C を順に実行してください。

**実行前の確認:**
1. `docs/manual/CLAUDE.md` を読み、Phase $ARGS の撮影対象一覧を確認する
2. `docs/manual/TODO.md` を読み、Phase $ARGS が未着手であることを確認する
3. 対象アプリケーションが起動していることをユーザーに確認する

---

## Step A. コードベース調査（サブエージェントで実行）

**撮影の前に**、Phase $ARGS の画面に関連するソースコードを調査し、画面だけでは読み取れない情報を洗い出す。

**重要: この Step は Agent ツール（`subagent_type: "general-purpose"`）で実行すること。**
コードベース調査は大量のファイルを読むためコンテキストを消費する。サブエージェントに委譲することで、メインコンテキストを撮影・ドキュメント作成のために温存する。

### サブエージェントへの指示

Agent ツールを以下のように呼び出す:

- `subagent_type`: `"general-purpose"`
- `description`: `"Phase $ARGS codebase analysis"`
- `prompt`: 以下の内容を含める

```
docs/manual/CLAUDE.md を読み、Phase $ARGS の撮影対象画面を確認してください。

各画面について、関連するソースコードを調査し、以下の6観点で画面から読み取れない情報を洗い出してください。

【調査観点】

1. バリデーションルール
   - 調査箇所: FormRequest、Controllerのバリデーション、フロントエンドのバリデーション
   - 抽出すべき情報: 必須項目（隠れ必須含む）、入力制約（文字数上限、数値範囲、日付範囲、正規表現）、項目間の依存バリデーション、ユニーク制約

2. 権限・ロールによる表示差分
   - 調査箇所: ミドルウェア、テンプレートの権限分岐（@can / v-if="hasRole" 等）、Policyクラス
   - 抽出すべき情報: ロール別に見えるメニュー・ボタン・機能の差分、操作可能な条件

3. 状態遷移と操作の前提条件
   - 調査箇所: Enumやステータス定義、Controllerの事前条件チェック
   - 抽出すべき情報: ステータス遷移図、各操作の前提条件、不可逆な操作
   - 特に重要: この画面にアクセスするために必要な状態（未ログイン、初回ログイン、パスワードリセット中、特定ステータス等）と、通常の撮影アカウントでアクセス可能かどうか

4. 操作の副作用・連動処理
   - 調査箇所: Observer、Event/Listener、キューワーカー、トリガー
   - 抽出すべき情報: 通知が飛ぶタイミングと宛先、他テーブルへの連動更新、外部API呼び出し

5. 業務ロジック上の制約
   - 調査箇所: Service層、ドメインロジック、マスタデータ
   - 抽出すべき情報: 自動計算ロジック、選択肢の動的フィルタリング条件、バッチの影響

6. UI要素セレクタ情報
   - 調査箇所: Bladeテンプレート / Vue/Reactコンポーネント / HTML
   - 抽出すべき情報:
     - フォーム入力フィールドの name, id, placeholder
     - ボタンのテキスト（送信、保存、削除 等）
     - リンクのテキスト・href
     - モーダルのトリガー要素
     - ドロップダウンの name・選択肢
   - 目的: snapshot呼び出し最小化のためのrefヒント

【出力】

調査結果を docs/manual/analysis/phase{N}.md に以下のフォーマットで書き出してください:

# Phase N コードベース調査メモ

## 画面: N-X. 画面名

### バリデーション
- （調査結果）

### 権限差分
- （調査結果）

### 前提条件
- （調査結果）

### 副作用
- （調査結果）

### 業務ロジック
- （調査結果）

### UIセレクタ情報
- フォーム: name="xxx", id="xxx"
- ボタン: "送信", "保存"
- リンク: "一覧に戻る" href="/xxx"

### アクセス前提条件
- この画面にアクセスするために必要な状態（未ログイン、初回ログイン、特定ステータス等）
- 現在の撮影アカウントでアクセス可能か（不可の場合はその理由）

該当なしの観点は「特記事項なし」と記載してください。
```

### サブエージェント完了後

サブエージェントが `docs/manual/analysis/phase$ARGS.md` を書き出したら、**Step B に進む前に**そのファイルの「アクセス前提条件」セクションを確認する。

現在の撮影アカウントではアクセスできない画面がある場合、Step B の開始前にユーザーに報告する:
- 「この画面は XX の状態でしかアクセスできません。専用のテストアカウントを用意しますか？」
- 「スクリーンショットなしでコード情報からマニュアルを作成しますか？」
- 「この画面をスキップしますか？」

ユーザーの回答を得てから Step B に進む。
メインコンテキストで analysis ファイル全体を読むのは Step C（ドキュメント作成）のときだけでよい。

---

## Step B. スクリーンショット撮影（Playwright CLI）

### B-1. セッション開始（冪等）

既存セッションがあれば閉じてから開始する:

```bash
npx @playwright/cli list 2>/dev/null | grep manual && npx @playwright/cli -s=manual close; npx @playwright/cli -s=manual open {対象アプリURL} && npx @playwright/cli -s=manual resize 1440 900
```

**SSL証明書エラーが発生した場合:**
自己署名証明書で `ERR_CERT_AUTHORITY_INVALID` が出る場合は設定ファイルを作成して再起動:
```bash
mkdir -p .playwright && echo '{ "ignoreHTTPSErrors": true }' > .playwright/cli.config.json
npx @playwright/cli -s=manual close; npx @playwright/cli -s=manual open {URL} && npx @playwright/cli -s=manual resize 1440 900
```

### B-2. ログイン（auth-state.json がない場合）

1. ログインURLへ遷移:
   ```bash
   npx @playwright/cli -s=manual goto {ログインURL}
   ```
2. snapshot で ref を取得（初回は必須）:
   ```bash
   npx @playwright/cli -s=manual snapshot
   ```
3. 認証情報を入力:
   ```bash
   npx @playwright/cli -s=manual fill 'ref=XX' '{ユーザーID}' && npx @playwright/cli -s=manual fill 'ref=YY' '{パスワード}'
   ```
4. ログインボタンをクリック:
   ```bash
   npx @playwright/cli -s=manual click 'ref=ZZ'
   ```
5. 認証状態を保存:
   ```bash
   npx @playwright/cli -s=manual state-save docs/manual/auth-state.json
   ```

### B-3. 認証復元（auth-state.json がある場合）

```bash
npx @playwright/cli -s=manual state-load docs/manual/auth-state.json
```

### B-4. 画面撮影ループ — 3段階の効率化

`docs/manual/CLAUDE.md` のPhase別撮影対象一覧と、`docs/manual/analysis/phase$ARGS.md` のUIセレクタ情報を参照して効率的に撮影する。

| パターン | snapshot | 操作 | Bash回数 |
|---------|----------|------|---------|
| 表示のみ | 不要 | `goto` + `screenshot` | 1回 |
| セレクタ情報あり | 1回（ref照合用） | `fill`/`click` + `screenshot` | 2〜3回 |
| セレクタ情報なし | 操作毎 | snapshot → 操作 → screenshot | 3〜4回 |

**パターン1: 表示のみ（操作不要な画面）**
```bash
npx @playwright/cli -s=manual goto {URL} && npx @playwright/cli -s=manual screenshot --filename=docs/manual/screenshots/phase$ARGS/{ファイル名}.png
```

**パターン2: セレクタ情報がある場合（snapshot最小化）**
```bash
npx @playwright/cli -s=manual snapshot
```
→ ref を確認・セレクタ情報と照合後:
```bash
npx @playwright/cli -s=manual fill 'ref=XX' '{入力値}' && npx @playwright/cli -s=manual fill 'ref=YY' '{入力値}'
```
```bash
npx @playwright/cli -s=manual screenshot --filename=docs/manual/screenshots/phase$ARGS/{ファイル名}.png
```

**パターン3: セレクタ情報なし（都度snapshot）**
各操作前に `snapshot` → ref取得 → 操作 → `screenshot`

### B-5. コマンド連結ルール

- **`&&` で連結OK:** `goto`+`screenshot`, `fill`+`fill`, `resize`+`goto`
- **連結NG:** `snapshot` の後（出力読み取りが必要）, `click` の後（画面遷移の待ちが必要）
- **重要**: `fill`/`click` は `snapshot` の直後に実行すること（間に他コマンドを挟むと ref が無効化される）

### B-5.5. fill/click が失敗する場合のフォールバック

snapshot で取得した ref が `Ref not found` になる場合:
1. snapshot を再取得して最新の ref で再試行
2. それでも失敗する場合は eval で DOM 操作:
   ```bash
   npx @playwright/cli -s=manual eval '() => { document.querySelector("#field_id").value = "入力値"; }'
   ```
3. type コマンド（キーボード入力）も有効（2FA の OTP 入力等）:
   ```bash
   npx @playwright/cli -s=manual click 'ref=XX' && npx @playwright/cli -s=manual type 'テキスト'
   ```

### B-5.6. フォーム送信の優先順位

操作の確実性の高い順に試す:
1. `click` コマンドで送信ボタンをクリック（推奨）
2. `press Enter` でフォーム送信
3. `eval '() => document.querySelector("button[type=submit]").click()'`
4. `eval '() => document.querySelector("form").submit()'`（最終手段。フロントエンドJSバリデーションがスキップされるため空データエラーになる場合がある）

### B-5.7. 2FA コード入力の注意

- デバッグ用2FAコードがフラッシュデータ（1回表示で消滅）の場合がある
- コード取得→入力→送信は**同一ページロード内**で完結させること（リロードするとコード消失）
- コードが消失した場合は「コード再送信」→ 即取得 → 入力 → 送信

### B-5.8. エラー検出とリカバリ

ブラウザ操作でエラーが発生した場合（ページが表示されない、予期しない画面等）:

1. ページ内容を確認:
   ```bash
   npx @playwright/cli -s=manual eval '() => document.body.innerText.substring(0, 500)'
   ```
2. HTTPエラー（4xx/5xx）やサーバーエラー（500, メモリ不足等）を検出したら**自力リトライせず即停止**
3. ユーザーに選択肢を提示:
   - 「もう一度試しますか？」
   - 「作業を中断しますか？」
   - 「対処法を指示してください（自由入力）」

**自力でリトライ・ワークアラウンドを試みないこと。** コンテキストとトークンを無駄に消費する。

### B-6. セッション終了

```bash
npx @playwright/cli -s=manual close
```

### 撮影ルール

- **ブラウザ解像度:** 1440x900
- **ファイル名:** `{phase}-{番号}_{画面名}.png`
  - 例: `0-1_login.png`, `1-8_order_general.png`
- **保存先:** `docs/manual/screenshots/phase$ARGS/`

### 撮影対象（各画面について）

- ページ初期表示
- フォーム入力後（代表的な入力例）
- モーダル表示時
- 確認画面
- 完了/結果画面
- エラー表示時（代表的なバリデーションエラー）

### 注意事項

- Step A の UIセレクタ情報を活用し、snapshot の呼び出しを最小限に抑える
- フォーム入力→確認→結果のような複数ステップの画面は、各段階でスクリーンショットを撮る
- CSV/ファイルダウンロードはブラウザ操作では直接扱えないため、操作手順内で言及するに留める

---

## Step C. ドキュメント作成

Step A（コード調査）と Step B（スクリーンショット）の結果を統合してMarkdownマニュアルを作成する。

### 保存先

`docs/manual/pages/phase$ARGS.md`

### テンプレート

```markdown
# Phase $ARGS: 章タイトル

概要説明（1〜2行）

---

## $ARGS-X. 画面名

**URL:** `/path/to/page`

![画面名](../screenshots/phase$ARGS/ファイル名.png)

### 画面説明
（この画面が何をするものか）

### 操作手順
1. ...
2. ...

### 入力項目
| 項目 | 必須 | 説明 |
|------|------|------|

### 注意事項
- ...

### 補足: 入力制約・ロジック
（コードベース調査で判明した、画面からは読み取りにくい情報）
- バリデーション: ...
- 権限による差分: ...
- 操作の前提条件: ...
- この操作による副作用: ...
```

### 文書トーン

- ですます調
- 操作手順は具体的に（「クリックします」「入力します」）
- 専門用語にはカッコ書きで補足

---

## 完了処理

Step A〜C がすべて完了したら:

1. `docs/manual/TODO.md` の Phase $ARGS のチェックボックスをすべて `[x]` に更新する
2. ユーザーに以下を報告する:

```
Phase $ARGS が完了しました。

作成・更新されたファイル:
- docs/manual/analysis/phase$ARGS.md（コードベース調査結果）
- docs/manual/screenshots/phase$ARGS/（スクリーンショット）
- docs/manual/pages/phase$ARGS.md（マニュアルドキュメント）
- docs/manual/TODO.md（進捗更新）

次のPhaseを実行するには:
/claude-plugin-browser:manual-cli-write <次のPhase番号>
```
