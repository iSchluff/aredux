#!/bin/sh
set -e
npm run lint
npm run test
npm publish
