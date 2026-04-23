# nlp_engine.py
import re
import numpy as np
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

print("Memuat mesin NLP (Sastrawi & TF-IDF)...")

factory = StemmerFactory()
stemmer = factory.create_stemmer()

# Variabel global kosong yang akan diisi oleh Firebase nanti
DATABASE_RUANGAN = {}
daftar_nama_ruangan = []
matrix_ruangan = None
vectorizer = TfidfVectorizer(ngram_range=(1, 2))

# 1. FUNGSI PEMBERSIH TEKS
def bersihkan_teks(teks_kotor):
    teks = teks_kotor.lower()
    teks = re.sub(r'[^\w\s]', '', teks)
    teks_dasar = stemmer.stem(teks)
    stopwords = ["mau", "ke", "di", "mana", "tolong", "antar", "cari", "ruang", "tempat", "saya", "ingin", "tanya", "mas", "mbak", "kasih", "tau", "arah", "jalan", "buat"]
    kata_akhir = [kata for kata in teks_dasar.split() if kata not in stopwords]
    return " ".join(kata_akhir)

# 2. FUNGSI PELATIHAN OTOMATIS 
def latih_ulang_nlp(data_kamus_baru):
    global DATABASE_RUANGAN, daftar_nama_ruangan, matrix_ruangan, vectorizer
    
    DATABASE_RUANGAN = data_kamus_baru
    daftar_nama_ruangan = list(DATABASE_RUANGAN.keys())
    
    if not DATABASE_RUANGAN:
        print("[NLP] Peringatan: Database kosong, tidak ada yang dilatih.")
        return

    korpus_dokumen = []
    for sinonim in DATABASE_RUANGAN.values():
        teks_gabungan = " ".join(sinonim)
        korpus_dokumen.append(bersihkan_teks(teks_gabungan))

    # Latih ulang model TF-IDF dengan data terbaru dari Firebase
    matrix_ruangan = vectorizer.fit_transform(korpus_dokumen)
    print(f"[NLP] Model berhasil dilatih ulang! ({len(daftar_nama_ruangan)} Ruangan Aktif)")

# 3. FUNGSI PENCOCOKAN UTAMA    
def cari_target_ruangan(input_pengunjung):
    # Cegah error jika database Firebase belum masuk
    if matrix_ruangan is None or not daftar_nama_ruangan:
        return {"status": "error", "pesan": "Sistem sedang memuat data peta, mohon tunggu."}

    input_bersih = bersihkan_teks(input_pengunjung)
    if not input_bersih:
         return {"status": "error", "pesan": "Mohon masukkan tujuan yang lebih spesifik."}

    vektor_input = vectorizer.transform([input_bersih])
    skor_kemiripan = cosine_similarity(vektor_input, matrix_ruangan)[0]
    
    indeks_terbaik = np.argmax(skor_kemiripan)
    persentase_skor = round(skor_kemiripan[indeks_terbaik] * 100, 2)

    print(f"\n[DEBUG NLP] Input  : '{input_pengunjung}' -> Skor: {persentase_skor}%")

    if persentase_skor >= 10.0:
        return {
            "status": "success",
            "target_id": daftar_nama_ruangan[indeks_terbaik],
            "confidence_score": f"{persentase_skor}%",
            "teks_hasil_sastrawi": input_bersih
        }
    else:
        return {"status": "error", "pesan": "Maaf, tujuan tidak dikenali."}