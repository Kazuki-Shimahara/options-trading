---
name: multi-implement-issues
description: 複数のGitHub Issueをgit worktree + Agent Teamで並列にTDD実装し、それぞれPRまで作成する
argument-hint: <Issue番号1> <Issue番号2> [Issue番号3] ...
---

# 複数Issue並列実装ワークフロー

複数のGitHub Issueを受け取り、git worktreeで独立した作業ディレクトリを用意し、Agent Teamで並列にTDD実装・PR作成まで行う。

## 前提

- 引数 `$ARGUMENTS` にスペース区切りでIssue番号が渡される
- 引数がない場合はユーザーにIssue番号を確認する
- 各Issueは独立したworktreeで実装するため、Issue間の依存関係がない前提で進める

## 手順

### 1. Issue情報の一括取得

`$ARGUMENTS` をスペースで分割してIssue番号リストを取得する。

各Issueについて以下を実行:

```bash
gh issue view <Issue番号> --json title,body,number,labels,comments
```

取得した情報から以下を整理する:
- **Issue番号**: `#<番号>`
- **タイトル**: Issueのタイトル
- **ブランチ名**: タイトルからケバブケース（小文字+ハイフン区切り）のブランチ名を生成
  - 日本語タイトルの場合は英語に意訳してからケバブケース化する
  - `feature/`, `fix/`, `chore/` 等のプレフィックスを付ける
  - 例: `fix/issue-123-correct-validation-logic`

### 2. ユーザー確認

Issue一覧をテーブル形式でユーザーに提示する:

```
| # | Issue | タイトル | ブランチ名 |
|---|-------|---------|-----------|
| 1 | #123  | XXXの修正 | fix/issue-123-fix-xxx |
| 2 | #456  | YYY機能追加 | feature/issue-456-add-yyy |

上記N件のIssueを並列実装します。除外したい項目やブランチ名の変更があれば教えてください。
```

ユーザーが除外や変更を指示した場合は反映する。

### 3. git worktreeの準備

#### 3a. デフォルトブランチの最新取得

```bash
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name')
git fetch origin $DEFAULT_BRANCH
```

#### 3b. worktreeディレクトリの準備

```bash
mkdir -p .worktrees
```

`.gitignore` に `.worktrees/` が未登録なら追加する。

#### 3c. 各Issueのworktree作成

各Issueについて:

```bash
git worktree add .worktrees/issue-<番号> -b <ブランチ名> origin/<default-branch>
```

### 4. Agent Teamによる並列実装

#### 4a. チーム作成

TeamCreate でチームを作成する。

#### 4b. タスク作成

各Issueに対して TaskCreate でタスクを作成する。

- **subject**: `Issue #<番号>: <タイトル>` 形式
- **activeForm**: `Implementing Issue #<番号>` 形式（進行中スピナー表示用）
- **description** には以下を全て含める:
  - Issue番号、タイトル、本文（body）、コメント（comments）の全内容
  - worktreeの **絶対パス**
  - ブランチ名
  - 実装手順（後述の「エージェント指示内容」を参照）

#### 4c. エージェント起動

Task ツールで `general-purpose` エージェントを起動する。**最大4-5件ずつ** バッチで起動する。

各エージェントの起動時には以下のパラメータを指定する:
- **subagent_type**: `general-purpose`
- **team_name**: 作成したチーム名
- **name**: `issue-<番号>` 形式（SendMessage の recipient で使用するため必須）
- **mode**: `bypassPermissions`（自律的に動作させるため）

#### エージェント指示内容

各エージェントに以下の指示を与える:

