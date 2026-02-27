@echo off
setlocal

cd /d "%~dp0"

echo ========================================
echo  Iniciando Ecosistema AI Shorts + n8n
echo ========================================

REM ---- CONFIGURACIÓN DE N8N (DESBLOQUEO DE PERMISOS) ----
set N8N_DEFAULT_BINARY_DATA_MODE=filesystem
set N8N_ALLOWED_BINARY_DATA_STORAGE_PATH=C:\
set N8N_BLOCK_SVG_TRANSFORMATION=false

REM ---- 1. Iniciar n8n en segundo plano ----
echo [+] Iniciando n8n (Permisos en C:\ activados)...
start "n8n_Server" cmd /k "n8n start"

REM ---- 2. Activar entorno virtual y Backend ----
echo [+] Iniciando Backend Python...
call ".\.venv\Scripts\activate.bat"
start "Backend" cmd /k "cd backend && python main.py"

REM ---- Esperar a que los servicios carguen ----
timeout /t 5 >nul

REM ---- 4. Abrir Firefox con pestañas para todo ----
echo [+] Abriendo Firefox...
REM Abre el Frontend y el Editor de n8n en pestañas separadas
start "" "firefox.exe" -new-tab "http://localhost:5678"

echo ========================================
echo  Todo listo. Revisa las terminales si hay errores.
echo ========================================

endlocal