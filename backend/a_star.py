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
            
            nav_text = generate_navigation_text(jalur, start_id, target_id)
            
            return {
                "status": "success",
                "jalur_grid": jalur,
                "teks_navigasi": nav_text
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

def get_adjacent_room(x, y, exclude_ids=None):
    if exclude_ids is None:
        exclude_ids = set()
    
    for r_id, room in RUANGAN_GRID.items():
        if r_id in exclude_ids:
            continue
            
        rx = room["x"]
        ry = room["y"]
        rw = room.get("w", 1)
        rh = room.get("h", 1)
        
        # Cek apakah (x, y) berada dalam bounding box ruangan diperbesar 1 petak
        if (rx - 1 <= x <= rx + rw) and (ry - 1 <= y <= ry + rh):
            # Hindari Kiosk (kiosk_id biasa berawalan K) atau kita filter dari nama
            if room.get("name") and "Kiosk" not in room.get("name", ""):
                return room["name"]
    return None

def generate_navigation_text(path, start_id, target_id):
    if not path or len(path) < 2:
        return [{"teks": "Anda sudah sampai di tujuan.", "index_akhir": len(path) - 1 if path else 0}]

    start_name = RUANGAN_GRID.get(start_id, {}).get("name", "Kiosk")
    target_name = RUANGAN_GRID.get(target_id, {}).get("name", "Tujuan")
    langkah = []
    current_dir = None

    def get_direction(p1, p2):
        if p2["x"] > p1["x"]: return 'Kanan'
        if p2["x"] < p1["x"]: return 'Kiri'
        if p2["y"] > p1["y"]: return 'Bawah'
        if p2["y"] < p1["y"]: return 'Atas'
        return None

    def get_turn(prev_dir, next_dir):
        if prev_dir == next_dir: return None
        turns = {
            'Atas': {'Kanan': 'Kanan', 'Kiri': 'Kiri'},
            'Bawah': {'Kanan': 'Kiri', 'Kiri': 'Kanan'},
            'Kanan': {'Atas': 'Kiri', 'Bawah': 'Kanan'},
            'Kiri': {'Atas': 'Kanan', 'Bawah': 'Kiri'}
        }
        return turns.get(prev_dir, {}).get(next_dir, 'Berbalik Arah')

    exclude_ids = {start_id, target_id}

    for i in range(len(path) - 1):
        p1 = path[i]
        p2 = path[i + 1]
        dir = get_direction(p1, p2)

        if not current_dir:
            current_dir = dir
        elif current_dir != dir:
            turn = get_turn(current_dir, dir)
            adj_room = get_adjacent_room(p1["x"], p1["y"], exclude_ids)
            
            if len(langkah) == 0:
                if adj_room:
                    teks = f"Dari {start_name}, berjalanlah ke arah {current_dir} sampai ketemu {adj_room}, lalu bersiap belok {turn}."
                else:
                    teks = f"Dari {start_name}, berjalanlah ke arah {current_dir} sampai persimpangan, lalu bersiap belok {turn}."
            else:
                if adj_room:
                    teks = f"Setelah belok, lurus terus sampai ketemu {adj_room}, lalu bersiap belok {turn}."
                else:
                    teks = f"Setelah belok, lurus terus sampai persimpangan, lalu bersiap belok {turn}."
            
            langkah.append({
                "teks": teks,
                "index_akhir": i
            })
            
            current_dir = dir

    if len(langkah) == 0:
        teks_akhir = f"Dari {start_name}, berjalanlah ke arah {current_dir} dan Anda akan sampai di {target_name}."
    else:
        teks_akhir = f"Setelah belok, lurus terus dan Anda akan sampai di {target_name}."

    langkah.append({
        "teks": teks_akhir,
        "index_akhir": len(path) - 1
    })

    return langkah

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