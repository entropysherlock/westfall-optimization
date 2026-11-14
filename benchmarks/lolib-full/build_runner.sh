#!/bin/sh
# Bundle the unchanged ATLAS-032 TypeScript solver into a standalone Node runner (runners/atlas_runner.mjs).
set -e
cd "$(dirname "$0")/../../website"
npx --yes esbuild@0.28.2 ../benchmarks/lolib-full/runners/atlas_runner.ts --bundle --platform=node --format=esm \
  --outfile=../benchmarks/lolib-full/runners/atlas_runner.mjs --log-level=warning
