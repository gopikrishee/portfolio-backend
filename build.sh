#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTNET_BIN="$SCRIPT_DIR/.dotnet/dotnet"

if [ ! -f "$DOTNET_BIN" ] && ! command -v dotnet &> /dev/null; then
  echo "[Setup] .NET SDK not found. Installing .NET 10.0 SDK into $SCRIPT_DIR/.dotnet ..."
  mkdir -p "$SCRIPT_DIR/.dotnet"
  curl -sSL https://dot.net/v1/dotnet-install.sh | bash -s -- --channel 10.0 --install-dir "$SCRIPT_DIR/.dotnet"
fi

if [ -f "$DOTNET_BIN" ]; then
  DOTNET_CMD="$DOTNET_BIN"
else
  DOTNET_CMD="dotnet"
fi

exec "$DOTNET_CMD" build "$SCRIPT_DIR/myprofile-backend.csproj"
