import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
from loguru import logger

load_dotenv()

if not firebase_admin._apps:
    cert_path = os.getenv("FIREBASE_CREDENTIALS", "serviceAccountKey.json")
    try:
        cred = credentials.Certificate(cert_path)
        firebase_admin.initialize_app(cred)
        logger.info(f"Firebase initialized using {cert_path}")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")

db = firestore.client()

def listen_to_firestore(callback):
    """Memantau koleksi Rooms dan Kiosks secara real-time"""
    rooms_ref = db.collection('Rooms')
    kiosks_ref = db.collection('Kiosks')

    state = {
        "rooms": [],
        "kiosks": []
    }

    def on_rooms_snapshot(col_snapshot, changes, read_time):
        updated_data = []
        for doc in col_snapshot:
            data = doc.to_dict()
            data['id_dokumen'] = doc.id 
            data['type'] = 'room'
            updated_data.append(data)
        state["rooms"] = updated_data
        callback(state["rooms"] + state["kiosks"])

    def on_kiosks_snapshot(col_snapshot, changes, read_time):
        updated_data = []
        for doc in col_snapshot:
            data = doc.to_dict()
            data['id_dokumen'] = doc.id 
            data['type'] = 'kiosk'
            updated_data.append(data)
        state["kiosks"] = updated_data
        callback(state["rooms"] + state["kiosks"])

    # Mulai mendengarkan perubahan
    rooms_ref.on_snapshot(on_rooms_snapshot)
    kiosks_ref.on_snapshot(on_kiosks_snapshot)