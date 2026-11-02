#!/usr/bin/env bash
# Runs on the server (as mojiapi) after GitHub Actions uploads a web build.
# Usage: bash release-web.sh <tarball> <release-id>
# Unpacks into /srv/moji-web/releases/<id>, then switches /srv/moji-web/current to it in one step,
# so visitors never see a half-copied site. nginx serves the files directly: no restart needed.
set -euo pipefail

TARBALL=$1
RELEASE=$2
ROOT=/srv/moji-web
DEST=$ROOT/releases/$RELEASE

mkdir -p "$DEST"
tar -xzf "$TARBALL" -C "$DEST"
rm -f "$TARBALL"

ln -sfn "$DEST" "$ROOT/current.tmp"
mv -Tf "$ROOT/current.tmp" "$ROOT/current"
echo "Live: $RELEASE"

# Keep the 3 newest releases.
ls -1dt "$ROOT"/releases/*/ | tail -n +4 | xargs -r rm -rf
