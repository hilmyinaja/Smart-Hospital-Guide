# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from database import db, listen_to_firestore 
import threading
import waypoint_graph
from nlp_engine import cari_target_ruangan
from a_star import cari_rute_grid
from nlp_engine import cari_target_ruangan, latih_ulang_nlp

# Model data untuk validasi input ruangan
class RoomModel(BaseModel):
    name: str
    grid_x: int
    grid_y: int
    grid_width: int = 1
    grid_height: int = 1
    keywords: list[str] = []

# Fungsi jembatan ke firestore
def sinkronisasi_peta(data):
    """Mengupdate koordinat dan melatih ulang NLP saat database berubah"""
    print("\n[FIREBASE] Pembaruan data terdeteksi...")
    
    data_nlp_baru = {} # Menampung kamus sementara untuk NLP

    for item in data:
        room_name = item.get("name") 
        
        if room_name and "grid_x" in item and "grid_y" in item:
            # 1. Update Memori A*
            waypoint_graph.RUANGAN_GRID[room_name] = {
                "x": item["grid_x"],
                "y": item["grid_y"]
            }
            
            # 2. Tarik keywords dari Firebase, jika kosong gunakan namanya sendiri
            kata_kunci = item.get("keywords", [])
            kata_kunci.append(room_name) # Pastikan nama aslinya selalu masuk hitungan
            
            data_nlp_baru[room_name] = kata_kunci
            print(f" -> '{room_name}' diupdate (X:{item['grid_x']}, Y:{item['grid_y']})")

    # 3. Eksekusi Pelatihan Ulang NLP
    latih_ulang_nlp(data_nlp_baru)

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

# --- ENDPOINT NAVIGASI ---

@app.get("/")
def home():
    return {
        "message": "Server Smart Hospital Backend Aktif!",
        "status": "Bridge Active & Listening to Firestore"
    }

@app.post("/api/route")
def dapatkan_rute(request: RequestRute):
    hasil_nlp = cari_target_ruangan(request.teks_pencarian)
    if hasil_nlp["status"] == "error":
        raise HTTPException(status_code=400, detail=hasil_nlp["pesan"])
        
    target_id = hasil_nlp["target_id"]
    
    hasil_rute = cari_rute_grid(request.start_node_id, target_id)
    if hasil_rute["status"] == "error":
         raise HTTPException(status_code=400, detail=hasil_rute["pesan"])
         
    return {
        "status": "success",
        "pesan": "Rute grid berhasil ditemukan",
        "data_target": {
            "id_ruangan": target_id,
            "confidence_nlp": hasil_nlp["confidence_score"]
        },
        "jalur_koordinat": hasil_rute["jalur_grid"]
    }

# --- ENDPOINT ADMIN (CRUD) ---

# 1. TAMBAH/UPDATE RUANGAN (POST)
@app.post("/api/rooms/{room_id}")
def simpan_ruangan(room_id: str, room: RoomModel):
    try:
        # Menggunakan .set() untuk membuat atau menimpa dokumen berdasarkan ID (misal: R001)
        db.collection('Rooms').document(room_id).set(room.dict())
        return {"status": "success", "message": f"Ruangan {room_id} berhasil disimpan."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan data: {str(e)}")

# 2. EDIT KOORDINAT/NAMA (PATCH)
@app.patch("/api/rooms/{room_id}")
def update_ruangan(room_id: str, updates: dict):
    try:
        # Digunakan untuk update parsial, misal saat drag-and-drop hanya koordinat yang berubah
        db.collection('Rooms').document(room_id).update(updates)
        return {"status": "success", "message": f"Data {room_id} berhasil diperbarui."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memperbarui data: {str(e)}")

# 3. HAPUS RUANGAN (DELETE)
@app.delete("/api/rooms/{room_id}")
def hapus_ruangan(room_id: str):
    try:
        db.collection('Rooms').document(room_id).delete()
        return {"status": "success", "message": f"Ruangan {room_id} berhasil dihapus."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menghapus data: {str(e)}")