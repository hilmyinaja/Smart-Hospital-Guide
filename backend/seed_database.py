# Upload ke database Firestore otomatis

import firebase_admin
from firebase_admin import credentials, firestore

# 1. Hubungkan ke Firebase
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# 2. Masukkan data JSON di atas ke sini (saya potong agar singkat)
data_rooms = [
  {
    "id": "R001",
    "name": "Unit Gawat Darurat (IGD)",
    "grid_x": 1,
    "grid_y": 5,
    "grid_width": 2,
    "grid_height": 2
  },
  {
    "id": "R002",
    "name": "Instalasi Rawat Inap",
    "grid_x": 5,
    "grid_y": 5,
    "grid_width": 3,
    "grid_height": 2
  },
  {
    "id": "R003",
    "name": "Laboratorium Klinikal",
    "grid_x": 1,
    "grid_y": 2,
    "grid_width": 2,
    "grid_height": 1
  },
  {
    "id": "R004",
    "name": "Instalasi Radiologi",
    "grid_x": 1,
    "grid_y": 3,
    "grid_width": 2,
    "grid_height": 1
  },
  {
    "id": "R005",
    "name": "Rehabilitasi Medik",
    "grid_x": 8,
    "grid_y": 4,
    "grid_width": 2,
    "grid_height": 1
  },
  {
    "id": "R006",
    "name": "Unit Rawat Jalan (Poli)",
    "grid_x": 8,
    "grid_y": 2,
    "grid_width": 2,
    "grid_height": 1
  },
  {
    "id": "R007",
    "name": "Instalasi Farmasi",
    "grid_x": 8,
    "grid_y": 1,
    "grid_width": 2,
    "grid_height": 1
  },
  {
    "id": "R008",
    "name": "Medical Check Up (MCU)",
    "grid_x": 3,
    "grid_y": 5,
    "grid_width": 2,
    "grid_height": 2
  },
  {
    "id": "R009",
    "name": "Kasir & Administrasi",
    "grid_x": 4,
    "grid_y": 1,
    "grid_width": 1,
    "grid_height": 1
  },
  {
    "id": "R010",
    "name": "Pusat Informasi",
    "grid_x": 6,
    "grid_y": 1,
    "grid_width": 1,
    "grid_height": 1
  },
  {
    "id": "R011",
    "name": "Mushola",
    "grid_x": 2,
    "grid_y": 5,
    "grid_width": 1,
    "grid_height": 1
  },
  {
    "id": "R012",
    "name": "Kantin Utama",
    "grid_x": 7,
    "grid_y": 5,
    "grid_width": 2,
    "grid_height": 1
  },
  {
    "id": "R013",
    "name": "Toilet Awam",
    "grid_x": 8,
    "grid_y": 5,
    "grid_width": 1,
    "grid_height": 1
  },
  {
    "id": "R014",
    "name": "Lift Penumpang",
    "grid_x": 1,
    "grid_y": 1,
    "grid_width": 1,
    "grid_height": 1
  },
  {
    "id": "R015",
    "name": "Tangga Darurat",
    "grid_x": 8,
    "grid_y": 3,
    "grid_width": 1,
    "grid_height": 1
  }
]

# 3. Tembak ke Firestore otomatis!
print("Memulai upload data ke Firebase...")
for ruang in data_rooms:
    # Menggunakan set() dengan nama dokumen sesuai ID (cth: R001)
    db.collection('Rooms').document(ruang['id']).set(ruang)
    print(f"Berhasil mengunggah: {ruang['id']} - {ruang['name']}")

print("Selesai! Silakan cek dashboard Firebase Hilmy.")