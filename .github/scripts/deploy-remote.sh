#!/bin/sh
# Runs on the VPS, sent over SSH by .github/workflows/deploy.yml (feature 19).
#   $1  the frontend checkout on the VPS (DEPLOY_PATH): a folder named
#       `frontend`; the backend checkout, which holds docker-compose.prod.yml,
#       is its sibling ../backend
#   $2  the main commit to deploy, whose CI passed
# Checks everything first, then brings the checkout to that commit
# (fast-forward only) and rebuilds and restarts the `admin` service alone,
# waiting for its health check. A refusal changes nothing. No backup: the admin
# web holds no data.
set -eu

dir=$1
sha=$2
refuse() {
  echo "Refused: $1" >&2
  exit 1
}

cd "$dir"
# Physical paths (symlinks resolved), so the shell and Compose agree on them.
here=$(pwd -P)
backend=$(cd "$here/../backend" 2>/dev/null && pwd -P) ||
  refuse "no backend checkout next to $here."
[ -f "$backend/docker-compose.prod.yml" ] ||
  refuse "no docker-compose.prod.yml in $backend."
# Used unquoted in $compose below: only safe characters.
case "$backend" in
  *[!A-Za-z0-9._/-]*) refuse "the backend path $backend holds characters other than letters, digits, . _ / -." ;;
esac
# The admin service builds `context: ../frontend` from the backend checkout:
# the checkout updated here must be that very folder, or another copy is
# deployed (a wrongly named checkout, or a backend symlinked elsewhere).
built=$(cd "$backend/../frontend" 2>/dev/null && pwd -P) || built="(none)"
[ "$built" = "$here" ] ||
  refuse "the admin service builds $built, not this checkout $here."
compose="docker compose --project-directory $backend -f $backend/docker-compose.prod.yml"

# The checkout is the operator's too: never overwrite a hand edit.
[ "$(git symbolic-ref --short -q HEAD || true)" = main ] ||
  refuse "the frontend checkout on the VPS is not on main."
[ -z "$(git status --porcelain --untracked-files=no)" ] ||
  refuse "the frontend checkout on the VPS has local changes."

# This script arrives on stdin (`sh -s`): no command below may read it, or it
# would swallow the rest of the script. Hence </dev/null.

# The backend side must be in place (README "Production"): an `admin` service.
$compose config --services </dev/null | grep -qx admin ||
  refuse "docker-compose.prod.yml has no admin service yet."

# Fetching moves only origin/main, never the checkout.
git fetch --quiet origin main </dev/null
git merge-base --is-ancestor "$sha" origin/main ||
  refuse "$sha is not on origin/main."
# Forward only: the deployed commit must be the target or one of its
# ancestors, so an older commit, or a commit made on the VPS, is refused.
git merge-base --is-ancestor HEAD "$sha" ||
  refuse "the checkout at $(git rev-parse --short HEAD) cannot fast-forward to $sha."

git merge --ff-only --quiet "$sha" </dev/null
[ "$(git rev-parse HEAD)" = "$sha" ] ||
  refuse "the checkout did not reach $sha."
echo "Checkout at $sha."

# Only `admin`: --no-deps keeps Compose from building or recreating the API,
# whose own deploy takes a backup first. --wait fails on a bad health check.
$compose up -d --build --no-deps --wait --wait-timeout 300 admin </dev/null
$compose ps admin </dev/null
echo "Deployed $sha."
