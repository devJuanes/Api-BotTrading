@echo off
cd /d "%~dp0"
echo Eliminando lock de Git...
del /f /q ".git\index.lock" 2>nul
del /f /q ".git\HEAD.lock" 2>nul
echo.
echo Agregando archivos...
git add .
if errorlevel 1 (
  echo ERROR en git add. Cierra Cursor/VS Code y vuelve a ejecutar este .bat
  pause
  exit /b 1
)
echo.
echo Haciendo commit...
git commit -m "BotTrading API: PM2, nginx, deploy, .gitignore"
if errorlevel 1 (
  echo No hay cambios que commitear, o ya hay commit. Continuando...
)
echo.
echo Configurando remote...
git remote remove origin 2>nul
git remote add origin https://github.com/devJuanes/BotTrading.git
git branch -M main
echo.
echo Subiendo a GitHub...
git push -u origin main
echo.
if errorlevel 1 (
  echo Si pide usuario/contraseña: usa un Personal Access Token como contraseña.
  echo https://github.com/settings/tokens
)
pause
