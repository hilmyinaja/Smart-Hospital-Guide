import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Stage, Layer, Rect, Text } from "react-konva";
import "./Edit.css";

export default function EditPage() {
  const navigate = useNavigate();
  // State untuk elemen yang sudah diletakkan di peta
  const [placedElements, setPlacedElements] = useState([]);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // "save" atau "cancel"
  const mapRef = useRef(null);
  const transformRef = useRef(null);

  // Mengukur ukuran map container
  useEffect(() => {
    const updateMapSize = () => {
      if (mapRef.current) {
        setMapSize({
          width: mapRef.current.clientWidth,
          height: mapRef.current.clientHeight,
        });
      }
    };

    updateMapSize();
    window.addEventListener("resize", updateMapSize);
    return () => window.removeEventListener("resize", updateMapSize);
  }, []);

  // Fungsi saat elemen di-drop ke area peta
  const handleDrop = (e) => {
    e.preventDefault();
    
    // Mendapatkan posisi cursor relatif ke area map
    const mapRect = mapRef.current.getBoundingClientRect();
    const clientX = e.clientX - mapRect.left;
    const clientY = e.clientY - mapRect.top;

    // Mendapatkan transform state (zoom dan pan)
    if (transformRef.current) {
      const { state } = transformRef.current;
      const { scale, positionX, positionY } = state;
      
      // Konversi koordinat client ke koordinat canvas dengan memperhitungkan zoom dan pan
      const x = (clientX - positionX) / scale;
      const y = (clientY - positionY) / scale;

      // Menambah elemen baru ke state
      setPlacedElements([...placedElements, { id: Date.now(), x, y }]);
    }
  };

  // Fungsi untuk membuka modal konfirmasi
  const openConfirmDialog = (action) => {
    setConfirmAction(action);
    setIsConfirmOpen(true);
  };

  // Fungsi untuk handle "Iya" - kembali ke admin
  const handleConfirmYes = () => {
    setIsConfirmOpen(false);
    setConfirmAction(null);
    navigate("/admin");
  };

  // Fungsi untuk handle "Tidak" - tetap di halaman edit
  const handleConfirmNo = () => {
    setIsConfirmOpen(false);
    setConfirmAction(null);
  };

  return (
    <div className="edit-page-container">
      <header className="edit-page-header">
        <span className="edit-page-logo">Wayfinder</span>
        <div className="edit-page-actions">
          <button className="edit-page-btn cancel" onClick={() => openConfirmDialog("cancel")}>Cancel</button>
          <button className="edit-page-btn save" onClick={() => openConfirmDialog("save")}>Save</button>
        </div>
      </header>

      {/* MODAL KONFIRMASI */}
      {isConfirmOpen && (
        <div className="modal-overlay" onClick={() => handleConfirmNo()}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Verifikasi</h3>
            <p>Apakah Anda yakin ingin {confirmAction === "save" ? "menyimpan" : "membatalkan"} edit?</p>
            <div className="confirm-modal-actions">
              <button className="confirm-btn no" onClick={handleConfirmNo}>Tidak</button>
              <button className="confirm-btn yes" onClick={handleConfirmYes}>Iya</button>
            </div>
          </div>
        </div>
      )}

      <div className="edit-page-layout">
        {/* AREA MAP */}
        <main 
          className="edit-page-map" 
          ref={mapRef}
          onDrop={handleDrop} 
          onDragOver={(e) => e.preventDefault()}
        >
          <TransformWrapper 
            ref={transformRef}
            initialScale={1} 
            minScale={0.5} 
            maxScale={5} 
            centerOnInit={true}
          >
            <TransformComponent wrapperStyle={{ width: "100%", height: "100%", cursor: "grab" }}>
              <div className="map-content" style={{ width: mapSize.width, height: mapSize.height, background: "#726f6f" }}>
                <Stage width={mapSize.width} height={mapSize.height}>
                  <Layer>
                    {placedElements.map((el) => (
                      <Rect
                        key={el.id}
                        x={el.x}
                        y={el.y}
                        width={50}
                        height={50}
                        fill="green"
                        draggable
                      />
                    ))}
                  </Layer>
                </Stage>
              </div>
            </TransformComponent>
          </TransformWrapper>
        </main>

        {/* AREA SIDEBAR */}
        <aside className="edit-page-right-panel">
          <h3>Drag & Drop Elements</h3>
          <div className="dnd-zone">
            <div 
              draggable 
              onDragStart={(e) => e.dataTransfer.setData("text/plain", "new-element")}
              style={{ width: 100, height: 100, background: "#1a73c8", cursor: "grab", marginBottom: 20 }}
            >
              <p style={{ color: "white", padding: 10 }}>Drag Saya</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}