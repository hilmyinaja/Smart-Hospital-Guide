# database.py
import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

def listen_to_firestore(callback):
    """Memantau koleksi Rooms dan Kiosks secara real-time"""
    rooms_ref = db.collection('Rooms')
    kiosks_ref = db.collection('Kiosks')

    def on_snapshot(col_snapshot, changes, read_time):
        updated_data = []
        for doc in col_snapshot:
            data = doc.to_dict()
            data['id_dokumen'] = doc.id 
            updated_data.append(data)
        callback(updated_data)

    # Mulai mendengarkan perubahan
    rooms_ref.on_snapshot(on_snapshot)
    kiosks_ref.on_snapshot(on_snapshot)