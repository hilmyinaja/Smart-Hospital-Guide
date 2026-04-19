from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from database import listen_to_rooms
import threading
from nlp_engine import cari_target_ruangan
from a_star import cari_rute_grid 

# Fungsi callback untuk Theo
def update_theos_graph(data):
    print("Data Room Berubah! Memperbarui matriks grid Theo...")
    # Di sini panggil fungsi pathfinding Theo untuk kalkulasi ulang
    # Theo.update_grid(data)

# Jalankan listener di thread terpisah agar tidak memblokir API
threading.Thread(target=listen_to_rooms, args=(update_theos_graph,), daemon=True).start()

app = FastAPI(title="Smart Hospital Guide API")

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
    return {"message": "Server Smart Hospital Backend Aktif!"}

@app.get("/")
def root():
    return {"status": "Bridge Active & Listening to Firestore"}

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