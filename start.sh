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

ln -sf "$DOTNET_CMD" /usr/bin/dotnet 2>/dev/null || true

echo "[Start] Launching ASP.NET Core application on port 3000..."
exec "$DOTNET_CMD" run --project "$SCRIPT_DIR/myprofile-backend.csproj" --urls "http://0.0.0.0:3000"
