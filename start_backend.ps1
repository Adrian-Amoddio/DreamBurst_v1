# Usage: .\start_backend.ps1
$ErrorActionPreference = "Stop"

# Activate venv
if (Test-Path ".\.venv\Scripts\Activate.ps1") {
  & ".\.venv\Scripts\Activate.ps1"
} else {
  py -3.11 -m venv .venv
  & ".\.venv\Scripts\Activate.ps1"
}

# Install deps (idempotent)
pip install -U pip wheel
pip install fastapi uvicorn[standard] python-dotenv requests httpx pillow numpy scipy scikit-image

# Load .env if present
if (Test-Path ".\.env") {
  Write-Host "[dotenv] Loaded .env" -ForegroundColor Cyan
}

# Run backend on 8080
uvicorn api:app --host 127.0.0.1 --port 8080 --http h11 --loop asyncio --workers 1 --access-log
