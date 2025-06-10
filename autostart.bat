@echo off
REM Путь к папке, где лежит index.html — настройте при необходимости
cd /d E:\users\yaroslavtcev_kv\PycharmProjects\CalculatorGusev

REM Запускаем Python-сервер
start "" python -m http.server 8000

REM Небольшая пауза (можно настроить при необходимости)
timeout /t 2 >nul

REM Открываем браузер по адресу
start http://localhost:8000/index.html
