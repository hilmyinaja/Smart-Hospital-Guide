# waypoint_graph.py
import math

# 0 = Lorong Bebas (Jalur Navigasi)
# 1 = Tembok / Kotak Ruangan (Obstacle)

# Peta rumah sakit ukurannya luas, kita siapkan matriks 100x100
GRID_WIDTH = 100
GRID_HEIGHT = 100
GRID_MAP = [[0 for _ in range(GRID_WIDTH)] for _ in range(GRID_HEIGHT)]

# Mapping ID Ruangan ke letak Grid (X = Kolom, Y = Baris)
RUANGAN_GRID = {} # Ini diisi dinamis oleh main.py / Firebase

# Fungsi Jarak Manhattan (Jauh lebih ringan dari Euclidean untuk sistem Grid)
def hitung_manhattan(x1, y1, x2, y2):
    return abs(x1 - x2) + abs(y1 - y2)