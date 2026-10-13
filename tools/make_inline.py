# Собирает content/inline.js — копию program.json и всех ассистентов, чтобы кабинет
# открывался двойным кликом (file://), где браузер не даёт читать файлы через fetch.
import json, os, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
content = os.path.join(root, "content")
data = {}
with open(os.path.join(content, "program.json"), encoding="utf-8") as f:
    raw = f.read()
    json.loads(raw)  # проверка, что JSON без ошибок
    data["program.json"] = raw
adir = os.path.join(content, "assistants")
for name in sorted(os.listdir(adir)):
    if name.endswith(".md"):
        with open(os.path.join(adir, name), encoding="utf-8") as f:
            data["assistants/" + name] = f.read()
out = "/* Автоматическая копия content/. Не править руками: запусти tools/обновить-контент.command */\n"
out += "window.CONTENT_INLINE = " + json.dumps(data, ensure_ascii=False) + ";\n"
with open(os.path.join(content, "inline.js"), "w", encoding="utf-8") as f:
    f.write(out)
print("Готово: content/inline.js, файлов:", len(data))
