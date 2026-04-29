# a_star.py
import heapq
from waypoint_graph import GRID_MAP, GRID_WIDTH, GRID_HEIGHT, RUANGAN_GRID, hitung_manhattan

def cari_rute_grid(start_id, target_id):
    if start_id not in RUANGAN_GRID or target_id not in RUANGAN_GRID:
        return {"status": "error", "pesan": "Titik awal atau tujuan tidak valid di peta."}

    start_node = RUANGAN_GRID[start_id]
    target_node = RUANGAN_GRID[target_id]
    
    start_coord = (start_node["x"], start_node["y"])
    target_coord = (target_node["x"], target_node["y"])

    # Priority Queue untuk F-Cost (Biaya Total)
    open_set = []
    heapq.heappush(open_set, (0, start_coord))
    
    came_from = {}
    
    # G-Cost (Jarak Aktual)
    g_score = {start_coord: 0}
    
    # F-Cost = G-Cost + H-Cost (Manhattan)
    f_score = {start_coord: hitung_manhattan(start_coord[0], start_coord[1], target_coord[0], target_coord[1])}
    
    while open_set:
        current_f, current = heapq.heappop(open_set)
        
        # Jika grid saat ini adalah grid tujuan
        if current == target_coord:
            jalur = []
            while current in came_from:
                jalur.append({"x": current[0], "y": current[1]})
                current = came_from[current]
            jalur.append({"x": start_coord[0], "y": start_coord[1]})
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
                
                # Syarat bisa dilewati: Grid bernilai 0 (lorong) ATAU grid tersebut adalah tujuan akhir 
                if GRID_MAP[ny][nx] == 0 or (nx, ny) == target_coord:
                    
                    # Biaya pindah antar petak grid selalu 1
                    tentative_g = g_score[current] + 1 
                    
                    if (nx, ny) not in g_score or tentative_g < g_score[(nx, ny)]:
                        came_from[(nx, ny)] = current
                        g_score[(nx, ny)] = tentative_g
                        f_score[(nx, ny)] = tentative_g + hitung_manhattan(nx, ny, target_coord[0], target_coord[1])
                        
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