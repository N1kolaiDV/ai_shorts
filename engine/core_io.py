from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import json
import yaml
import uuid
from typing import Any, Dict

CONFIG_PATH = Path("config.yaml")

def load_config() -> Dict[str, Any]:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError("No existe config.yaml en la raíz del proyecto.")
    return yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))

def new_job_id() -> str:
    # UUID corto, suficiente para workspace local
    return uuid.uuid4().hex[:12]

@dataclass(frozen=True)
class JobPaths:
    root: Path
    script: Path
    spec: Path
    audio: Path
    words: Path
    subs: Path
    video: Path
    log: Path

def job_paths(cfg: Dict[str, Any], job_id: str) -> JobPaths:
    runs_dir = Path(cfg["paths"]["runs_dir"])
    root = runs_dir / job_id
    root.mkdir(parents=True, exist_ok=True)
    return JobPaths(
        root=root,
        script=root / "script.txt",
        spec=root / "spec.json",
        audio=root / "audio.wav",
        words=root / "words.json",
        subs=root / "subs.ass",
        video=root / "final.mp4",
        log=root / "log.txt",
    )

def write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")

def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))

def append_log(path: Path, msg: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    existing = path.read_text(encoding="utf-8") if path.exists() else ""
    path.write_text(existing + msg + "\n", encoding="utf-8")
