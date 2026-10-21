#!/usr/bin/env bash
# Genera los efectos de sonido sintetizados (sin licencias de terceros).
set -euo pipefail
cd "$(dirname "$0")/../public/sfx"
ff() { ffmpeg -v error -y "$@"; }
ff -f lavfi -i "anoisesrc=d=0.55:c=pink:a=0.9" -af "highpass=f=350,lowpass=f=6000,afade=t=in:d=0.2:curve=exp,afade=t=out:st=0.22:d=0.33,volume=1.6" -ar 48000 whoosh.wav
ff -f lavfi -i "aevalsrc='0.9*sin(2*PI*(950-2600*t)*t)*exp(-28*t)':d=0.16:s=48000" pop.wav
ff -f lavfi -i "aevalsrc='0.95*sin(2*PI*52*t)*exp(-4.5*t)+0.35*sin(2*PI*104*t)*exp(-9*t)+0.25*(random(0)-0.5)*exp(-22*t)':d=0.9:s=48000" -af "lowpass=f=1800" hit.wav
ff -f lavfi -i "aevalsrc='0.45*sin(2*PI*(180+520*t*t)*t)*min(1\,t*1.6)+0.18*(random(0)-0.5)*t':d=0.85:s=48000" -af "highpass=f=120,afade=t=out:st=0.75:d=0.1" riser.wav
ls -la
