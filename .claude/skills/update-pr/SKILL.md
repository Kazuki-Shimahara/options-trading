---
name: update-pr
description: 変更されたファイルをコミットし、既存PRのブランチにプッシュする
argument-hint: [commit-message]
disable-model-invocation: true
allowed-tools: Bash(git *), Bash(gh *)
---

# PR更新ワークフロー

現在の作業ディレクトリの変更内容を確認し、既存PRのブランチにコミット＆プッシュする。

## 対象ファイルの特定（最重要）

`git diff` と `git status` を使って変更ファイルを特定する。

```bash
# 変更されたファイル（ステージ済み + 未ステージ）
git diff HEAD --name-only
# 新規作成された未追跡ファイル
git status --porcelain
```

- 上記のコマンド結果から変更ファイルの一覧をユーザーに提示し、コミットに含めるファイルの確認を取る
- `.env`、credentials等の機密ファイルが含まれていないか確認する
- ユーザーが除外を指示したファイルはステージングしない

## 手順

以下の手順を順番に実行すること。各ステップでエラーが発生した場合は停止してユーザーに報告する。

### 1. 対象ファイルの確認

`git diff` と `git status` で変更ファイルを一覧表示し、ユーザーに確認を取る。

### 2. 現在のブランチを確認

```bash
git branch --show-current
```

既にPRのブランチ上にいることを確認する。デフォルトブランチ（main/master）上にいる場合はエラーとしてユーザーに報告し、正しいブランチへのチェックアウトを促す。

### 3. コミットメッセージの決定

- 引数でメッセージが指定されている場合: `$ARGUMENTS` を使用する
- 引数がない場合: 変更内容から適切なコミットメッセージを生成する

コミットメッセージの形式:

```
fix: レビュー指摘対応の簡潔な説明

具体的な修正内容の説明。

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### 4. ステージング＆コミット

- 対象ファイルだけを `git add <file1> <file2> ...` で個別にステージングする
- **`git add .` や `git add -A` は絶対に使わない**
- `.env`、credentials等の機密ファイルをコミットしないよう注意する

### 5. プッシュ

```bash
git push origin <current-branch>
```

プッシュが rejected された場合は `git pull --rebase` してから再プッシュする。

### 6. 完了報告

プッシュ結果をユーザーに表示する:

```
## PR更新完了

- ブランチ: <branch-name>
- コミット: <commit-hash> <commit-message>
- プッシュ: 完了
```
