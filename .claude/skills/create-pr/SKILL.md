---
name: create-pr
description: 作業ブランチの変更をレビューし、新しいブランチにコミットしてPRを作成する
argument-hint: [--base <branch>] [branch-name]
disable-model-invocation: true
allowed-tools: Bash(git *), Bash(gh *)
---

# ブランチ作成 & PR作成ワークフロー

現在の作業ディレクトリの変更内容を確認し、新しいブランチにコミットしてPRを作成する。

## 引数

- `$ARGUMENTS` にブランチ名やオプションが渡される
- `--base <branch>`: PRのベースブランチを指定（デフォルト: リポジトリのデフォルトブランチ）
- ブランチ名: 新しいブランチの名前（省略時は変更内容から自動生成）

例:
- `/create-pr` — デフォルトブランチへのPR
- `/create-pr feature/add-auth` — ブランチ名指定
- `/create-pr --base develop` — developへのPR
- `/create-pr --base develop feature/add-auth` — 両方指定

## 対象ファイルの特定（最重要）

`git diff` と `git status` を使って変更ファイルを特定する。

```bash
# 変更されたファイル（ステージ済み + 未ステージ）
git diff HEAD --name-only
# 新規作成された未追跡ファイル
git status --porcelain
```

- 上記のコマンド結果から変更ファイルの一覧をユーザーに提示し、PRに含めるファイルの確認を取る
- `.env`、credentials等の機密ファイルが含まれていないか確認する
- ユーザーが除外を指示したファイルはステージングしない

## 手順

以下の手順を順番に実行すること。各ステップでエラーが発生した場合は停止してユーザーに報告する。

### 1. 対象ファイルの確認

`git diff` と `git status` で変更ファイルを一覧表示し、ユーザーに確認を取る。

### 2. ブランチ名の決定

- 引数でブランチ名が指定されている場合: そのまま使用する
- 引数がない場合: 変更内容から適切なブランチ名を生成する（例: `fix/issue-123`, `feature/add-xxx`）
- ブランチ名はケバブケース（小文字+ハイフン区切り）で、`feature/`, `fix/`, `chore/`, `refactor/` 等のプレフィックスを付ける

### 3. ベースブランチの決定と最新取得

```bash
# --base が指定されている場合はそのブランチ、なければデフォルトブランチ
gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'
git fetch origin <base-branch>
```

### 4. 新しいブランチを作成

ベースブランチから分岐して新しいブランチを作成する:

```bash
git checkout -b <branch-name> origin/<base-branch>
```

**重要:** 必ずリモートのベースブランチから分岐すること。

### 5. 対象ファイルのみをステージング＆コミット

- ステップ1で確認した対象ファイルだけを `git add <file1> <file2> ...` で個別にステージングする
- **`git add .` や `git add -A` は絶対に使わない**
- 適切なコミットメッセージで1つまたは複数のコミットを作成する

### 6. リモートにプッシュ

```bash
git push -u origin <branch-name>
```

### 7. PRを作成

`gh pr create` でPRを作成する。PRの内容:

- **タイトル:** 変更内容を簡潔に要約（70文字以内）
- **ベースブランチ:** `--base` で指定されたブランチ、またはリポジトリのデフォルトブランチ
- **本文:** 以下の形式で記述する（該当しないセクションは省略してよい）

```
## Related Issue
Closes #<Issue番号>

## Summary
<変更内容の要約を1-3行で>

## Test plan
<テストの実行方法や確認手順>

## Notes
<補足事項、制約、既知の問題、レビュー時の注意点など>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- **Related Issue:** `/implement-issue` 経由で作業した場合は必ず `Closes #番号` を記載してIssueを自動クローズする。関連Issueがない場合はセクションごと省略する
- **Notes:** レビュアーへの補足（設計判断の理由、影響範囲、今後の課題など）があれば記載する。なければ省略する

### 8. 完了報告

PR URLをユーザーに表示する。
