---
name: multi-code-review
description: 複数のPRをAgent Teamで並列にコードレビューし、インラインコメント付きのGitHubレビューを投稿する
argument-hint: <PR番号1> <PR番号2> [PR番号3] ... [--self-review]
---

# 複数PR並列コードレビューワークフロー

複数のPR番号を受け取り、Agent Teamで並列にコードレビューを実施し、各PRにインラインコメント付きのGitHubレビューを投稿する。

## 前提

- 引数 `$ARGUMENTS` にスペース区切りでPR番号が渡される
- PR URLの場合は末尾の番号を抽出してPR番号として使用する
- 引数がない場合はユーザーにPR番号を確認する
- `--self-review` フラグが含まれている場合、全PRに対してセルフレビューモードを有効にする
  - `$ARGUMENTS` から `--self-review` を除去した残りをPR番号リストとして扱う

## 手順

### 1. PR情報の一括取得

`$ARGUMENTS` から `--self-review` フラグを分離し、PR番号リストを取得する。

各PRについて以下を実行:

```bash
gh pr view <PR番号> --json title,headRefName,baseRefName,author,number,additions,deletions,changedFiles
```

取得した情報から以下を整理する:
- **PR番号**: `#<番号>`
- **タイトル**: PRのタイトル
- **変更規模**: additions + deletions, changedFiles

### 2. ユーザー確認

PR一覧をテーブル形式でユーザーに提示する:

```
| # | PR | タイトル | 変更規模 |
|---|-----|---------|---------|
| 1 | #89 | SKIP_AUTH本番化防止 | +30 -5, 2 files |
| 2 | #90 | deleteTrade認証チェック追加 | +50 -10, 3 files |

上記N件のPRを並列レビューします。除外したい項目があれば教えてください。
```

ユーザーが除外を指示した場合は反映する。

### 3. Agent Teamによる並列レビュー

#### 3a. チーム作成

TeamCreate でチームを作成する（チーム名: `multi-review` 等）。

#### 3b. タスク作成

各PRに対して TaskCreate でタスクを作成する。

- **subject**: `Review PR #<番号>: <タイトル>` 形式
- **activeForm**: `Reviewing PR #<番号>` 形式

#### 3c. エージェント起動

Agent ツールで `general-purpose` エージェントを起動する。**最大4-5件ずつ** バッチで起動する。

各エージェントの起動時には以下のパラメータを指定する:
- **subagent_type**: `general-purpose`
- **team_name**: 作成したチーム名
- **name**: `review-<PR番号>` 形式
- **mode**: `bypassPermissions`

#### エージェント指示内容

各エージェントに以下の指示を与える（`/code-review` の全手順を含める）:

```
あなたは PR #<PR番号> のコードレビュー担当です。

## レビュー対象
- PR番号: <PR番号>
- セルフレビュー: <有効/無効>

## レビュー手順

### Step 0: タスクのステータス更新
TaskList で自分に割り当てられたタスクIDを確認し、TaskUpdate で `status: "in_progress"` に更新する。

### Step 1: PR情報の取得

```bash
gh pr view <PR番号> --json title,body,headRefName,baseRefName,author,number
```

owner/repo は `gh repo view --json nameWithOwner` で取得する。

### Step 2: 関連Issueの確認

- PR本文から `Closes #123` / `Fixes #123` / `Related Issue` パターンを抽出する
- 見つかれば `gh issue view <Issue番号> --json title,body,comments` で要件を把握する
- Issue要件は後続のレビューで「要件を満たしているか」の観点として追加する

### Step 3: プロジェクト規約の確認

以下のファイルが存在すれば読み込む:
- **CLAUDE.md**: コーディングスタイル・テスト規約
- **README.md**: プロジェクト概要

### Step 4: 差分の取得と解析

```bash
gh pr diff <PR番号>
gh api repos/{owner}/{repo}/pulls/{PR番号}/files
```

- unified diff と変更ファイル一覧を取得する
- 各ハンクの行番号範囲を `@@ -a,b +c,d @@` から抽出する

**スキップ対象:**
- ロックファイル（`package-lock.json`, `yarn.lock` 等）
- 自動生成ファイル
- バイナリファイル

### Step 5: 変更ファイルの深堀り調査

各変更ファイルについて:
- **本体**: Read ツールで全体を読み、変更箇所の前後コンテキストを把握する
- **依存先**: インポート先のモジュール・型定義を読む
- **テスト**: 対応するテストファイルを Glob で探して読む
- **大規模PR対策**: 10ファイル超の場合はビジネスロジック → 変更行数多い順で優先

### Step 6: 多角的レビュー（6観点）

