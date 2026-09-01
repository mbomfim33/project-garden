#!/usr/bin/env bash
# Turn a macOS screen recording into a GIF small enough for a README.
#
#   scripts/mov-to-gif.sh recording.mov docs/media/balcony.gif
#   scripts/mov-to-gif.sh recording.mov out.gif 1000 12   # width, fps
#
# Two passes: work out the best 256 colours for this clip, then use them.
# One pass with the default palette makes dark backgrounds look banded.
set -euo pipefail

if [ $# -lt 2 ]; then
  sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

input=$1
output=$2
width=${3:-1000}
fps=${4:-12}
palette=$(mktemp -t gifpalette).png
trap 'rm -f "$palette"' EXIT

filters="fps=${fps},scale=${width}:-1:flags=lanczos"

# -update 1: one image out, not a numbered sequence.
ffmpeg -v warning -y -i "$input" -vf "${filters},palettegen=stats_mode=diff" -frames:v 1 -update 1 "$palette"
ffmpeg -v warning -y -i "$input" -i "$palette" \
  -lavfi "${filters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" \
  -loop 0 "$output"

printf '%s  %s\n' "$(du -h "$output" | cut -f1)" "$output"
