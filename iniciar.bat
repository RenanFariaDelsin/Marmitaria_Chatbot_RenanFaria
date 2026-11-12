@echo off
title Marmitaria Sabor Caseiro - Servidor Local
echo ========================================================
echo   Iniciando Marmitaria Sabor Caseiro (Client-Side)
echo   Acesse: http://localhost:8080/
echo ========================================================
echo.
start http://localhost:8080/
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Porta 8080
pause

