#!/usr/bin/env bash
# 분할 기획서를 순서대로 합쳐 GDD-full.md를 만든다. 문서를 고친 뒤 다시 실행할 것.
set -euo pipefail
cd "$(dirname "$0")"
out=GDD-full.md
files=(README.md 01-vision.md 02-art-direction.md 03-grades.md 04-garden-care.md 05-items-breeding.md \
       06-battle.md 07-plants-1.md 07-plants-2.md 07-plants-3.md 07-plants-4.md 08-enemies-stages.md \
       09-rewards-economy.md 10-main-screen-ux.md 11-audio.md 12-tech-spec.md 13-roadmap-qa.md)
{
  echo "<!-- 이 파일은 build-full.sh가 분할 문서를 합쳐 만든 통합본입니다. 직접 고치지 말고 분할 문서를 고친 뒤 다시 생성하세요. -->"
  echo
  for f in "${files[@]}"; do
    cat "$f"
    printf '\n\n---\n\n'
  done
} > "$out"
echo "wrote $out ($(wc -l < "$out") lines)"
