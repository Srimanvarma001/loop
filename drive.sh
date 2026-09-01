#!/usr/bin/env bash
#
# drive.sh — run an OpenCode agent over every unfinished feature in a plan file.
#
# Usage:
#   bash drive.sh [PLAN] [--check]
#
#   PLAN     markdown plan file (default: PLAN.md)
#   --check  pre-flight checks only, then exit (launches no sessions)
#
# How it works
#   - Reads PLAN, takes the FIRST feature whose "- **Status:** [ ]" is still open,
#     and launches a FRESH `opencode run` session for that feature alone
#     (clean context every time — the automated equivalent of /new).
#   - Accepts a feature only when BOTH are true:
#       1. its Status line was flipped to [x] in PLAN, and
#       2. a new commit actually reached the remote (verified with git, NOT by
#          trusting opencode's exit code, which is unreliable in headless mode).
#   - Retries a failed feature once in a fresh session, then STOPS.
#   - Re-running later resumes: features already ticked [x] are skipped.
#
# Windows note
#   Unsets OPENCODE_SERVER_PASSWORD/USERNAME to avoid the headless "Session not
#   found" bug, and uses --dangerously-skip-permissions (auto-approves every tool
#   call — this script is for unattended/CI-style use).

set -euo pipefail

PLAN="PLAN.md"
CHECK_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    -*)      echo "unknown option: $arg (usage: bash drive.sh [PLAN] [--check])" >&2; exit 2 ;;
    *)       PLAN="$arg" ;;
  esac
done

LOG="drive.log"
RUN_DIR=".drive"
mkdir -p "$RUN_DIR"

log() { printf '[%s] %s\n' "$(date '+%F %T')" "$*" | tee -a "$LOG"; }
die() { log "FATAL: $*"; exit 1; }

# Single-instance guard so two drives never process the same feature.
if [ -e "$RUN_DIR/lock" ]; then
  die "another instance appears to be running ($RUN_DIR/lock exists). Remove it if stale."
fi
touch "$RUN_DIR/lock"
trap 'rm -f "$RUN_DIR/lock"' EXIT

# ---------- pre-flight ----------
command -v opencode >/dev/null 2>&1 || die "opencode CLI not on PATH — install it and retry."
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "not inside a git repository — run this from your project repo root."
git ls-remote --exit-code origin HEAD >/dev/null 2>&1 || die "cannot reach remote 'origin' — git push would fail (check cached credentials)."
[ -f "$PLAN" ] || die "plan file '$PLAN' not found."

total=$(grep -c '^## Feature' "$PLAN" || true)
[ "${total:-0}" -gt 0 ] || die "no '## Feature' headings in '$PLAN'. Each feature must be a '## Feature N: Title' section with '- **ID:**' and '- **Status:** [ ]' lines."

REMOTE_BRANCH=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || echo "origin/main")
LOCAL_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD")
log "pre-flight OK — $total feature(s); local=$LOCAL_BRANCH; push=$REMOTE_BRANCH"
[ "$CHECK_ONLY" -eq 1 ] && { log "check complete — nothing launched."; exit 0; }

# Windows workaround for the "Session not found" headless-run bug.
export OPENCODE_SERVER_PASSWORD=""
export OPENCODE_SERVER_USERNAME=""

# ---------- helpers ----------
# Print the line number of the first '## Feature' heading whose section still
# has '- **Status:** [ ]'.
next_pending_heading() {
  awk '/^## Feature/ { in_feature=1; heading=NR; next }
       in_feature && /^- \*\*Status:\*\* \[ \]/ { print heading; exit }' "$PLAN"
}

# Print the section starting at heading line L up to the next '## Feature'
# heading (or end of file).
extract_block() {
  local L="$1" end
  end=$(awk -v s="$((L + 1))" 'NR >= s && /^## Feature/ { print NR; exit }' "$PLAN")
  [ -n "${end:-}" ] || end=$(wc -l < "$PLAN")
  sed -n "${L},$((end - 1))p" "$PLAN"
}

status_is_done() { extract_block "$1" | grep -q -- '- \*\*Status:\*\* \[x\]'; }

