import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

def listen_to_rooms(callback):
    """
    Fungsi ini akan memantau koleksi 'Rooms'.
    drag-and-drop di UI: fungsi akan langsung terpicu.
    """
    rooms_ref = db.collection('Rooms')

    def on_snapshot(col_snapshot, changes, read_time):
        updated_rooms = []
        for doc in col_snapshot:
            updated_rooms.append(doc.to_dict())
        # Kirim data terbaru ke fungsi update milik Theo
        callback(updated_rooms)

    # Mulai mendengarkan perubahan secara real-time
    rooms_ref.on_snapshot(on_snapshot)