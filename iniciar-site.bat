@echo off
title Espaco 35 - site local
cd /d "%~dp0"
echo Iniciando o site Espaco 35 em http://localhost:3000 ...
call npm run dev
pause
