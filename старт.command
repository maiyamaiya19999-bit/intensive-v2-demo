#!/bin/bash
# Открывает кабинет в демо-режиме на локальном сервере. Двойной клик — и готово.
cd "$(dirname "$0")"
PORT=8765
( sleep 1; open "http://localhost:$PORT/?demo=1" ) &
echo "Кабинет открыт: http://localhost:$PORT/?demo=1"
echo "Чтобы остановить — закрой это окно."
/usr/bin/python3 -m http.server "$PORT"
