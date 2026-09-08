#!/usr/bin/env bash
#
# Answers "does this release owe a migration?" without guessing.
#
# DEVELOPMENT ONLY — excluded from the npm tarball (see `files` in package.json).
#
# The question keeps coming back in audits, and it keeps being answered from
# memory. It is decidable: a Payload schema is shaped by field `name`, collection
# and global `slug`, field `type`, `relationTo`, and the `unique` / `index` /
# `required` / `hasMany` / `virtual` flags. Everything else a release touches —
# `access`, `hooks`, `validate`, `admin.description` — is behaviour, and behaviour
# never needs a migration.
#
# So: extract those literals at two refs and set-diff them. An empty diff is
# proof there is nothing to migrate; a non-empty one is the exact list to write
# the migration from.
#
# Comment lines are stripped BEFORE matching. Without that, docblocks quoting
# field names between backticks — of which this package has many — produce false
# positives that make every release look like a schema change.
#
# Usage:
#   scripts/dev/schema-diff.sh v0.5.0 v0.6.0
#   scripts/dev/schema-diff.sh v0.6.0 HEAD
#   scripts/dev/schema-diff.sh v0.6.0            # compares against the WORKING TREE

set -euo pipefail

FROM="${1:?usage: schema-diff.sh <from-ref> [to-ref|working tree]}"
TO="${2:-}"

PATHS=(src/collections src/globals src/modules)
PATTERN="(name|slug|type|relationTo):[[:space:]]*'[^']+'|(unique|index|required|hasMany|virtual):[[:space:]]*(true|false)"

extract_ref() {
  local ref="$1"
  # `|| true` on every inner pipeline: most files declare no field at all, and a
  # `grep` that matches nothing exits 1 — which `set -e` would take as a fatal
  # error, aborting the extraction after the first such file and reporting an
  # empty (i.e. falsely reassuring) diff.
  git ls-tree -r --name-only "$ref" -- "${PATHS[@]}" 2>/dev/null \
    | { grep -E '\.(ts|tsx)$' || true; } \
    | while read -r f; do
        git show "$ref:$f" \
          | { grep -vE '^[[:space:]]*(\*|//|/\*)' || true; } \
          | { grep -oE "$PATTERN" || true; } \
          | sed "s|^|$f |"
      done | sort -u
}

extract_worktree() {
  local existing=()
  for p in "${PATHS[@]}"; do [ -d "$p" ] && existing+=("$p"); done
  find "${existing[@]}" \( -name '*.ts' -o -name '*.tsx' \) \
    | sort \
    | while read -r f; do
        { grep -vE '^[[:space:]]*(\*|//|/\*)' "$f" || true; } \
          | { grep -oE "$PATTERN" || true; } \
          | sed "s|^|$f |"
      done | sort -u
}

left=$(mktemp) && right=$(mktemp)
trap 'rm -f "$left" "$right"' EXIT

extract_ref "$FROM" > "$left"
if [ -n "$TO" ]; then extract_ref "$TO" > "$right"; else extract_worktree > "$right"; fi

echo "from: $FROM ($(wc -l < "$left" | tr -d ' ') declarations)"
echo "to:   ${TO:-<working tree>} ($(wc -l < "$right" | tr -d ' ') declarations)"
echo

if diff -u "$left" "$right"; then
  echo "No schema-shaping declaration changed. No migration is owed."
else
  echo
  echo "Schema-shaping declarations changed — write the Upgrading note and the migration."
  exit 1
fi
