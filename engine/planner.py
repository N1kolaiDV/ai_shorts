from __future__ import annotations
import re
from typing import Dict, Any, List
from pathlib import Path
from engine.core_io import write_json

# Reglas de legibilidad (customizables)
MAX_CHARS_PER_LINE = 32
MAX_LINES = 2

_SENT_SPLIT = re.compile(r"[.!?]\s+")

def _clean(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\s+", " ", text).strip()
    return text

def _wrap_to_lines(words: List[str], max_chars: int) -> List[str]:
    """Devuelve líneas (sin perder palabras) con límite de chars."""
    lines: List[str] = []
    current: List[str] = []

    def current_len(c: List[str]) -> int:
        # longitud con espacios
        if not c:
            return 0
        return len(" ".join(c))

    for w in words:
        if not current:
            current = [w]
            continue

        candidate = current + [w]
        if current_len(candidate) <= max_chars:
            current = candidate
        else:
            lines.append(" ".join(current))
            current = [w]

    if current:
        lines.append(" ".join(current))

    return lines

def _lines_to_scenes(lines: List[str], max_lines: int) -> List[str]:
    """Agrupa líneas en bloques de max_lines; cada bloque es una escena (con saltos \n)."""
    scenes: List[str] = []
    for i in range(0, len(lines), max_lines):
        chunk = lines[i:i + max_lines]
        scenes.append("\n".join(chunk))
    return scenes

def _safe_sentence_split(text: str) -> List[str]:
    parts = _SENT_SPLIT.split(text)
    return [p.strip() for p in parts if p.strip()]

def build_spec(script_path: Path, spec_path: Path) -> Dict[str, Any]:
    raw = script_path.read_text(encoding="utf-8")
    text = _clean(raw)

    sentences = _safe_sentence_split(text) or [text]
    scenes: List[Dict[str, Any]] = []

    for s in sentences:
        words = s.split()
        lines = _wrap_to_lines(words, MAX_CHARS_PER_LINE)
        scene_texts = _lines_to_scenes(lines, MAX_LINES)

        for st in scene_texts:
            scenes.append({"text": st, "start": None, "end": None})

    spec = {"scenes": scenes}
    write_json(spec_path, spec)
    return spec
