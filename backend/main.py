# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from nlp_engine import cari_target_ruangan
from a_star import cari_rute_grid 

app = FastAPI(title="Smart Hospital Guide API (Grid Edition)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RequestRute(BaseModel):
    start_node_id: str
    teks_pencarian: str

@app.get("/")
def home():
    return {"message": "Server Smart Hospital Backend (Grid Mode) Aktif!"}

@app.post("/api/route")
def dapatkan_rute(request: RequestRute):
    # 1. NLP Memproses Teks
    hasil_nlp = cari_target_ruangan(request.teks_pencarian)
    if hasil_nlp["status"] == "error":
        raise HTTPException(status_code=400, detail=hasil_nlp["pesan"])
        
    target_id = hasil_nlp["target_id"]
    
    # 2. Algoritma A* Grid Mencari Rute
    hasil_rute = cari_rute_grid(request.start_node_id, target_id)
    if hasil_rute["status"] == "error":
         raise HTTPException(status_code=400, detail=hasil_rute["pesan"])
         
    # 3. Kembalikan Indeks Grid ke React
    return {
        "status": "success",
        "pesan": "Rute grid berhasil ditemukan",
        "data_target": {
            "id_ruangan": target_id,
            "confidence_nlp": hasil_nlp["confidence_score"]
        },
        "jalur_koordinat": hasil_rute["jalur_grid"]
    }