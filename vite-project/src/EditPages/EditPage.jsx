import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Stage, Layer, Rect, Text, Line, Transformer } from "react-konva";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import "./Edit.css";

const ElementShape = ({ shapeProps, isSelected, onSelect, onChange, setIsDraggingElement, GRID_SIZE }) => {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  const handleRename = () => {
    const typeLabel = shapeProps.type === 'kiosk' ? 'Kiosk' : 'Ruangan';
    const newName = window.prompt(`Masukkan Nama ${typeLabel}:`, shapeProps.name || "");
    if (newName !== null) {
      onChange({ ...shapeProps, name: newName });
    }
  };

  const dynamicFontSize = Math.max(10, Math.min(shapeProps.width / 5, shapeProps.height / 2.5));
  const textColor = shapeProps.type === 'kiosk' ? '#FFFFFF' : '#1b5e20';

  // Render penanda endpoint (garis merah marun di tengah sisi aktif)
  const renderEndpoints = () => {
    if (shapeProps.type !== 'room') return null;
    const endpoints = shapeProps.endpoints || ['bottom'];
    const markerLen = 16; 
    const markerThick = 4;
    
    return endpoints.map((side) => {
      let mX, mY, mW, mH;
      if (side === 'top') {
        mX = shapeProps.x + shapeProps.width / 2 - markerThick / 2;
        mY = shapeProps.y - markerLen / 2;
        mW = markerThick; mH = markerLen;
      } else if (side === 'bottom') {
        mX = shapeProps.x + shapeProps.width / 2 - markerThick / 2;
        mY = shapeProps.y + shapeProps.height - markerLen / 2;
        mW = markerThick; mH = markerLen;
      } else if (side === 'left') {
        mX = shapeProps.x - markerLen / 2;
        mY = shapeProps.y + shapeProps.height / 2 - markerThick / 2;
        mW = markerLen; mH = markerThick;
      } else if (side === 'right') {
        mX = shapeProps.x + shapeProps.width - markerLen / 2;
        mY = shapeProps.y + shapeProps.height / 2 - markerThick / 2;
        mW = markerLen; mH = markerThick;
      }
      return <Rect key={side} x={mX} y={mY} width={mW} height={mH} fill="#B71C1C" listening={false} />;
    });
  };

  return (
    <React.Fragment>
      <Rect
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleRename}
        ref={shapeRef}
        {...shapeProps}
        draggable
        stroke={shapeProps.stroke}
        strokeWidth={2}
        onDragStart={() => setIsDraggingElement(true)}
        onTransformStart={() => setIsDraggingElement(true)}
        dragBoundFunc={(pos) => ({
            x: Math.round(pos.x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(pos.y / GRID_SIZE) * GRID_SIZE,
        })}
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
        text={shapeProps.name || (shapeProps.type === 'kiosk' ? 'Kiosk' : 'Tanpa Nama')}
        x={shapeProps.x}
        y={shapeProps.y}
        width={shapeProps.width}
        height={shapeProps.height}
        fontSize={dynamicFontSize}
        fontStyle="bold"
        fill={textColor}
        align="center"
        verticalAlign="middle"
        padding={5}
        listening={false}
        wrap="char"
        ellipsis={true}
      />
      
      {/* Panggil visualisasi penanda endpoint dosen */}
      {renderEndpoints()}

      {isSelected && (
        <Transformer ref={trRef} rotateEnabled={false} boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < GRID_SIZE || newBox.height < GRID_SIZE) return oldBox;
            return newBox;
        }} />
      )}
    </React.Fragment>
  );
};

