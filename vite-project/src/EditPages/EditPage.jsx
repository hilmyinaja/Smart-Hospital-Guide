import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Stage, Layer, Rect, Text, Line, Transformer } from "react-konva";

// Import Firebase SDK untuk koneksi Database
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase"; // Pastikan path ini sesuai dengan lokasi file firebase.js kamu

import "./Edit.css";

// Komponen khusus Ruangan
const RoomShape = ({ shapeProps, isSelected, onSelect, onChange, setIsDraggingElement, GRID_SIZE }) => {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const handleRename = () => {
    const newName = window.prompt("Masukkan Nama Ruangan:", shapeProps.name || "");
    if (newName !== null) {
      onChange({
        ...shapeProps,
        name: newName,
      });
    }
  };

  const dynamicFontSize = Math.max(10, Math.min(shapeProps.width / 5, shapeProps.height / 2.5));

  return (
    <React.Fragment>
      <Rect
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleRename}
        ref={shapeRef}
        {...shapeProps}
        draggable
        stroke="#1b5e20"
        strokeWidth={2}
        onDragStart={() => setIsDraggingElement(true)}
        onTransformStart={() => setIsDraggingElement(true)}
        dragBoundFunc={(pos) => {
          return {
            x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE,
          };
        }}
        onDragEnd={(e) => {
          setIsDraggingElement(false);
          onChange({
            ...shapeProps,
            x: Math.round(e.target.x() / GRID_SIZE) * GRID_SIZE,
            y: Math.round(e.target.y() / GRID_SIZE) * GRID_SIZE,
          });
        }}
        onTransformEnd={(e) => {
          setIsDraggingElement(false);
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            x: Math.round(node.x() / GRID_SIZE) * GRID_SIZE,
            y: Math.round(node.y() / GRID_SIZE) * GRID_SIZE,
            width: Math.max(GRID_SIZE, Math.round((node.width() * scaleX) / GRID_SIZE) * GRID_SIZE),
            height: Math.max(GRID_SIZE, Math.round((node.height() * scaleY) / GRID_SIZE) * GRID_SIZE),
          });
        }}
      />
      <Text
        text={shapeProps.name || "Tanpa Nama"}
        x={shapeProps.x}
        y={shapeProps.y}
        width={shapeProps.width}
        height={shapeProps.height}
        fontSize={dynamicFontSize}
        fontStyle="bold"
        fill="#1b5e20"
        align="center"
        verticalAlign="middle"
        padding={5}
        listening={false}
        wrap="char"
        ellipsis={true}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < GRID_SIZE || newBox.height < GRID_SIZE) return oldBox;
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

