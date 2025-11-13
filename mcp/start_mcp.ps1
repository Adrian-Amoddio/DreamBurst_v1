# Usage: from mcp folder: .\start_mcp.ps1
$ErrorActionPreference = "Stop"

# Ensure deps
if (-not (Test-Path ".\node_modules")) { npm install }

# Point to local backend
$env:DREAMBURST_BACKEND_URL = "http://127.0.0.1:8080"

# Require an OpenAI key for brief generation
if (-not $env:OPENAI_API_KEY) {
  Write-Host "Set OPENAI_API_KEY first: `n  $env:OPENAI_API_KEY = 'sk-...'" -ForegroundColor Yellow
}

npm run dev
