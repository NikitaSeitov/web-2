#!/usr/bin/env python3
import json
import mimetypes
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
RESPONSES_FILE = DATA_DIR / "responses.json"
PORT = 8000

QUESTION_META = [
    {"key": "q1", "text": "Как часто вы пользуетесь ИИ?", "options": ["Несколько раз в день", "Каждый день", "Несколько раз в неделю", "Несколько раз в месяц", "Редко", "Не пользуюсь"]},
    {"key": "q2", "text": "Для чего вы чаще всего используете ИИ?", "options": ["Поиск информации", "Работа", "Учёба", "Создание текстов", "Генерация идей", "Перевод", "Решение повседневных задач", "Развлечение", "Общение"]},
    {"key": "q3", "text": "Насколько важную роль ИИ играет в вашей повседневной жизни?", "options": ["Практически никакую", "Небольшую", "Умеренную", "Значительную", "Очень значительную"]},
    {"key": "q4", "text": "Как вы обычно относитесь к ответам ИИ?", "options": ["Обычно доверяю", "Скорее доверяю", "Доверяю, но проверяю", "Скорее не доверяю", "Не доверяю"]},
    {"key": "q5", "text": "Как часто вы проверяете информацию, полученную от искусственного интеллекта?", "options": ["Всегда", "Часто (в большинстве случаев)", "Иногда", "Редко", "Никогда"]},
    {"key": "q6", "text": "Случается ли вам обращаться к ИИ не только за информацией, но и за мнением или советом?", "options": ["Часто", "Иногда", "Редко", "Никогда"]},
    {"key": "q7", "text": "Насколько вам комфортно обсуждать с ИИ личные или эмоциональные темы?", "options": ["Очень комфортно", "Скорее комфортно", "Нейтрально", "Скорее некомфортно", "Совсем некомфортно", "Я не обсуждаю с ИИ личные темы"]},
    {"key": "q8", "text": "Как вы оцениваете способность искусственного интеллекта понимать эмоции и переживания человека?", "options": ["Хорошо понимает и учитывает эмоции", "Иногда понимает, но часто ошибается", "Плохо понимает эмоции", "Совсем не способен понимать эмоции", "Затрудняюсь ответить"]},
    {"key": "q9", "text": "Что для вас важнее всего в общении с ИИ?", "options": ["Получить точный ответ", "Быстро решить задачу", "Получить понятное объяснение", "Получить поддержку", "Возможность свободно высказать свои мысли"]},
    {"key": "q10", "text": "Считаете ли вы, что в будущем искусственный интеллект сможет оказывать эмоциональную поддержку людям на уровне, сопоставимом с человеком?", "options": ["Да, сможет", "Скорее сможет", "Скорее не сможет", "Нет, не сможет", "Затрудняюсь ответить"]},
]


def ensure_data_file():
    DATA_DIR.mkdir(exist_ok=True)
    if not RESPONSES_FILE.exists():
        RESPONSES_FILE.write_text("[]", encoding="utf-8")


def load_responses():
    ensure_data_file()
    try:
        raw = RESPONSES_FILE.read_text(encoding="utf-8")
        data = json.loads(raw) if raw.strip() else []
        return data if isinstance(data, list) else []
    except Exception:
        return []


def save_responses(items):
    ensure_data_file()
    RESPONSES_FILE.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")


def calculate_statistics(responses):
    total = len(responses)
    questions = []
    if total == 0:
        return {"total": 0, "questions": []}

    for meta in QUESTION_META:
        counts = {option: 0 for option in meta["options"]}
        for response in responses:
            answer = (response or {}).get("answers", {}).get(meta["key"])
            if isinstance(answer, list):
                for item in answer:
                    if item in counts:
                        counts[item] += 1
                    else:
                        counts[item] = 1
            elif answer is not None:
                if answer in counts:
                    counts[answer] += 1
                else:
                    counts[answer] = 1

        options = [
            {
                "text": text,
                "count": count,
                "percent": (count / total) * 100 if total else 0,
            }
            for text, count in counts.items()
        ]
        questions.append({
            "key": meta["key"],
            "text": meta["text"],
            "options": options,
        })

    return {"total": total, "questions": questions}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path == "/api/statistics":
            payload = calculate_statistics(load_responses())
            self._send_json(200, payload)
            return

        if path.startswith("/api/"):
            self._send_json(404, {"error": "not found"})
            return

        file_path = self._resolve_file(path)
        if file_path is None:
            self._send_json(404, {"error": "not found"})
            return

        if file_path.is_dir():
            file_path = file_path / "index.html"

        self._serve_file(file_path)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path == "/api/responses":
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length) if length > 0 else b""
            try:
                payload = json.loads(raw.decode("utf-8")) if raw else {}
            except json.JSONDecodeError:
                self._send_json(400, {"error": "invalid json"})
                return

            answers = payload.get("answers") if isinstance(payload, dict) else None
            if not isinstance(answers, dict) or not answers:
                self._send_json(400, {"error": "invalid payload"})
                return

            record = {
                "timestamp": payload.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                "answers": answers,
            }
            items = load_responses()
            items.append(record)
            save_responses(items)
            self._send_json(200, {"ok": True})
            return

        self._send_json(404, {"error": "not found"})

    def _resolve_file(self, request_path):
        relative = request_path.lstrip("/")
        if not relative:
            relative = "index.html"
        candidate = (ROOT / relative).resolve()
        if ROOT not in candidate.parents and candidate != ROOT:
            return None
        if candidate.exists() and candidate.is_file():
            return candidate
        return None

    def _serve_file(self, file_path: Path):
        mime_type, encoding = mimetypes.guess_type(str(file_path))
        if mime_type is None:
            mime_type = "application/octet-stream"

        data = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mime_type)
        self.send_header("Content-Length", str(len(data)))
        if encoding:
            self.send_header("Content-Encoding", encoding)
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, status_code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    ensure_data_file()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Python server running on http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