export default function EditPage() {
  const navigate = useNavigate();
  const [placedElements, setPlacedElements] = useState([]);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [deletedElements, setDeletedElements] = useState([]);

  const mapRef = useRef(null);
  const transformRef = useRef(null);
  const GRID_SIZE = 25;

  useEffect(() => {
    const fetchRoomsData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Rooms"));
        const loadedRooms = [];
        
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedRooms.push({
            id: docSnap.id,
            name: data.name || "Tanpa Nama",
            x: (data.grid_x || 0) * GRID_SIZE,
            y: (data.grid_y || 0) * GRID_SIZE,
            width: (data.grid_width || 1) * GRID_SIZE,
            height: (data.grid_height || 1) * GRID_SIZE,
          });
        });
        
        setPlacedElements(loadedRooms);
      } catch (error) {
        console.error("Gagal mengambil data dari Firestore:", error);
      }
    };

    fetchRoomsData();
  }, []);

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

  const deleteSelectedElement = () => {
    if (selectedId) {
      setDeletedElements((prev) => [...prev, selectedId]);
      setPlacedElements(placedElements.filter((el) => el.id !== selectedId));
      setSelectedId(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        deleteSelectedElement();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, placedElements]);

  const checkDeselect = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.attrs.id === "bg-grid";
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  };

  // Hilmy Fix: Fungsi pembantu untuk membuat ID incremental (R001, R002, dst)
  const generateNextRoomId = () => {
    let maxNumber = 0;
    
    // Cari angka tertinggi dari ID yang sudah ada di state
    placedElements.forEach((el) => {
      if (el.id.startsWith('R')) {
        // Ambil angka dari R015 menjadi 15
        const numberPart = parseInt(el.id.substring(1), 10);
        if (!isNaN(numberPart) && numberPart > maxNumber) {
          maxNumber = numberPart;
        }
      }
    });

    // Tambah 1 dari yang tertinggi
    const nextNumber = maxNumber + 1;
    
    // Format agar selalu tiga digit (contoh: 1 -> 001, 16 -> 016, 105 -> 105)
    const paddedNumber = String(nextNumber).padStart(3, '0');
    
    return `R${paddedNumber}`;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const mapRect = mapRef.current.getBoundingClientRect();
    const clientX = e.clientX - mapRect.left;
    const clientY = e.clientY - mapRect.top;

    if (transformRef.current) {
      const { state } = transformRef.current;
      const { scale, positionX, positionY } = state;
      const x = (clientX - positionX) / scale;
      const y = (clientY - positionY) / scale;
      const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;

      // Hilmy Fix: Panggil fungsi generate ID
      const newId = generateNextRoomId();
      
      setPlacedElements([...placedElements, {
        id: newId,
        x: snappedX,
        y: snappedY,
        width: GRID_SIZE * 4,
        height: GRID_SIZE * 2,
        name: "Ruangan Baru"
      }]);
      setSelectedId(newId);
    }
  };

  const openConfirmDialog = (action) => {
    setConfirmAction(action);
    setIsConfirmOpen(true);
  };

  const handleConfirmYes = async () => {
    setIsConfirmOpen(false);
    
    if (confirmAction === "save") {
      try {
        const batch = writeBatch(db);

        deletedElements.forEach((id) => {
          const docRef = doc(db, "Rooms", id);
          batch.delete(docRef);
        });

        placedElements.forEach((el) => {
          const docRef = doc(db, "Rooms", el.id.toString());
          
          batch.set(docRef, {
            id: el.id.toString(),
            name: el.name,
            grid_x: Math.round(el.x / GRID_SIZE),
            grid_y: Math.round(el.y / GRID_SIZE),
            grid_width: Math.round(el.width / GRID_SIZE),
            grid_height: Math.round(el.height / GRID_SIZE),
          }, { merge: true });
        });

        await batch.commit(); 
        alert("Denah berhasil disimpan ke Database!");
        navigate("/admin");
        
      } catch (error) {
        console.error("Gagal menyimpan ke database:", error);
        alert("Gagal menyimpan data, periksa koneksi atau aturan Firebase Anda.");
      }
    } else {
      navigate("/admin");
    }
    
    setConfirmAction(null);
  };

  const handleConfirmNo = () => {
    setIsConfirmOpen(false);
    setConfirmAction(null);
  };

  const drawGrid = () => {
    const lines = [];
    const { width, height } = mapSize;
    for (let i = 0; i < width / GRID_SIZE; i++) {
      lines.push(<Line key={`v${i}`} points={[Math.round(i * GRID_SIZE), 0, Math.round(i * GRID_SIZE), height]} stroke="#9e9e9e" strokeWidth={1} />);
    }
    for (let j = 0; j < height / GRID_SIZE; j++) {
      lines.push(<Line key={`h${j}`} points={[0, Math.round(j * GRID_SIZE), width, Math.round(j * GRID_SIZE)]} stroke="#9e9e9e" strokeWidth={1} />);
    }
    return lines;
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

      {isConfirmOpen && (
        <div className="modal-overlay" onClick={handleConfirmNo}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Verifikasi</h3>
            <p>Apakah Anda yakin ingin {confirmAction === "save" ? "menyimpan denah ini ke database" : "membatalkan"} edit?</p>
            <div className="confirm-modal-actions">
              <button className="confirm-btn no" onClick={handleConfirmNo}>Tidak</button>
              <button className="confirm-btn yes" onClick={handleConfirmYes}>Iya</button>
            </div>
          </div>
        </div>
      )}

      <div className="edit-page-layout">
        <main className="edit-page-map" ref={mapRef} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
          <TransformWrapper ref={transformRef} initialScale={1} minScale={0.5} maxScale={5} centerOnInit={true} panning={{ disabled: isDraggingElement }}>
            <TransformComponent wrapperStyle={{ width: "100%", height: "100%", cursor: isDraggingElement ? "grabbing" : "grab" }}>
              <div className="map-content" style={{ width: mapSize.width, height: mapSize.height, background: "#e0e0e0" }}>
                <Stage width={mapSize.width} height={mapSize.height} onMouseDown={checkDeselect} onTouchStart={checkDeselect}>
                  <Layer>
                    <Rect id="bg-grid" x={0} y={0} width={mapSize.width} height={mapSize.height} fill="transparent" />
                    {drawGrid()}
                    {placedElements.map((rect, i) => (
                      <RoomShape
                        key={rect.id}
                        shapeProps={{ ...rect, fill: "#4caf50" }}
                        isSelected={rect.id === selectedId}
                        setIsDraggingElement={setIsDraggingElement}
                        GRID_SIZE={GRID_SIZE}
                        onSelect={() => setSelectedId(rect.id)}
                        onChange={(newAttrs) => {
                          const rects = placedElements.slice();
                          rects[i] = newAttrs;
                          setPlacedElements(rects);
                        }}
                      />
                    ))}
                  </Layer>
                </Stage>
              </div>
            </TransformComponent>
          </TransformWrapper>
        </main>

        <aside className="edit-page-right-panel">
          <h3>Edit Panel</h3>
          
          <div className="edit-tools">
            <p style={{fontSize: "12px", color: "#666"}}>
              {selectedId ? "Elemen Terpilih" : "Tidak ada elemen terpilih"}
            </p>
            <button 
              className="edit-page-btn delete" 
              onClick={deleteSelectedElement}
              disabled={!selectedId}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: selectedId ? "#f44336" : "#ccc",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: selectedId ? "pointer" : "not-allowed",
                marginTop: "10px"
              }}
            >
              Hapus Ruangan
            </button>
            <p style={{fontSize: "10px", marginTop: "5px", color: "#888"}}>
              Atau tekan tombol 'Delete' di keyboard.
            </p>
          </div>

          <hr style={{margin: "20px 0", border: "0.5px solid #ddd"}} />

          <h3>Drag & Drop Elements</h3>
          <div className="dnd-zone">
            <div draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", "new-element")} style={{ width: GRID_SIZE, height: GRID_SIZE, background: "#1a73c8", cursor: "grab", marginBottom: 20 }}>
              <p style={{ color: "white", padding: "5px", fontSize: "8px", textAlign: "center" }}>Drag</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}