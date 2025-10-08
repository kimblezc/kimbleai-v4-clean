# Securely set OpenAI API key for local dev and optionally GitHub/Vercel
# - Prompts securely for the key (no echo)
# - Writes .env.local (gitignored)
# - If 'gh' is available and user agrees, sets GitHub repo secret OPENAI_API_KEY
# - Prints Vercel CLI commands to set the secret in Vercel

param(
    [switch]$SetGitHubSecret,
    [string]$GitHubRepo = "kimblezc/kimbleai-v4-clean"
)

Write-Host "This script will prompt you to paste your OpenAI API key. It will not echo the key."
$key = Read-Host -AsSecureString "Paste OpenAI API key"
if (-not $key) { Write-Host "No key entered. Exiting."; exit 1 }

# Convert securestring to plaintext for file writing only
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($key)
try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringUni($ptr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeCoTaskMemUnicode($ptr)
}

# Ensure .env.local is gitignored
if (-Not (Test-Path .gitignore)) { New-Item -Path .gitignore -ItemType File -Force | Out-Null }
if (-Not (Select-String -Path .gitignore -Pattern "^\.env.local$" -Quiet)) { Add-Content -Path .gitignore -Value "`n.env.local"; Write-Host "Added .env.local to .gitignore" }

# Write .env.local
$envFile = ".env.local"
$content = @()
$content += "OPENAI_API_KEY=$plain"
$content += "# local only"
Set-Content -Path $envFile -Value $content -NoNewline
Write-Host ".env.local written (tracked will be ignored)."

# Optionally set GitHub secret if user asked and 'gh' is installed
if ($SetGitHubSecret) {
    $gh = Get-Command gh -ErrorAction SilentlyContinue
    if ($gh) {
        Write-Host "Setting GitHub repo secret OPENAI_API_KEY for $GitHubRepo using 'gh'..."
        $plain | gh secret set OPENAI_API_KEY --repo $GitHubRepo
        if ($LASTEXITCODE -eq 0) { Write-Host "GitHub repo secret set." } else { Write-Host "Failed to set GitHub secret." }
    } else {
        Write-Host "'gh' not found. Skipping GitHub secret set. Install GitHub CLI to enable this." 
    }
}

# Print Vercel instructions
Write-Host "\nSet the key in Vercel (recommended). Use the CLI to set it for the project:"
Write-Host "npx vercel env add OPENAI_API_KEY production" -ForegroundColor Cyan
Write-Host "# Or via the Vercel dashboard: https://vercel.com/<your-team>/<your-project>/settings/environment-variables" -ForegroundColor Cyan

Write-Host "\nDone. Keep the key secret and rotate if leaked." -ForegroundColor Green
