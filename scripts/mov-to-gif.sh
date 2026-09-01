#!/usr/bin/env bash
# Turn a macOS screen recording into a GIF small enough for a README.
#
#   scripts/mov-to-gif.sh recording.mov docs/media/balcony.gif
#   scripts/mov-to-gif.sh recording.mov out.gif 800 10 2
#                                            width fps speed
#
# Defaults: 900 px wide, 12 fps, real speed. Speed 2 plays twice as fast, which
# is how a long clip stays small.
#
# Two passes: work out the best 256 colours for this clip, then use them. One
# pass with a generic palette bands badly on a dark background.
#
# ffmpeg warns that the input is not sRGB. Leave it. A macOS recording is
# limited-range bt709, and converting it to sRGB washes the warm tint out of
# the dark background, so the untouched decode is the closer one.
#
# All metadata is dropped. A macOS recording carries a creation timestamp and
# the recorder's name, and neither belongs in a published file.
set -euo pipefail

if [ $# -lt 2 ]; then
  sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

input=$1
output=$2
width=${3:-900}
fps=${4:-12}
speed=${5:-1}

palette=$(mktemp -t gifpalette).png
trap 'rm -f "$palette"' EXIT

filters="setpts=PTS/${speed},fps=${fps},scale=${width}:-1:flags=lanczos"

# -update 1: one image out, not a numbered sequence.
ffmpeg -v error -y -i "$input" -map_metadata -1 \
  -vf "${filters},palettegen=stats_mode=diff" -frames:v 1 -update 1 "$palette"

ffmpeg -v error -y -i "$input" -i "$palette" -map_metadata -1 \
  -lavfi "${filters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" \
  -loop 0 "$output"

printf '%s  %s\n' "$(du -h "$output" | cut -f1)" "$output"