export default function EditPage() {
  const navigate = useNavigate();
  const [placedElements, setPlacedElements] = useState([]);
  
  // PERBAIKAN: Berikan ukuran default awal area kanvas virtual yang memadai (2000x1500)
  const [mapSize, setMapSize] = useState({ width: 2000, height: 1500 });
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [deletedElements, setDeletedElements] = useState([]);
  const [floors, setFloors] = useState(["Lantai 1", "Lantai 2", "Lantai 3", "Lantai 4"]);
  const [activeEditFloor, setActiveEditFloor] = useState("Lantai 1");

  const mapRef = useRef(null);
  const transformRef = useRef(null);
  const GRID_SIZE = 25;

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [roomsSnapshot, kioskSnapshot] = await Promise.all([
          getDocs(collection(db, "Rooms")),
          getDocs(collection(db, "Kiosks"))
        ]);

        const allElements = [];
        const uniqueFloors = new Set(["Lantai 1", "Lantai 2", "Lantai 3", "Lantai 4"]);

        roomsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.floor) uniqueFloors.add(data.floor);
          allElements.push({
            id: docSnap.id,
            type: 'room',
            floor: data.floor || "Lantai 1",
            name: data.name || "Tanpa Nama",
            x: (data.grid_x || 0) * GRID_SIZE,
            y: (data.grid_y || 0) * GRID_SIZE,
            width: (data.grid_width || 1) * GRID_SIZE,
            height: (data.grid_height || 1) * GRID_SIZE,
            endpoints: data.endpoints && data.endpoints.length > 0 ? data.endpoints : ['bottom'],
            fill: "#4caf50", stroke: "#1b5e20"
          });
        });

        kioskSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.floor) uniqueFloors.add(data.floor);
          allElements.push({
            id: docSnap.id,
            type: 'kiosk',
            floor: data.floor || "Lantai 1",
            name: data.name || "Kiosk",
            x: (data.grid_x || 0) * GRID_SIZE,
            y: (data.grid_y || 0) * GRID_SIZE,
            width: (data.grid_width || 2) * GRID_SIZE,
            height: (data.grid_height || 2) * GRID_SIZE,
            fill: "#2196F3", stroke: "#0D47A1"
          });
        });
        setPlacedElements(allElements);
        setFloors(Array.from(uniqueFloors));
      } catch (error) {
        console.error("Gagal mengambil data:", error);
      }
    };
    fetchAllData();
  }, []);

  // PERBAIKAN: Gunakan setTimeout dan fallback agar dimensi Stage tidak pernah 0
  useEffect(() => {
    const updateMapSize = () => {
      if (mapRef.current) {
        setMapSize({ 
          width: mapRef.current.clientWidth || 2000, 
          height: mapRef.current.clientHeight || 1500 
        });
      }
    };
    
    setTimeout(updateMapSize, 100);
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
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) deleteSelectedElement();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, placedElements]);

  const checkDeselect = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.attrs.id === "bg-grid";
    if (clickedOnEmpty) setSelectedId(null);
  };

  const generateNextRoomId = () => {
    let maxNumber = 0;
    placedElements.forEach((el) => {
      if (el.id.startsWith('R')) {
        const num = parseInt(el.id.substring(1), 10);
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
      }
    });
    return `R${String(maxNumber + 1).padStart(3, '0')}`;
  };

  const generateNextKioskId = () => {
    let maxNumber = 0;
    placedElements.forEach((el) => {
      if (el.id.startsWith('K')) {
        const num = parseInt(el.id.substring(1), 10);
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
      }
    });
    return `K${String(maxNumber + 1).padStart(3, '0')}`;
  };

  const handleAddFloor = () => {
    const newFloor = window.prompt("Masukkan nama lantai baru:\n(Contoh: Lantai 5, Gedung B, Basement)");
    if (newFloor && newFloor.trim() !== "") {
      const formattedFloor = newFloor.trim();
      if (floors.includes(formattedFloor)) {
        alert("Lantai tersebut sudah ada di daftar!");
        return;
      }
      setFloors([...floors, formattedFloor]);
      setActiveEditFloor(formattedFloor);
      setSelectedId(null);
    }
  };

  const handleDeleteFloor = () => {
    if (floors.length <= 1) {
      alert("Tidak dapat menghapus. Harus tersisa minimal satu lantai di editor!");
      return;
    }
    
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus "${activeEditFloor}"?\n\nPERHATIAN: Seluruh elemen (Ruangan & Kiosk) yang berada di lantai ini akan terhapus dari database saat Anda menekan tombol Save.`
    );

    if (confirmDelete) {
      const elementsToDelete = placedElements.filter(el => el.floor === activeEditFloor);
      const idsToDelete = elementsToDelete.map(el => el.id);
      setDeletedElements(prev => [...prev, ...idsToDelete]);

      setPlacedElements(prev => prev.filter(el => el.floor !== activeEditFloor));

      const remainingFloors = floors.filter(f => f !== activeEditFloor);
      setFloors(remainingFloors);
      setActiveEditFloor(remainingFloors[0]);
      setSelectedId(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const mapRect = mapRef.current.getBoundingClientRect();
    const clientX = e.clientX - mapRect.left;
    const clientY = e.clientY - mapRect.top;
    
    let dragData;
    try {
        dragData = JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch (err) {
        console.error("Gagal parsing drag data:", err);
        return; 
    }

    if (transformRef.current && dragData) {
      const { scale, positionX, positionY } = transformRef.current.state;
      const x = (clientX - positionX) / scale;
      const y = (clientY - positionY) / scale;
      const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;

      if (dragData.type === "new-kiosk") {
        const newId = generateNextKioskId();
        setPlacedElements([...placedElements, {
          id: newId, type: 'kiosk', 
          floor: activeEditFloor, 
          x: snappedX, y: snappedY, 
          width: GRID_SIZE * (dragData.defaultGridWidth || 2), 
          height: GRID_SIZE * (dragData.defaultGridHeight || 2),
          name: dragData.defaultName, fill: "#2196F3", stroke: "#0D47A1"
        }]);
        setSelectedId(newId);
      } else if (dragData.type === "new-room") {
        const newId = generateNextRoomId();
        setPlacedElements([...placedElements, {
          id: newId, type: 'room',
          floor: activeEditFloor,
          x: snappedX, y: snappedY, 
          width: GRID_SIZE * (dragData.defaultGridWidth || 4), 
          height: GRID_SIZE * (dragData.defaultGridHeight || 2),
          endpoints: dragData.endpoints, 
          name: dragData.defaultName, fill: "#4caf50", stroke: "#1b5e20"
        }]);
        setSelectedId(newId);
      }
    }
  };

  const handleConfirmYes = async () => {
    setIsConfirmOpen(false);
    if (confirmAction === "save") {
      try {
        const batch = writeBatch(db);
        deletedElements.forEach((id) => {
          const col = id.startsWith('K') ? "Kiosks" : "Rooms";
          batch.delete(doc(db, col, id));
        });

        placedElements.forEach((el) => {
          const col = el.type === 'kiosk' ? "Kiosks" : "Rooms";
          batch.set(doc(db, col, el.id.toString()), {
            id: el.id.toString(),
            name: el.name,
            floor: el.floor, 
            grid_x: Math.round(el.x / GRID_SIZE),
            grid_y: Math.round(el.y / GRID_SIZE),
            grid_width: Math.round(el.width / GRID_SIZE),
            grid_height: Math.round(el.height / GRID_SIZE),
            ...(el.type === 'room' && { endpoints: el.endpoints || ['bottom'] })
          }, { merge: true });
        });

        await batch.commit();
        alert("Denah dan setingan endpoint baru berhasil disimpan!");
        navigate("/admin");
      } catch (error) {
        console.error("Gagal simpan:", error);
      }
    } else navigate("/admin");
    setConfirmAction(null);
  };

  const drawGrid = () => {
    const lines = [];
    const { width, height } = mapSize;
    for (let i = 0; i < width / GRID_SIZE; i++) lines.push(<Line key={`v${i}`} points={[Math.round(i * GRID_SIZE), 0, Math.round(i * GRID_SIZE), height]} stroke="#9e9e9e" strokeWidth={1} />);
    for (let j = 0; j < height / GRID_SIZE; j++) lines.push(<Line key={`h${j}`} points={[0, Math.round(j * GRID_SIZE), width, Math.round(j * GRID_SIZE)]} stroke="#9e9e9e" strokeWidth={1} />);
    return lines;
  };

  return (
    <div className="edit-page-container">
      <header className="edit-page-header">
        <span className="edit-page-logo">Wayfinder - Editor</span>
        <div className="edit-page-actions">
          <button className="edit-page-btn cancel" onClick={() => setIsConfirmOpen(true)}>Cancel</button>
          <button className="edit-page-btn save" onClick={() => { setConfirmAction("save"); setIsConfirmOpen(true); }}>Save</button>
        </div>
      </header>

      {isConfirmOpen && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h3>Verifikasi</h3>
            <p>Simpan perubahan ke database?</p>
            <div className="confirm-modal-actions">
              <button className="confirm-btn no" onClick={() => setIsConfirmOpen(false)}>Tidak</button>
              <button className="confirm-btn yes" onClick={handleConfirmYes}>Iya</button>
            </div>
          </div>
        </div>
      )}

      <div className="edit-page-layout">
        <main className="edit-page-map" ref={mapRef} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
          <TransformWrapper ref={transformRef} panning={{ disabled: isDraggingElement }}>
            <TransformComponent wrapperStyle={{ width: "100%", height: "100%", cursor: isDraggingElement ? "grabbing" : "grab" }}>
              <div className="map-content" style={{ width: mapSize.width, height: mapSize.height, background: "#e0e0e0" }}>
                <Stage width={mapSize.width} height={mapSize.height} onMouseDown={checkDeselect}>
                  <Layer>
                    <Rect id="bg-grid" x={0} y={0} width={mapSize.width} height={mapSize.height} fill="transparent" />
                    {drawGrid()}
                    
                    {placedElements
                      .filter(el => el.floor === activeEditFloor)
                      .map((rect, i) => (
                        <ElementShape
                            key={rect.id}
                            shapeProps={rect}
                            isSelected={rect.id === selectedId}
                            setIsDraggingElement={setIsDraggingElement}
                            GRID_SIZE={GRID_SIZE}
                            onSelect={() => setSelectedId(rect.id)}
                            onChange={(newAttrs) => {
                                const index = placedElements.findIndex(e => e.id === rect.id);
                                const rects = [...placedElements];
                                rects[index] = newAttrs;
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
          {/* ── CARD 1: MANAJEMEN LANTAI BARU ── */}
          <div style={{ background: "#ffffff", padding: "12px", borderRadius: "6px", border: "1px solid #cce5ff", marginBottom: "15px", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
            <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#0056b3", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Manajemen Lantai</span>
              <span style={{ fontSize: "10px", background: "#e8f4f8", padding: "2px 6px", borderRadius: "10px", color: "#0d47a1" }}>{floors.length} Lantai</span>
            </h4>
            
            <select 
              value={activeEditFloor} 
              onChange={(e) => {
                setActiveEditFloor(e.target.value);
                setSelectedId(null);
              }}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #b8daff", marginBottom: "10px", fontSize: "13px", fontWeight: "bold", color: "#0056b3", background: "#f8fbff", cursor: "pointer" }}
            >
              {floors.map(f => <option key={f} value={f}>{f}</option>)}
            </select>

            <div style={{ display: "flex", gap: "6px" }}>
              <button 
                onClick={handleAddFloor}
                style={{ flex: 1, padding: "7px", fontSize: "11px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}
              >
                Tambah
              </button>
              <button 
                onClick={handleDeleteFloor}
                style={{ flex: 1, padding: "7px", fontSize: "11px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}
              >
                Hapus
              </button>
            </div>
          </div>

          {/* ── CARD 2: KONTROL EDIT ELEMEN TERPILIH ── */}
          <h3>Edit Panel - {activeEditFloor}</h3>
          <div className="edit-tools">
            <p style={{fontSize: "12px", color: "#666"}}>
              {selectedId ? `Terpilih: ${selectedId}` : "Tidak ada elemen terpilih"}
            </p>
            <button 
              className="edit-page-btn delete" 
              onClick={deleteSelectedElement}
              disabled={!selectedId}
              style={{
                width: "100%", padding: "10px", backgroundColor: selectedId ? "#f44336" : "#ccc",
                color: "white", border: "none", borderRadius: "5px", cursor: selectedId ? "pointer" : "not-allowed", marginTop: "10px"
              }}
            >
              Hapus Elemen
            </button>
            
            {selectedId && placedElements.find(el => el.id === selectedId)?.type === 'room' && (() => {
               const room = placedElements.find(el => el.id === selectedId);
               const updateRoom = (changes) => {
                   setPlacedElements(placedElements.map(el => el.id === selectedId ? { ...el, ...changes } : el));
               };
               return (
                   <div className="endpoint-controls" style={{marginTop: "15px", background: "#f9f9f9", padding: "10px", borderRadius: "5px", border: "1px solid #ddd"}}>
                       <h4 style={{margin: "0 0 10px 0", fontSize: "14px", color: "#B71C1C"}}>📍 Sisi Endpoint Aktif</h4>
                       <p style={{fontSize: "11px", color: "#666", marginBottom: "6px"}}>Ubah manual jika template tidak sesuai:</p>
                       <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#fff", padding: "8px", borderRadius: "4px", border: "1px solid #eee"}}>
                           {['top', 'bottom', 'left', 'right'].map(side => {
                               const labels = {top: "Atas", bottom: "Bawah", left: "Kiri", right: "Kanan"};
                               const isChecked = (room.endpoints || []).includes(side);
                               return (
                                   <label key={side} style={{fontSize: "12px", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer"}}>
                                       <input 
                                           type="checkbox" 
                                           checked={isChecked}
                                           onChange={() => {
                                               const curr = room.endpoints || [];
                                               const next = isChecked ? curr.filter(s => s !== side) : [...curr, side];
                                               updateRoom({ endpoints: next.length > 0 ? next : ['bottom'] });
                                           }}
                                       />
                                       {labels[side]}
                                   </label>
                               );
                           })}
                       </div>
                   </div>
               );
            })()}
            
          </div>

          <hr style={{margin: "20px 0", border: "0.5px solid #ddd"}} />

          <h3>Template Elemen</h3>
          <p style={{fontSize: "11px", color: "#666", marginTop: "-5px", marginBottom: "15px"}}>Tarik template langsung ke peta.</p>
          
          <div className="dnd-zone" style={{display: "flex", flexDirection: "column", gap: "10px"}}>
            {[
              { name: "Opposing Door Room ", endpoints: ['left', 'right'], color: "#4caf50" },
              { name: "One Door Room", endpoints: ['top',], color: "#4caf50" },
              { name: "Two Door Room ", endpoints: ['left', 'bottom'], color: "#4caf50" },
              { name: "Three Door Room", endpoints: ['left', 'right', 'bottom'], color: "#4caf50" },
              { name: "Four Door Room", endpoints: ['top', 'bottom', 'left', 'right'], color: "#4caf50" }
            ].map(preset => (
              <div 
                key={preset.name}
                draggable 
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", JSON.stringify({
                    type: "new-room",
                    defaultName: preset.name,
                    endpoints: preset.endpoints,
                    defaultGridWidth: 4,
                    defaultGridHeight: 2
                  }));
                }} 
                style={{ 
                  width: "100%", height: "40px", background: preset.color, border: "1px solid #1b5e20",
                  cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" 
                }}
              >
                <p style={{ color: "#1b5e20", padding: "5px", fontSize: "11px", textAlign: "center", fontWeight: "bold" }}>
                  {preset.name}
                </p>
              </div>
            ))}

            <div style={{margin: "10px 0", borderTop: "1px solid #eee"}}></div>

            <div 
              draggable 
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", JSON.stringify({
                  type: "new-kiosk",
                  defaultName: "Kiosk Baru",
                  defaultGridWidth: 2,
                  defaultGridHeight: 2
                }));
              }} 
              style={{ 
                width: GRID_SIZE * 2, height: GRID_SIZE * 2, background: "#2196F3", border: "1px solid #0D47A1",
                cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" 
              }}
            >
              <p style={{ color: "white", padding: "2px", fontSize: "10px", textAlign: "center", fontWeight: "bold" }}>
                Drag Kiosk
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}