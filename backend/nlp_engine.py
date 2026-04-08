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
    "ugd": ["ugd", "igd", "darurat", "kritis", "emergency", "gawat darurat", "kecelakaan"],
    "apotek": ["apotek", "apotik", "obat", "farmasi", "tebus obat", "ambil obat", "resep"],
    "poli_gigi": ["gigi", "dokter gigi", "sakit gigi", "cabut gigi", "tambal", "kawat gigi"],
    "radiologi": ["radiologi", "rontgen", "xray", "x-ray", "scan", "mri", "USG"],
    "kasir": ["kasir", "bayar", "administrasi", "tagihan", "keuangan", "rawat inap"]
}

# 2. PERSIAPAN KORPUS TF-IDF (Dilakukan sekali saat server nyala)
daftar_id_ruangan = list(DATABASE_RUANGAN.keys())
# Menggabungkan semua sinonim menjadi satu 'dokumen' teks per ruangan
korpus_dokumen = [" ".join(sinonim) for sinonim in DATABASE_RUANGAN.values()]

# Membuat Vectorizer yang menangkap 1 kata (unigram) dan 2 kata sekaligus (bigram)
vectorizer = TfidfVectorizer(ngram_range=(1, 2))
matrix_ruangan = vectorizer.fit_transform(korpus_dokumen)

# 3. FUNGSI PEMBERSIH TEKS
def bersihkan_teks(teks_kotor):
    teks = teks_kotor.lower()
    teks = re.sub(r'[^\w\s]', '', teks)
    
    # Stemming untuk mengembalikan ke kata dasar
    teks_dasar = stemmer.stem(teks)
    
    stopwords = ["mau", "ke", "di", "mana", "tolong", "antar", "cari", "ruang", "tempat", "saya", "ingin", "tanya", "mas", "mbak", "kasih", "tau", "arah", "jalan", "buat"]
    
    kata_akhir = [kata for kata in teks_dasar.split() if kata not in stopwords]
    return " ".join(kata_akhir)

# 4. FUNGSI PENCOCOKAN UTAMA (COSINE SIMILARITY)
def cari_target_ruangan(input_pengunjung):
    input_bersih = bersihkan_teks(input_pengunjung)
    
    # Jika setelah dibersihkan teksnya kosong
    if not input_bersih:
         return {"status": "error", "pesan": "Mohon masukkan tujuan yang lebih spesifik."}

    # Ubah ketikan pengunjung menjadi vektor angka menggunakan pola TF-IDF yang sama
    vektor_input = vectorizer.transform([input_bersih])
    
    # Hitung kedekatan (Cosine Similarity) antara input dengan semua dokumen ruangan
    skor_kemiripan = cosine_similarity(vektor_input, matrix_ruangan)[0]
    
    # Cari indeks dengan skor paling tinggi
    indeks_terbaik = np.argmax(skor_kemiripan)
    skor_tertinggi = skor_kemiripan[indeks_terbaik]
    
    # Konversi skor ke persentase agar mudah dibaca
    persentase_skor = round(skor_tertinggi * 100, 2)

    # Terapkan batas aman (Threshold). Cosine similarity butuh threshold lebih rendah dari Fuzzy.
    if persentase_skor >= 20.0:
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