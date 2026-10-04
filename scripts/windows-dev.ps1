$ErrorActionPreference = "Stop"

$Distro = if ($env:WAVELABS_WSL_DISTRO) { $env:WAVELABS_WSL_DISTRO } else { "Debian" }
$Repo = if ($env:WAVELABS_WSL_REPO) {
  $env:WAVELABS_WSL_REPO
} else {
  "/home/philipp/software/python/Signal Processing/Audio/Personal/wave-labs"
}

$Unc = "\\wsl.localhost\$Distro$($Repo.Replace('/', '\'))"

Write-Host "WSL distro: $Distro"
Write-Host "Linux repo: $Repo"
Write-Host "Windows UNC: $Unc"
Write-Host ""
Write-Host "Do not run Windows uv against this tree. engine/.venv is Linux."
Write-Host "Leave these two WSL windows running, then open http://127.0.0.1:1420"
Write-Host ""

$Serve = "cd `"$Repo`" && uv sync --directory engine && uv run --directory engine wavelabs-engine serve --host 0.0.0.0 --port 8471"
$Ui = "cd `"$Repo`" && corepack pnpm install && corepack pnpm --filter @wavelabs/desktop dev"

Start-Process -FilePath "wsl.exe" -ArgumentList @("-d", $Distro, "--", "bash", "-lc", $Serve)
Start-Sleep -Seconds 1
Start-Process -FilePath "wsl.exe" -ArgumentList @("-d", $Distro, "--", "bash", "-lc", $Ui)

Write-Host "Engine:  http://127.0.0.1:8471/health"
Write-Host "Desktop: http://127.0.0.1:1420"
Write-Host ""
Write-Host "If health fails from Windows, WSL localhost forwarding is off. Use the WSL IP from: wsl -d $Distro -- hostname -I"