```
あなたは Issue #<番号> の実装担当です。

## 作業ディレクトリ
**全てのファイル操作は以下の絶対パスで行ってください:**
<WORKTREE_ABSOLUTE_PATH>

**Bash コマンドは必ず `cd <WORKTREE_ABSOLUTE_PATH> && ...` で実行してください。**

## Issue情報
- タイトル: <タイトル>
- 本文:
<Issue本文>

- コメント:
<Issueコメント>

## 実装手順（TDD）

### Step 0: タスクのステータス更新
TaskList で自分に割り当てられたタスクIDを確認し、TaskUpdate で `status: "in_progress"` に更新する。

### Step 1: プロジェクト規約の確認
worktree内の CLAUDE.md を読んで、プロジェクトの規約・テストコマンド・フォーマッターを確認する。

### Step 2: 対象コードの確認
Issueの「対象ファイル」に記載されたファイルを全て読み込み、現状のコードを理解する。

### Step 3: RED - 失敗するテストを先に書く
Issueの修正方針・テスト観点に基づいてテストを作成し、実行して **失敗する** ことを確認する。

### Step 4: GREEN - テストが通るようにコードを修正する
Issueの修正方針に従い最小限の修正を施し、テストが **成功する** ことを確認する。

### Step 5: REFACTOR（必要な場合のみ）
テストがGREENの状態を維持しながら軽微なリファクタリングを行う。

### Step 6: フォーマッター実行
CLAUDE.md に記載されたフォーマッター/リンターを修正ファイルに対して実行する。

### Step 7: 最終テスト
関連テスト全体を実行し、既存テストが壊れていないことを確認する。

### Step 8: コミット & プッシュ
- 変更したファイルを個別に `git add <file1> <file2> ...` でステージング（`git add .` は使わない）
- 適切なコミットメッセージでコミット
- `cd <WORKTREE_ABSOLUTE_PATH> && git push -u origin <ブランチ名>`

### Step 9: PR作成
`gh pr create` でPRを作成する:
- ベースブランチ: <default-branch>
- タイトル: 変更内容を簡潔に要約（70文字以内）
- 本文:
  ```
  ## Related Issue
  Closes #<Issue番号>

  ## Summary
  <変更内容の要約を1-3行で>

  ## Test plan
  <テストの実行方法や確認手順>

  ## Notes
  <補足事項>

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  ```

### Step 10: 結果報告
TaskGet で自分のタスクIDを確認し、TaskUpdate で `status: "in_progress"` → `status: "completed"` に更新する。
チームリードに SendMessage で以下を報告:
- 作成/修正したファイル一覧
- テスト結果
- PR URL
- 問題があった場合はその内容
```

### 5. 進捗監視・結果収集

- TaskList で定期的に全タスクの進捗を確認する
- 1件が失敗しても他のタスクは継続させる
- 全タスクが completed になるまで待つ

### 6. worktreeクリーンアップ

全タスク完了後、各worktreeを削除する:

```bash
git worktree remove --force .worktrees/issue-<番号>
```

全worktree削除後:

```bash
rm -rf .worktrees
```

### 7. チーム解散

各エージェントに SendMessage（type: shutdown_request）を送信し、全員のシャットダウンを確認後、TeamDelete でチームを削除する。

### 8. サマリー報告

全件の結果をユーザーに報告する:

```
## 並列実装サマリー

合計 N 件の Issue を実装しました。

| # | Issue | タイトル | ブランチ | PR | ステータス |
|---|-------|---------|---------|-----|-----------|
| 1 | #123  | XXXの修正 | fix/issue-123-fix-xxx | #201 | 成功 |
| 2 | #456  | YYY機能追加 | feature/issue-456-add-yyy | - | 失敗 |

### 失敗したIssue
- #456: [失敗理由の説明]

### 推奨レビュー・マージ順序

PR間の変更ファイル重複を `gh pr view <PR番号> --json files --jq '.files[].path'` で確認し、依存関係を分析した上で推奨順序を提示する:

- **基盤・共通変更** を含むPRを最優先（他のPRが依存する可能性が高い）
- **影響範囲が広い** PRを先にマージ（コンフリクト発生時の解消が容易）
- **独立性が高い・変更が小さい** PRは後回しでOK
- ファイル重複がある場合はコンフリクトリスクを明示する

例:
```
1. PR #91 (Issue #62) — 基盤変更のため最優先
2. PR #89 (Issue #60) — 独立した変更、順不同
3. PR #90 (Issue #61) — 独立した変更、順不同
```

レビューには `/code-review <PR番号>` を使用できます。

### 次のステップ
作成されたPRをレビューしてください。レビューコメントへの対応は `/implement-pr-comments <PR番号>` で行えます。
```
