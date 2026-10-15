#!/usr/bin/env bash
# Exit on error
set -o errexit

npm install
npx puppeteer browsers install chrome
