#!/bin/bash
# Запускай после правок program.json или ассистентов, если открываешь кабинет двойным кликом.
cd "$(dirname "$0")/.."
/usr/bin/python3 tools/make_inline.py
read -n 1 -s -r -p "Нажми любую клавишу, чтобы закрыть"