# Independent ground-truth check: box ticked AND a new commit reached the remote.
verify() {
  local L="$1" before="$2" now unpushed
  status_is_done "$L" || { log "  verify: Status box not ticked to [x]"; return 1; }
  now=$(git rev-parse HEAD)
  [ "$now" != "$before" ] || { log "  verify: no new commit on $LOCAL_BRANCH"; return 1; }
  git fetch origin -q 2>/dev/null || { log "  verify: 'git fetch origin' failed"; return 1; }
  unpushed=$(git rev-list --count "${REMOTE_BRANCH}..HEAD" 2>/dev/null || echo 1)
  if [ "${unpushed:-1}" -eq 0 ]; then
    log "  verify: commit(s) confirmed on $REMOTE_BRANCH"
    return 0
  fi
  log "  verify: ${unpushed} commit(s) not yet on $REMOTE_BRANCH"
  return 1
}

# Launch one fresh opencode session for a feature. Prompt saved under .drive/
# so you can inspect exactly what was sent to the agent.
run_session() {
  local id="$1" title="$2" specfile="$3"
  local prompt_file="$RUN_DIR/prompt-${id}.txt"
  cat > "$prompt_file" <<EOF
You are implementing ONE feature from $PLAN.

1. Read $PLAN in full — the "Agent instructions" preamble and the Architecture section.
2. Implement ONLY feature "${id}: ${title}", using its Goal + Acceptance Criteria below.
3. Definition of Done — do ALL of these:
   a. Run the project's test suite (npm test / pytest / go test / whatever fits). All tests pass.
   b. Commit all source changes AND $PLAN with message: feat: ${id} ${title}
   c. Push to $REMOTE_BRANCH.
   d. Flip that feature's "- **Status:** [ ]" line to "- **Status:** [x]" in $PLAN, and include that change in the commit.
4. Do NOT modify any other feature's code, spec, or status.
5. Do NOT commit drive.log or $RUN_DIR/ (driver scratch files).

--- FEATURE SPEC (from $PLAN) ---
$(cat "$specfile")
EOF

  log "  fresh opencode session → .drive/prompt-${id}.txt …"
  OPENCODE_SERVER_PASSWORD="" OPENCODE_SERVER_USERNAME="" \
    opencode run --dangerously-skip-permissions "$(cat "$prompt_file")" >> "$LOG" 2>&1
}

done_count() { grep -c -- '- \*\*Status:\*\* \[x\]' "$PLAN" || true; }

# ---------- main loop ----------
while :; do
  L=$(next_pending_heading)
  if [ -z "${L:-}" ]; then
    log "ALL DONE — $total/$total feature(s) complete. 🎉"
    exit 0
  fi

  id=$(extract_block "$L" | awk '/^- \*\*ID:\*\*/ { sub(/^- \*\*ID:\*\* */, ""); print; exit }')
  title=$(sed -n "${L}p" "$PLAN" | sed -E 's/^## *Feature *[0-9]* *[:.]* *//')
  [ -n "${id:-}" ] || id="feature-${L}"
  [ -n "${title:-}" ] || title="(untitled)"

  specfile="$RUN_DIR/spec-${id}.txt"
  extract_block "$L" > "$specfile"

  log "▶ [$id] ${title}   (${done_count}/${total} done)"

  attempt=1; accepted=0
  while [ "$attempt" -le 2 ]; do
    log "  attempt $attempt/2 — launching session"
    before=$(git rev-parse HEAD)
    if run_session "$id" "$title" "$specfile" && verify "$L" "$before"; then
      accepted=1
      break
    fi
    log "  ✗ attempt $attempt failed verification"
    attempt=$((attempt + 1))
  done

  if [ "$accepted" -eq 0 ]; then
    log "✗ [$id] FAILED after 2 attempts — stopping. Fix the issue, then re-run to resume."
    exit 1
  fi

  dirty=$(git status --porcelain 2>/dev/null | wc -l)
  [ "${dirty:-0}" -eq 0 ] || log "  note: working tree has ${dirty} uncommitted change(s) — next session may pick them up"
  log "✓ [$id] accepted — ${done_count}/${total} done"
done
