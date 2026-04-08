# waypoint_graph.py
import math

# 0 = Lorong Bebas (Jalur Navigasi)
# 1 = Tembok / Kotak Ruangan (Obstacle)
# Contoh matriks sederhana (misal 10 kolom x 7 baris)
GRID_MAP = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1], # Baris 1: Lorong atas
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1], # Ada blok bangunan di tengah
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1], # Baris 5: Lorong bawah
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
]

# Ambil batas ukuran peta agar A* tidak keluar jalur
GRID_HEIGHT = len(GRID_MAP)
GRID_WIDTH = len(GRID_MAP[0])

# Mapping ID Ruangan ke letak Grid (X = Kolom, Y = Baris)
RUANGAN_GRID = {
    "kiosk_lobi": {"x": 5, "y": 1},
    "customer_service": {"x": 1, "y": 0},
    "radiologi": {"x": 0, "y": 2},
    "operasi": {"x": 0, "y": 4},
    "ugd": {"x": 1, "y": 6},
    "lift": {"x": 5, "y": 6},
    "icu": {"x": 8, "y": 6},
    "kasir": {"x": 5, "y": 0},
    "apotek": {"x": 8, "y": 0},
    "poli_gigi": {"x": 9, "y": 5}
}

# Fungsi Jarak Manhattan (Jauh lebih ringan dari Euclidean untuk sistem Grid)
def hitung_manhattan(x1, y1, x2, y2):
    return abs(x1 - x2) + abs(y1 - y2)