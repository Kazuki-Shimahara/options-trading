---
name: summarize-pr
description: 既存PRの全コミット差分を読み取り、構造化されたサマリーをPR本文に反映する
argument-hint: <PR番号 or PR URL>
---

# PRサマリー生成ワークフロー

既存のPR（例: develop→main のマージPR等）の全コミット差分を分析し、構造化されたサマリーを生成してPR本文を更新する。

## 前提

- 引数 `$ARGUMENTS` にPR番号またはPR URLが渡される
- PR URLの場合は末尾の番号を抽出してPR番号として使用する
- 引数がない場合はユーザーにPR番号を確認する

## 手順

### 1. PR情報の取得

```bash
gh pr view <PR番号> --json number,title,body,baseRefName,headRefName,commits,files,additions,deletions
```

以下を把握する:
- ベースブランチ（例: main）とヘッドブランチ（例: develop）
- 含まれるコミット一覧
- 変更ファイル数と追加/削除行数

### 2. 差分の詳細分析

```bash
# コミット一覧の確認
gh pr view <PR番号> --json commits --jq '.commits[] | "\(.oid[:7]) \(.messageHeadline)"'

# 差分全体の取得
gh pr diff <PR番号>
```

差分を以下の観点で分析する:
- **機能追加**: 新しい機能やエンドポイント
- **バグ修正**: 修正されたバグや不具合
- **リファクタリング**: コード構造の改善
- **設定変更**: 設定ファイルや依存関係の変更
- **テスト**: テストの追加・修正
- **ドキュメント**: ドキュメントの更新

### 3. サマリーの生成

分析結果をもとに、以下の形式でサマリーを作成する:

```markdown
## Summary

<変更全体の概要を1-3文で記述>

### Changes

#### 🚀 Features
- <機能追加の項目>

#### 🐛 Bug Fixes
- <バグ修正の項目>

#### ♻️ Refactoring
- <リファクタリングの項目>

#### 🔧 Other Changes
- <その他の変更>

### Impact
- 変更ファイル数: N files
- 追加: +N lines / 削除: -N lines

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- 該当する変更がないカテゴリは省略する
- 各項目は具体的かつ簡潔に記述する（ファイル名やコンポーネント名を含める）
- 大量のコミットがある場合は、個別コミットの羅列ではなく意味のある単位でグルーピングする

### 4. ユーザーに確認

生成したサマリーをユーザーに提示し、内容を確認してもらう。修正の要望があれば反映する。

### 5. PR本文の更新

ユーザーの承認後、`gh pr edit` でPR本文を更新する:

```bash
gh pr edit <PR番号> --body "$(cat <<'EOF'
<生成したサマリー>
EOF
)"
```

### 6. 完了報告

PR URLをユーザーに表示する。
