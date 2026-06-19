export const translateName = (name, lang, nameEn) => {
  if (!name) return "";
  if (lang === 'en' && nameEn) return nameEn;
  
  let translated = name;
  
  // Kamus umum terjemahan instan
  const dict = {
    "Lantai": "Floor",
    "Poli Gigi": "Dental Clinic",
    "Poli Mata": "Eye Clinic",
    "Poli Kandungan": "Obstetrics Clinic",
    "Poli Anak": "Pediatric Clinic",
    "Poli Umum": "General Clinic",
    "Poli Penyakit Dalam": "Internal Medicine",
    "Poli Jantung": "Cardiology Clinic",
    "Poli Syaraf": "Neurology Clinic",
    "Poli Spesialis Lanjutan": "Advanced Specialist Clinic",
    "Poli Spesialis": "Specialist Clinic",
    "Poli": "Clinic",
    "Ruang Operasi": "Operating Room",
    "Ruang Tunggu": "Waiting Room",
    "Ruang Pendaftaran": "Registration Room",
    "Ruang Nakes": "Medical Staff Room",
    "Pendaftaran": "Registration",
    "Registrasi": "Registration",
    "Ruang": "Room",
    "Unit Gawat Darurat (IGD)": "Emergency Room (ER)",
    "Instalasi Gawat Darurat": "Emergency Room (ER)",
    "IGD": "Emergency Room (ER)",
    "UGD": "Emergency Room (ER)",
    "Gawat Darurat": "Emergency",
    "Instalasi Rawat Inap": "Inpatient Installation",
    "Instalasi Radiologi": "Radiology Installation",
    "Rehabilitasi Medik": "Medical Rehabilitation",
    "Medical Check Up (MCU)": "Medical Check Up (MCU)",
    "Pusat Informasi": "Information Center",
    "Apotek": "Pharmacy",
    "Farmasi": "Pharmacy",
    "Kasir & Administrasi": "Cashier & Administration",
    "Kasir": "Cashier",
    "Administrasi": "Administration",
    "Kantin": "Canteen",
    "Toilet": "Toilet",
    "Kamar Mandi": "Toilet",
    "Mushola": "Prayer Room",
    "Masjid": "Mosque",
    "Radiologi": "Radiology",
    "Rawat Inap": "Inpatient Ward",
    "Rawat Jalan": "Outpatient Clinic",
    "Unit Rawat Jalan": "Outpatient Unit",
    "Laboratorium Darah": "Blood Laboratory",
    "Laboratorium": "Laboratory",
    "Lab Cek Darah": "Blood Test Lab",
    "Lab Cek Urine": "Urine Test Lab",
    "Cek Darah": "Blood Test",
    "Cek Urine": "Urine Test",
    "Lab": "Lab",
    "Pintu Masuk": "Entrance",
    "Pintu Keluar": "Exit",
    "Kios Basement": "Basement Kiosk",
    "Kios Baru": "New Kiosk",
    "Kios": "Kiosk",
    "Ruangan Induk": "Main Room",
    "Ruangan Pintu Berlawanan": "Opposing Door Room",
    "Ruangan 1 Pintu": "One Door Room",
    "Ruangan 2 Pintu": "Two Door Room",
    "Ruangan 3 Pintu": "Three Door Room",
    "Ruangan 4 Pintu": "Four Door Room",
    "Tangga Darurat": "Emergency Stairs",
    "Lift": "Lift",
    "Tangga": "Stairs",
    "Taman": "Garden",
    "ICU": "Intensive Care Unit (ICU)",
    "NICU": "Neonatal Intensive Care Unit (NICU)",
    "PICU": "Pediatric Intensive Care Unit (PICU)",
    "Ruang Bersalin": "Maternity Ward",
    "Kamar Mayat": "Mortuary",
    "Ruang Jenazah": "Mortuary",
    "Bank Darah": "Blood Bank",
    "Rekam Medis": "Medical Records",
    "Gizi": "Nutrition",
    "Dapur Umum": "Public Kitchen",
    "Ruang Rapat": "Meeting Room",
    "Gudang": "Storage Room",
    "Ruang Server": "Server Room",
    "Keamanan": "Security",
    "Satpam": "Security Guard",
    "Lobi": "Lobby",
    "Ruang Laktasi": "Lactation Room",
    "ATM Center": "ATM Center",
    "Ruang Menyusui": "Nursing Room",
    "Klinik Spesialis": "Specialist Clinic",
    "Kamar Operasi": "Operating Theater",
    "Ruang Isolasi": "Isolation Room",
    "Fisioterapi": "Physiotherapy",
    "Gudang Farmasi": "Pharmacy Storage",
    "Poli Kulit": "Dermatology Clinic",
    "Poli THT": "ENT Clinic",
    "Poli Paru": "Pulmonology Clinic",
    "Poli Bedah": "Surgery Clinic",
    "Poli Bedah Saraf": "Neurosurgery Clinic",
    "Poli Bedah Tulang": "Orthopedic Clinic",
    "Poli Ortopedi": "Orthopedic Clinic",
    "Poli Jiwa": "Psychiatry Clinic",
    "Poli Psikiatri": "Psychiatry Clinic",
    "Rawat Jalan Eksekutif": "Executive Outpatient Clinic",
    "Poliklinik Eksekutif": "Executive Polyclinic",
    "Hemodialisa": "Hemodialysis",
    "Cuci Darah": "Dialysis",
    "PONEK": "Comprehensive Emergency Obstetric and Newborn Care",
    "VK": "Delivery Room",
    "Perinatologi": "Perinatology",
    "Kebidanan": "Obstetrics",
    "Ruang Bayi": "Nursery",
    "Apotek Rawat Jalan": "Outpatient Pharmacy",
    "Apotek Rawat Inap": "Inpatient Pharmacy",
    "Depo Farmasi": "Pharmacy Depot",
    "Tata Usaha": "Administration Office",
    "Manajemen": "Management Office",
    "Keuangan": "Finance Office",
    "Direksi": "Board of Directors",
    "Ruang Direktur": "Director's Room",
    "Kasir Rawat Inap": "Inpatient Cashier",
    "Kasir Rawat Jalan": "Outpatient Cashier",
    "Ruang Tunggu Pasien": "Patient Waiting Room",
    "Tempat Parkir": "Parking Area",
    "Parkir Motor": "Motorcycle Parking",
    "Parkir Mobil": "Car Parking",
    "Halte": "Bus Stop",
    "Minimarket": "Convenience Store",
    "Bank": "Bank",
    "VIP": "VIP Ward",
    "VVIP": "VVIP Ward",
    "Poliklinik": "Polyclinic"
  };

  const ordinals = ["Zero", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth"];

  if (lang === 'en') {
    // Ubah Lantai X -> First Floor, Second Floor, dll.
    const floorMatch = translated.match(/Lantai\s+(\d+)/i);
    if (floorMatch) {
      const num = parseInt(floorMatch[1], 10);
      if (num > 0 && num < ordinals.length) {
        translated = translated.replace(/Lantai\s+\d+/i, `${ordinals[num]} Floor`);
      } else {
        translated = translated.replace(/Lantai\s+(\d+)/i, `Floor $1`);
      }
    }

    const sortedKeys = Object.keys(dict).sort((a, b) => b.length - a.length);
    if (dict[name]) return dict[name];

    for (const id_word of sortedKeys) {
      const en_word = dict[id_word];
      const escapedWord = id_word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
      translated = translated.replace(regex, en_word);
    }
  } else if (lang === 'id') {
    // Balikkan kamus untuk terjemahan EN -> ID
    const reverseDict = {};
    for (const [id_word, en_word] of Object.entries(dict)) {
      if (!reverseDict[en_word]) reverseDict[en_word] = id_word; 
    }

    // Ubah First Floor -> Lantai 1
    const floorMatchEn = translated.match(/([a-zA-Z]+)\s+Floor/i);
    if (floorMatchEn) {
      const word = floorMatchEn[1];
      const num = ordinals.findIndex(o => o.toLowerCase() === word.toLowerCase());
      if (num > 0) {
        translated = translated.replace(new RegExp(`${word}\\s+Floor`, 'i'), `Lantai ${num}`);
      }
    }
    const floorMatchNum = translated.match(/Floor\s+(\d+)/i);
    if (floorMatchNum) {
      translated = translated.replace(/Floor\s+(\d+)/i, `Lantai $1`);
    }

    const sortedEnKeys = Object.keys(reverseDict).sort((a, b) => b.length - a.length);
    if (reverseDict[name]) return reverseDict[name];

    for (const en_word of sortedEnKeys) {
      const id_word = reverseDict[en_word];
      const escapedWord = en_word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');
      translated = translated.replace(regex, id_word);
    }
  }

  return translated;
};
