---
name: manual-write
description: "WEBシステム操作マニュアルを Phase 番号指定で作成します。コードベース調査→スクリーンショット撮影→ドキュメント作成を行います。"
args: "<phase>"
---

# マニュアル作成: 実行フェーズ — Phase $ARGS

Phase $ARGS のマニュアル作成を実行します。
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

各画面について、関連するソースコードを調査し、以下の5観点で画面から読み取れない情報を洗い出してください。

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

4. 操作の副作用・連動処理
   - 調査箇所: Observer、Event/Listener、キューワーカー、トリガー
   - 抽出すべき情報: 通知が飛ぶタイミングと宛先、他テーブルへの連動更新、外部API呼び出し

5. 業務ロジック上の制約
   - 調査箇所: Service層、ドメインロジック、マスタデータ
   - 抽出すべき情報: 自動計算ロジック、選択肢の動的フィルタリング条件、バッチの影響

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

該当なしの観点は「特記事項なし」と記載してください。
```

### サブエージェント完了後

サブエージェントが `docs/manual/analysis/phase$ARGS.md` を書き出したら、Step B に進む。
メインコンテキストでこのファイルを読むのは Step C（ドキュメント作成）のときだけでよい。

---

## Step B. スクリーンショット撮影

### Playwright MCP操作フロー

```
1. browser_navigate        → 対象URLへ遷移
2. browser_snapshot        → DOM構造確認（操作対象のref取得）
3. browser_take_screenshot → スクリーンショット保存
4. browser_click / browser_fill_form → 操作実行
5. browser_take_screenshot → 操作後のスクリーンショット
```

### ログイン手順

1. `docs/manual/CLAUDE.md` のログインアカウント情報を参照
2. ログインURLに `browser_navigate` で遷移
3. `browser_snapshot` でフォーム要素の ref を取得
4. `browser_fill_form` でID/パスワードを入力
5. `browser_click` でログインボタンをクリック
6. 2FA等の追加手順があれば CLAUDE.md の手順に従う

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

- `browser_snapshot` でDOM構造を取得し、操作対象要素の `ref` を特定してからクリック・入力する
- フォーム入力→確認→結果のような複数ステップの画面は、各段階でスクリーンショットを撮る
- API操作（分割・承認等のPOSTリクエスト）は `browser_run_code` で実行可能
- モーダル・確認ダイアログは `browser_snapshot` で表示状態を確認してから撮影する
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
/claude-plugin-browser:manual-write <次のPhase番号>
```
