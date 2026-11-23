#!/usr/bin/env bash
# Reinstalls every agent skill Couple Chaos uses into ~/.claude/skills (and agents into ~/.claude/agents).
# Run: bash install-skills.sh
set -euo pipefail
SK=~/.claude/skills; AG=~/.claude/agents; TMP=$(mktemp -d); mkdir -p "$SK" "$AG"
clone() { git clone -q --depth 1 "https://github.com/$1.git" "$TMP/$(echo "$1" | tr / _)"; }
put() { local src=$1 name=$2; [ -e "$SK/$name" ] || cp -r "$src" "$SK/$name"; }

# 1. App Store Connect CLI skills (rorkai)
clone rorkai/app-store-connect-cli-skills
for d in "$TMP"/rorkai_app-store-connect-cli-skills/skills/*/; do put "$d" "$(basename "$d")"; done
# 2-7. Mobile platform skills: Android (Google), Expo, Flutter, SwiftUI Pro, React Native (Callstack), Software Mansion
for r in android/skills expo/skills flutter/agent-plugins twostraws/SwiftUI-Agent-Skill callstackincubator/agent-skills software-mansion-labs/skills; do
  clone "$r"; d="$TMP/$(echo "$r" | tr / _)"; pre=${r%%/*}
  find "$d" -name SKILL.md -not -path '*/.git/*' | while read -r f; do
    name=$(grep -m1 '^name:' "$f" | sed 's/name: *//; s/["'"'"']//g' | tr -cd 'a-zA-Z0-9-_'); [ -z "$name" ] && name=$(basename "$(dirname "$f")")
    put "$(dirname "$f")" "$pre-$name"
  done
done
# 8. Design + marketing skills, edited (hsynozdamar-byte) + 6 agents
clone hsynozdamar-byte/claude-skills-edited
for d in "$TMP"/hsynozdamar-byte_claude-skills-edited/skills/*/; do put "$d" "$(basename "$d")"; done
for a in "$TMP"/hsynozdamar-byte_claude-skills-edited/agents/*.md; do [ "$(basename "$a")" = SOURCE.md ] || cp -n "$a" "$AG/"; done
# 9. Social media research (ScrapeCreators, needs SCRAPECREATORS_API_KEY)
clone ScrapeCreators/social-media-research-skills
for d in "$TMP"/ScrapeCreators_social-media-research-skills/skills/*/; do put "$d" "$(basename "$d")"; done
# 10. Animation styles (Remotion); run `npm install` inside it before rendering
[ -e "$SK/animation-styles" ] || git clone -q --depth 1 https://github.com/deenukhan/animation-styles.git "$SK/animation-styles"
rm -rf "$TMP"; echo "skills: $(ls "$SK" | wc -l), agents: $(ls "$AG" | wc -l)"
