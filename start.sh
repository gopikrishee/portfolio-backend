#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTNET_DIR="$SCRIPT_DIR/.dotnet"
DOTNET_BIN="$DOTNET_DIR/dotnet"

export DOTNET_ROOT="$DOTNET_DIR"
export PATH="$DOTNET_DIR:$PATH"

if [ ! -f "$DOTNET_BIN" ] && ! command -v dotnet &> /dev/null; then
  echo "[Setup] .NET SDK not found. Installing .NET 10.0 SDK into $DOTNET_DIR ..."
  mkdir -p "$DOTNET_DIR"
  curl -sSL https://dot.net/v1/dotnet-install.sh | bash -s -- --channel 10.0 --install-dir "$DOTNET_DIR"
fi

if [ -f "$DOTNET_BIN" ]; then
  chmod -R +x "$DOTNET_DIR" 2>/dev/null || true
  DOTNET_CMD="$DOTNET_BIN"
else
  DOTNET_CMD="dotnet"
fi

ln -sf "$DOTNET_CMD" /usr/bin/dotnet 2>/dev/null || true

echo "[Start] Launching ASP.NET Core application on port 3000..."
exec "$DOTNET_CMD" run --project "$SCRIPT_DIR/myprofile-backend.csproj" --urls "http://0.0.0.0:3000"
