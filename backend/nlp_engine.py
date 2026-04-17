# nlp_engine.py
import re
import numpy as np
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

print("Memuat mesin NLP (Sastrawi & TF-IDF)... Mohon tunggu sebentar.")

# Inisialisasi Sastrawi
factory = StemmerFactory()
stemmer = factory.create_stemmer()

# 1. DATABASE RUANGAN 
DATABASE_RUANGAN = {
    "rawat_inap": [
        "instalasi rawat inap", "rawat inap", "kamar inap", "opname", 
        "kamar pasien", "besuk", "jenguk", "kamar perawatan"
    ],
    "laboratorium": [
        "laboratorium", "lab", "cek darah", "ambil darah", "cek urine", 
        "tes lab", "pengambilan sampel"
    ],
    "radiologi": [
        "radiologi", "rontgen", "x-ray", "mri", "ct scan", "usg", 
        "foto tulang", "sinar x"
    ],
    "rehab_medik": [
        "rehabilitasi medik", "rehab medik", "fisioterapi", "terapi fisik", 
        "pijat saraf", "terapi wicara", "pemulihan motorik"
    ],
    "rawat_jalan": [
        "unit rawat jalan", "rawat jalan", "poli", "poliklinik", 
        "konsultasi dokter", "periksa rutin", "kontrol dokter"
    ],
    "farmasi": [
        "farmasi", "apotek", "ambil obat", "tebus obat", "beli obat", 
        "resep dokter", "pengambilan resep"
    ],
    "mcu": [
        "medical check up", "mcu", "cek kesehatan rutin", 
        "pemeriksaan kesehatan lengkap", "cek body", "screening kesehatan"
    ],
    "igd": [
        "igd", "instalasi gawat darurat", "ugd", "unit gawat darurat", 
        "kecelakaan", "darurat", "kritis", "pendarahan", "segera"
    ],
    "toilet": [
        "toilet", "wc", "kamar mandi", "kamar kecil", "buang air", 
        "buang air kecil", "buang air besar", "restroom", "pipis", "berak"
    ],
    "lift": [
        "lift", "elevator", "naik lantai", "turun lantai", "akses lantai"
    ],
    "tangga": [
        "tangga", "tangga darurat", "naik tangga", "turun tangga"
    ],
    "kasir": [
        "kasir", "bayar", "administrasi", "pembayaran", "tagihan", 
        "bpjs", "keuangan", "pelunasan"
    ],
    "informasi": [
        "pusat informasi", "informasi", "resepsionis", "tanya", 
        "customer service", "cs", "satpam", "pendaftaran"
    ],
    "mushola": [
        "mushola", "masjid", "tempat sholat", "sholat", "ibadah", 
        "prayer room", "ruang doa"
    ],
    "kantin": [
        "kantin", "kafetaria", "tempat makan", "makan", "minum", 
        "food court", "lapar", "haus", "beli makanan"
    ],
    "kiosk_lobi": [
        "kiosk lobi", "lobi utama", "pintu masuk", "pintu depan", 
        "lobby", "ruang tunggu utama"
    ]
}

# 2. FUNGSI PEMBERSIH TEKS 
def bersihkan_teks(teks_kotor):
    teks = teks_kotor.lower()
    teks = re.sub(r'[^\w\s]', '', teks)
    
    teks_dasar = stemmer.stem(teks)
    stopwords = ["mau", "ke", "di", "mana", "tolong", "antar", "cari", "ruang", "tempat", "saya", "ingin", "tanya", "mas", "mbak", "kasih", "tau", "arah", "jalan", "buat"]
    
    kata_akhir = [kata for kata in teks_dasar.split() if kata not in stopwords]
    return " ".join(kata_akhir)

# 3. PERSIAPAN KORPUS TF-IDF 
daftar_id_ruangan = list(DATABASE_RUANGAN.keys())

# Bersihkan juga referensi di database agar seimbang
korpus_dokumen = []
for sinonim in DATABASE_RUANGAN.values():
    teks_gabungan = " ".join(sinonim)
    teks_bersih = bersihkan_teks(teks_gabungan)
    korpus_dokumen.append(teks_bersih)

vectorizer = TfidfVectorizer(ngram_range=(1, 2))
matrix_ruangan = vectorizer.fit_transform(korpus_dokumen)

# 4. FUNGSI PENCOCOKAN UTAMA (COSINE SIMILARITY)
def cari_target_ruangan(input_pengunjung):
    input_bersih = bersihkan_teks(input_pengunjung)
    
    if not input_bersih:
         return {"status": "error", "pesan": "Mohon masukkan tujuan yang lebih spesifik."}

    vektor_input = vectorizer.transform([input_bersih])
    skor_kemiripan = cosine_similarity(vektor_input, matrix_ruangan)[0]
    
    indeks_terbaik = np.argmax(skor_kemiripan)
    skor_tertinggi = skor_kemiripan[indeks_terbaik]
    persentase_skor = round(skor_tertinggi * 100, 2)

    # Cetak ke terminal untuk debugging backend
    print(f"\n[DEBUG NLP] Input Pengunjung : '{input_pengunjung}'")
    print(f"[DEBUG NLP] Teks Bersih        : '{input_bersih}'")
    print(f"[DEBUG NLP] Ruangan Terpilih   : '{daftar_id_ruangan[indeks_terbaik]}'")
    print(f"[DEBUG NLP] Skor Kemiripan     : {persentase_skor}%")

    # Threshold diturunkan ke 10% karena data referensi semakin banyak
    if persentase_skor >= 10.0:
        return {
            "status": "success",
            "target_id": daftar_id_ruangan[indeks_terbaik],
            "confidence_score": f"{persentase_skor}%",
            "teks_hasil_sastrawi": input_bersih
        }
    else:
        return {
            "status": "error",
            "pesan": "Maaf, tujuan tidak dikenali. Silakan coba kata kunci lain."
        }

# --- AREA TESTING LOKAL ---
if __name__ == "__main__":
    print("\n=== SYSTEM READY ===")
    test_cases = [
        "mas tolong arahin buat pembayaran tagihan rawat inap dong",
        "dimana tempat pengobatan?", 
        "mau periksa ke dokter gigi",
        "sus saya mau rontgen dada",
        "kantin dimana ya?" 
    ]

    for teks in test_cases:
        print(f"Input Asli   : '{teks}'")
        hasil = cari_target_ruangan(teks)
        print(f"Output Sistem: {hasil}\n")