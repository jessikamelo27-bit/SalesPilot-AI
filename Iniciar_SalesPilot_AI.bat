@echo off
title SalesPilot AI - Inicializador Automatico
echo ===================================================
echo   Iniciando SalesPilot AI (Backend + Frontend)...
echo ===================================================

start "SalesPilot AI - Backend (FastAPI)" /min cmd /c "cd /d "%~dp0backend" && .\.venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "SalesPilot AI - Frontend (Vite)" /min cmd /c "cd /d "%~dp0frontend" && npm run dev -- --host 127.0.0.1 --port 5173"

timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"
echo SalesPilot AI iniciado no seu navegador!
