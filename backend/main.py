# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from database import listen_to_firestore 
import threading
import waypoint_graph
from nlp_engine import cari_target_ruangan
from a_star import cari_rute_grid

# Fungsi jembatan ke firestore
def sinkronisasi_peta(data):
    """Mengupdate koordinat di memori lokal saat database berubah"""
    print("\n[FIREBASE] Pembaruan data terdeteksi...")
    for item in data:
        # AMBIL NAMA RUANGAN SEBAGAI KUNCI, BUKAN ID DOKUMEN
        room_name = item.get("name") 
        
        if room_name and "grid_x" in item and "grid_y" in item:
            # Simpan ke waypoint_graph berdasarkan namanya
            waypoint_graph.RUANGAN_GRID[room_name] = {
                "x": item["grid_x"],
                "y": item["grid_y"]
            }
            print(f" -> '{room_name}' kini berada di posisi (X: {item['grid_x']}, Y: {item['grid_y']})")

# Jalankan listener di thread terpisah agar tidak mengganggu FastAPI
threading.Thread(target=listen_to_firestore, args=(sinkronisasi_peta,), daemon=True).start()
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

# Hapus salah satu @app.get("/"), sisakan satu saja yang rapi
@app.get("/")
def home():
    return {
        "message": "Server Smart Hospital Backend Aktif!",
        "status": "Bridge Active & Listening to Firestore"
    }

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