| 観点 | チェック内容 |
|------|-------------|
| 正確性 | ロジックエラー、エッジケース、null/undefined、型不整合 |
| セキュリティ | injection、XSS、認証/認可漏れ、シークレット漏洩 |
| パフォーマンス | N+1クエリ、不要ループ、メモリリーク |
| テスト | テスト有無、エッジケーステスト、テスト品質 |
| 規約準拠 | CLAUDE.md / README.md 規約との整合性 |
| 設計 | 関心の分離、DRY、適切な抽象化 |

### Step 7: セルフレビュー（--self-review 指定時のみ）

セルフレビューが無効な場合はスキップ。

有効な場合:
- 各指摘の参照行を再読み込みし、実際のコードと一致するか確認
- 偽陽性チェック（上流バリデーション、フレームワーク処理済み等）
- 行番号がdiffハンク範囲内か検証
- 重大度の再評価・重複統合

### Step 8: 指摘整理 & GitHubレビュー投稿

#### 重大度分類
- 🚨 **must-fix**: バグ、セキュリティ、データ損失リスク
- 💡 **suggestion**: 改善推奨だが動作問題なし
- 🔍 **nit**: 軽微なスタイル指摘（最大3件まで）

#### ノイズ低減ルール
- フォーマッターで直せるスタイル指摘はしない
- 同一パターンは最初の1箇所のみインライン
- 明らかに意図的な設計判断への代替案提示は控える

#### イベントタイプ決定
- `REQUEST_CHANGES`: must-fix が1件以上
- `APPROVE`: must-fix 0件、suggestion 0-1件
- `COMMENT`: must-fix 0件だが suggestion 複数

#### GitHub API レビュー投稿

コメント数が多い場合はJSONファイルに書き出して `--input` で渡す:

```bash
gh api repos/{owner}/{repo}/pulls/{PR番号}/reviews --method POST --input review.json
```

インラインコメントの形式:
```
🚨 **正確性**

`user` が null の場合に NullPointerException が発生する可能性があります。
```

#### サマリー本文の形式

```markdown
## コードレビュー

### 概要
[変更内容の要約と全体評価を1-2文で]

### 変更ファイル
| ファイル | 変更概要 |
|---------|---------|
| `path/to/file` | [変更の詳細] |

### Confidence Score: N/5

[スコアの根拠]

**スコア基準:**
- **5/5**: 問題なし。自信を持ってAPPROVE
- **4/5**: 軽微な懸念はあるが実運用リスクは低い
- **3/5**: 動作はするが改善すべき点が複数ある
- **2/5**: 潜在的なバグやセキュリティリスクあり
- **1/5**: 重大な問題があり、大幅な修正が必要

**主な減点要因:** ビジネスロジック・API・DB操作の変更にテストが伴わない場合は最低でも1点減点

### 指摘サマリー
- 🚨 Must-fix: N件
- 💡 Suggestion: N件
- 🔍 Nit: N件

### 良い点
- [PRで良いと思った点]

[関連Issueがある場合]
### Issue要件との整合性
- [要件充足度の評価]

---
🤖 このレビューは Claude Code (`/code-review`) によって生成されました
```

`--self-review` 時はフッターを以下に変更:
```
🤖 このレビューは Claude Code (`/code-review --self-review`) によって生成されました（セルフレビュー済み）
```

#### エラー時の対応
- 422エラー時は問題のコメントを除外しサマリーに移動して再試行

### Step 9: 結果報告
TaskUpdate で自分のタスクを `status: "completed"` に更新する。
チームリードに SendMessage で以下を報告:
- PR番号・タイトル
- イベントタイプ（APPROVE / COMMENT / REQUEST_CHANGES）
- Confidence Score
- 指摘件数（must-fix / suggestion / nit）
- 問題があった場合はその内容
```

### 4. 進捗監視・結果収集

- TaskList で定期的に全タスクの進捗を確認する
- 1件が失敗しても他のタスクは継続させる
- 全タスクが completed になるまで待つ

### 5. チーム解散

各エージェントに SendMessage（type: shutdown_request）を送信し、全員のシャットダウンを確認後、TeamDelete でチームを削除する。

### 6. サマリー報告

全件の結果をユーザーに報告する:

```
## 並列レビューサマリー

合計 N 件の PR をレビューしました。

| # | PR | タイトル | 判定 | Score | 🚨 | 💡 | 🔍 |
|---|----|---------|------|-------|----|----|-----|
| 1 | #89 | SKIP_AUTH本番化防止 | APPROVE | 5/5 | 0 | 0 | 1 |
| 2 | #90 | deleteTrade認証チェック | COMMENT | 4/5 | 0 | 2 | 0 |

### 要対応PR
- #90: suggestion 2件あり（詳細はGitHub上のレビューコメントを参照）

### 次のステップ
レビューコメントへの対応は `/implement-pr-comments <PR番号>` で行えます。
```
