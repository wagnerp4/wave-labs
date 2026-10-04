@echo off
set "DISTRO=Debian"
if defined WAVELABS_WSL_DISTRO set "DISTRO=%WAVELABS_WSL_DISTRO%"
set "REPO=/home/philipp/software/python/Signal Processing/Audio/Personal/wave-labs"
if defined WAVELABS_WSL_REPO set "REPO=%WAVELABS_WSL_REPO%"

echo WSL distro: %DISTRO%
echo Linux repo: %REPO%
echo Do not run Windows uv against this tree.
echo Leave the two WSL windows running, then open http://127.0.0.1:1420
echo.

start "wave-labs engine" wsl.exe -d %DISTRO% -- bash -lc "cd '%REPO%' && uv sync --directory engine && uv run --directory engine wavelabs-engine serve --host 0.0.0.0 --port 8471"
timeout /t 1 /nobreak >nul
start "wave-labs desktop" wsl.exe -d %DISTRO% -- bash -lc "cd '%REPO%' && corepack pnpm install && corepack pnpm --filter @wavelabs/desktop dev"

echo Engine:  http://127.0.0.1:8471/health
echo Desktop: http://127.0.0.1:1420
echo If health fails from Windows, run: wsl -d %DISTRO% -- hostname -I
