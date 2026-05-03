# a_star.py
import heapq
from waypoint_graph import GRID_MAP, GRID_WIDTH, GRID_HEIGHT, RUANGAN_GRID, hitung_manhattan

def cari_rute_grid(start_id, target_id):
    if start_id not in RUANGAN_GRID or target_id not in RUANGAN_GRID:
        return {"status": "error", "pesan": "Titik awal atau tujuan tidak valid di peta."}

    start_node = RUANGAN_GRID[start_id]
    target_node = RUANGAN_GRID[target_id]
    
    # Kumpulkan koordinat tujuan
    target_coords = set()
    
    # Jika ruangan memiliki titik pintu spesifik, gunakan titik itu saja
    if "door_x" in target_node and "door_y" in target_node:
        # Pintu dijamin berada di lorong (bernilai 0) yang menempel ke ruangan
        target_coords.add((target_node["door_x"], target_node["door_y"]))
    else:
        # Fallback: seluruh petak pinggiran ruangan
        for dy in range(target_node.get("h", 1)):
            for dx in range(target_node.get("w", 1)):
                target_coords.add((target_node["x"] + dx, target_node["y"] + dy))

    # Priority Queue untuk F-Cost (Biaya Total)
    open_set = []
    
    came_from = {}
    g_score = {}
    f_score = {}
    
    # Masukkan SEMUA titik dari kiosk (start_node) ke open_set dengan cost awal 0
    for dy in range(start_node.get("h", 1)):
        for dx in range(start_node.get("w", 1)):
            sx = start_node["x"] + dx
            sy = start_node["y"] + dy
            
            g_score[(sx, sy)] = 0
            # Estimasi h-cost sederhana ke titik origin target (atau titik pintunya)
            tx = target_node.get("door_x", target_node["x"])
            ty = target_node.get("door_y", target_node["y"])
            h = hitung_manhattan(sx, sy, tx, ty)
            f_score[(sx, sy)] = h
            heapq.heappush(open_set, (h, (sx, sy)))
            
    while open_set:
        current_f, current = heapq.heappop(open_set)
        
        # Jika grid saat ini menyentuh area ruangan tujuan
        if current in target_coords:
            jalur = []
            curr = current
            while curr in came_from:
                jalur.append({"x": curr[0], "y": curr[1]})
                curr = came_from[curr]
            jalur.append({"x": curr[0], "y": curr[1]}) # Tambahkan titik pinggir kiosk yang menjadi start point
            jalur.reverse() # Urutkan dari awal ke akhir
            
            return {
                "status": "success",
                "jalur_grid": jalur
            }
            
        cx, cy = current
        
        # Cek 4 arah mata angin (Tetangga Atas, Bawah, Kiri, Kanan)
        tetangga_list = [(cx, cy-1), (cx, cy+1), (cx-1, cy), (cx+1, cy)]
        
        for nx, ny in tetangga_list:
            # Pastikan indeks tidak keluar dari ukuran matriks (out of bounds)
            if 0 <= nx < GRID_WIDTH and 0 <= ny < GRID_HEIGHT:
                
                # Syarat bisa dilewati: Grid bernilai 0 (lorong) ATAU grid tersebut masuk dalam target
                # Ini menghindari A* menembus ruangan lain (yang bernilai 1)
                if GRID_MAP[ny][nx] == 0 or (nx, ny) in target_coords:
                    
                    # Biaya pindah antar petak grid selalu 1
                    tentative_g = g_score[current] + 1 
                    
                    if (nx, ny) not in g_score or tentative_g < g_score[(nx, ny)]:
                        came_from[(nx, ny)] = current
                        g_score[(nx, ny)] = tentative_g
                        tx = target_node.get("door_x", target_node["x"])
                        ty = target_node.get("door_y", target_node["y"])
                        f_score[(nx, ny)] = tentative_g + hitung_manhattan(nx, ny, tx, ty)
                        
                        heapq.heappush(open_set, (f_score[(nx, ny)], (nx, ny)))
                        
    return {"status": "error", "pesan": "Rute buntu. Tidak ada jalan menuju tujuan."}

# --- TESTING LOKAL ---
if __name__ == "__main__":
    print("\n=== MENGUJI A* GRID MODE ===")
    hasil = cari_rute_grid("kiosk_lobi", "igd")
    if hasil["status"] == "success":
        print(f"Rute ditemukan! Melewati {len(hasil['jalur_grid'])} petak:")
        for petak in hasil['jalur_grid']:
            print(f" -> [X: {petak['x']}, Y: {petak['y']}]")
    else:
        print(hasil["pesan"])