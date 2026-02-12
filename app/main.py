from fastapi import FastAPI
from engine.core_io import load_config

app = FastAPI()
cfg = load_config()

@app.get("/health")
def health():
    return {"ok": True, "runs_dir": cfg["paths"]["runs_dir"]}
