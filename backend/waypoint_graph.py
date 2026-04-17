# waypoint_graph.py
import math

# 0 = Lorong Bebas (Jalur Navigasi)
# 1 = Tembok / Kotak Ruangan (Obstacle)
# Contoh matriks sederhana (misal 10 kolom x 7 baris)
GRID_MAP = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1], # Baris 1: Lorong utama (atas)
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1], # Blok bangunan di tengah
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1], 
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1], 
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1], # Baris 5: Lorong utama (bawah)
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
]

# Ambil batas ukuran peta agar A* tidak keluar jalur
GRID_HEIGHT = len(GRID_MAP)
GRID_WIDTH = len(GRID_MAP[0])

# Mapping ID Ruangan ke letak Grid (X = Kolom, Y = Baris)
RUANGAN_GRID = {
    # Fasilitas Umum & Lobi
    "kiosk_lobi": {"x": 5, "y": 1},   
    "informasi": {"x": 6, "y": 0},    
    "kasir": {"x": 4, "y": 0},        
    "toilet": {"x": 9, "y": 1},       
    "lift": {"x": 1, "y": 0},         
    "tangga": {"x": 8, "y": 6},       
    "mushola": {"x": 0, "y": 5},      
    "kantin": {"x": 9, "y": 5},       

    # Fasilitas Medis 
    "igd": {"x": 1, "y": 6},          
    "radiologi": {"x": 0, "y": 2},    
    "laboratorium": {"x": 0, "y": 4}, 
    "farmasi": {"x": 8, "y": 0},      
    "rawat_jalan": {"x": 9, "y": 2},  
    "rehab_medik": {"x": 9, "y": 4},  
    "rawat_inap": {"x": 5, "y": 6},   
    "mcu": {"x": 3, "y": 6}           
}

# Fungsi Jarak Manhattan (Jauh lebih ringan dari Euclidean untuk sistem Grid)
def hitung_manhattan(x1, y1, x2, y2):
    return abs(x1 - x2) + abs(y1 - y2)