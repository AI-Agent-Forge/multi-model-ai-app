#!/bin/bash
# Change to the directory where this script resides, so paths are repo-relative
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# If LTX packages are installed from source alongside the repo, add them to
# PYTHONPATH. Override LTX_PACKAGES_ROOT to point elsewhere if needed.
if [ -n "$LTX_PACKAGES_ROOT" ]; then
    export PYTHONPATH="${LTX_PACKAGES_ROOT}/ltx-core/src:${LTX_PACKAGES_ROOT}/ltx-pipelines/src:$PYTHONPATH"
fi

# Use PYTHON env var if set, otherwise default to python3
: "${PYTHON:=python3}"
"$PYTHON" -u main.py
