#!/usr/bin/env bash
# Corta el video de muestra (Chevrolet Trailblazer 2019) en clips sueltos,
# como si el vendedor los hubiera grabado por separado.
set -euo pipefail
cd "$(dirname "$0")/../.."
SRC=../public/Videos_fotos_vendedores/Video-felipe.mp4
OUT=public/demo
mkdir -p "$OUT"
cut() { ffmpeg -v error -y -ss "$2" -to "$3" -i "$SRC" -c:v libx264 -preset veryfast -crf 18 -c:a aac -b:a 160k "$OUT/$1.mp4"; }
cut clip1 0.00 4.90
cut clip2 5.70 11.13
cut clip3 11.34 21.10
cut clip4 21.90 25.05
cut clip5 24.70 27.93
cut clip6 28.17 32.77
cut clip7 33.40 36.60
ls -la "$OUT"
