#!/bin/bash
set -euo pipefail

# =============================================================================
# Claude Code 汎用スキル同期スクリプト
#
# 中央リポジトリから最新の汎用スキルを .claude/skills/ に同期する。
# プロジェクト固有のスキル（中央リポジトリに存在しないもの）は削除されない。
#
# 使い方:
#   bash sync-claude-skills.sh
# =============================================================================

SKILLS_REPO="git@github.com:AsiaQuestCoLtd/claude-code-skills.git"
SKILLS_DIR=".claude/skills"
TMP_DIR=$(mktemp -d)

trap 'rm -rf "$TMP_DIR"' EXIT

echo "汎用スキルを同期しています..."

# 中央リポジトリをクローン（最新のみ、最小限のデータ）
git clone --depth 1 --quiet "$SKILLS_REPO" "$TMP_DIR"

# skills ディレクトリがなければ作成
mkdir -p "$SKILLS_DIR"

# 中央リポジトリの各スキルをコピー（既存を上書き）
copied=0
for skill_dir in "$TMP_DIR"/.claude/skills/*/; do
    skill_name=$(basename "$skill_dir")

    # SKILL.md を持つディレクトリのみ対象
    if [ -f "$skill_dir/SKILL.md" ]; then
        mkdir -p "$SKILLS_DIR/$skill_name"
        cp "$skill_dir/SKILL.md" "$SKILLS_DIR/$skill_name/SKILL.md"
        echo "  ✓ $skill_name"
        copied=$((copied + 1))
    fi
done

echo ""
echo "完了: ${copied}件のスキルを同期しました。"
