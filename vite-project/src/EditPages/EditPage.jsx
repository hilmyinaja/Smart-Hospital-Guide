import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Stage, Layer, Rect, Text, Line, Transformer } from "react-konva";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import "./Edit.css";

const FLOORS = ["Lantai 1", "Lantai 2", "Lantai 3", "Lantai 4"];

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

  const getDoorPos = () => {
    const side = shapeProps.door_side || 'bottom';
    const offset = shapeProps.door_offset || 0;
    let dx = shapeProps.x;
    let dy = shapeProps.y;
    if (side === 'top') { dx += offset * GRID_SIZE; }
    else if (side === 'bottom') { dx += offset * GRID_SIZE; dy += shapeProps.height - GRID_SIZE; }
    else if (side === 'left') { dy += offset * GRID_SIZE; }
    else if (side === 'right') { dx += shapeProps.width - GRID_SIZE; dy += offset * GRID_SIZE; }
    return { x: dx, y: dy };
  };

  const doorPos = getDoorPos();

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
      {shapeProps.type === 'room' && (
        <Rect x={doorPos.x} y={doorPos.y} width={GRID_SIZE} height={GRID_SIZE} fill="#795548" stroke="#5D4037" strokeWidth={2} listening={false} />
      )}
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
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [deletedElements, setDeletedElements] = useState([]);
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

        roomsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          allElements.push({
            id: docSnap.id,
            type: 'room',
            floor: data.floor || "Lantai 1", 
            name: data.name || "Tanpa Nama",
            x: (data.grid_x || 0) * GRID_SIZE,
            y: (data.grid_y || 0) * GRID_SIZE,
            width: (data.grid_width || 1) * GRID_SIZE,
            height: (data.grid_height || 1) * GRID_SIZE,
            door_side: data.door_side || 'bottom',
            door_offset: data.door_offset || 0,
            fill: "#4caf50", stroke: "#1b5e20"
          });
        });

        kioskSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
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
      } catch (error) {
        console.error("Gagal mengambil data:", error);
      }
    };
    fetchAllData();
  }, []);

  useEffect(() => {
    const updateMapSize = () => {
      if (mapRef.current) {
        setMapSize({ width: mapRef.current.clientWidth, height: mapRef.current.clientHeight });
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

  const handleDrop = (e) => {
    e.preventDefault();
    const mapRect = mapRef.current.getBoundingClientRect();
    const clientX = e.clientX - mapRect.left;
    const clientY = e.clientY - mapRect.top;
    const elementType = e.dataTransfer.getData("text/plain");

    if (transformRef.current) {
      const { scale, positionX, positionY } = transformRef.current.state;
      const x = (clientX - positionX) / scale;
      const y = (clientY - positionY) / scale;
      const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE;

      if (elementType === "new-kiosk") {
        const newId = generateNextKioskId();
        setPlacedElements([...placedElements, {
          id: newId, type: 'kiosk', 
          floor: activeEditFloor, 
          x: snappedX, y: snappedY, width: GRID_SIZE * 2, height: GRID_SIZE * 2,
          name: "Kiosk Baru", fill: "#2196F3", stroke: "#0D47A1"
        }]);
        setSelectedId(newId);
      } else {
        const newId = generateNextRoomId();
        setPlacedElements([...placedElements, {
          id: newId, type: 'room',
          floor: activeEditFloor,
          x: snappedX, y: snappedY, width: GRID_SIZE * 4, height: GRID_SIZE * 2,
          door_side: 'bottom', door_offset: 0, name: "Ruangan Baru", fill: "#4caf50", stroke: "#1b5e20"
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
            ...(el.type === 'room' && { door_side: el.door_side || 'bottom', door_offset: el.door_offset || 0 })
          }, { merge: true });
        });

        await batch.commit();
        alert("Denah multi-lantai berhasil disimpan!");
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
        <div className="floor-selector-header" style={{ marginLeft: "20px" }}>
            <label style={{ color: "white", marginRight: "10px", fontSize: "14px" }}>Edit Lantai:</label>
            <select 
                value={activeEditFloor} 
                onChange={(e) => {
                    setActiveEditFloor(e.target.value);
                    setSelectedId(null);
                }}
                style={{ padding: "5px 10px", borderRadius: "4px", border: "none" }}
            >
                {FLOORS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
        </div>
        <div className="edit-page-actions">
          <button className="edit-page-btn cancel" onClick={() => setIsConfirmOpen(true)}>Cancel</button>
          <button className="edit-page-btn save" onClick={() => { setConfirmAction("save"); setIsConfirmOpen(true); }}>Save</button>
        </div>
      </header>

      {isConfirmOpen && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h3>Verifikasi</h3>
            <p>Simpan perubahan lantai ke database?</p>
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
              Hapus Elemen
            </button>
            <p style={{fontSize: "10px", marginTop: "5px", color: "#888"}}>
              Atau tekan tombol 'Delete' di keyboard.
            </p>
            
            {/* DOOR CONTROLS (Dikembalikan Penuh) */}
            {selectedId && placedElements.find(el => el.id === selectedId)?.type === 'room' && (() => {
               const room = placedElements.find(el => el.id === selectedId);
               const updateRoom = (changes) => {
                   setPlacedElements(placedElements.map(el => el.id === selectedId ? { ...el, ...changes } : el));
               };
               return (
                   <div className="door-controls" style={{marginTop: "15px", background: "#f9f9f9", padding: "10px", borderRadius: "5px", border: "1px solid #ddd"}}>
                       <h4 style={{margin: "0 0 10px 0", fontSize: "14px", color: "#333"}}>🚪 Pengaturan Pintu</h4>
                       <label style={{display: "block", marginBottom: "5px", fontSize: "12px", color: "#555"}}>Sisi Pintu:</label>
                       <select 
                           value={room.door_side || 'bottom'} 
                           onChange={(e) => updateRoom({ door_side: e.target.value, door_offset: 0 })}
                           style={{width: "100%", padding: "5px", marginBottom: "10px", borderRadius: "3px", border: "1px solid #ccc"}}
                       >
                           <option value="top">Atas (Top)</option>
                           <option value="bottom">Bawah (Bottom)</option>
                           <option value="left">Kiri (Left)</option>
                           <option value="right">Kanan (Right)</option>
                       </select>

                       <label style={{display: "block", marginBottom: "5px", fontSize: "12px", color: "#555"}}>Geser Pintu:</label>
                       <div style={{display: "flex", gap: "10px", alignItems: "center", justifyContent: "center"}}>
                           <button 
                               onClick={() => updateRoom({ door_offset: Math.max(0, (room.door_offset || 0) - 1) })}
                               style={{padding: "5px 15px", cursor: "pointer", background: "#e0e0e0", border: "none", borderRadius: "3px"}}
                           >-</button>
                           <span style={{fontWeight: "bold", width: "20px", textAlign: "center"}}>{room.door_offset || 0}</span>
                           <button 
                               onClick={() => {
                                   const maxOffset = (room.door_side === 'left' || room.door_side === 'right') 
                                       ? Math.max(0, (room.height / GRID_SIZE) - 1) 
                                       : Math.max(0, (room.width / GRID_SIZE) - 1);
                                   updateRoom({ door_offset: Math.min(maxOffset, (room.door_offset || 0) + 1) });
                               }}
                               style={{padding: "5px 15px", cursor: "pointer", background: "#e0e0e0", border: "none", borderRadius: "3px"}}
                           >+</button>
                       </div>
                   </div>
               );
            })()}
            
          </div>

          <hr style={{margin: "20px 0", border: "0.5px solid #ddd"}} />

          <h3>Drag & Drop Elements</h3>
          <div className="dnd-zone">
            <div draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", "new-element")} style={{ width: GRID_SIZE * 4, height: GRID_SIZE * 2, background: "#4caf50", cursor: "grab", marginBottom: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "#1b5e20", padding: "5px", fontSize: "12px", textAlign: "center", fontWeight: "bold" }}>Drag Ruangan</p>
            </div>
            <div draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", "new-kiosk")} style={{ width: GRID_SIZE * 2, height: GRID_SIZE * 2, background: "#2196F3", cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: "white", padding: "5px", fontSize: "12px", textAlign: "center", fontWeight: "bold" }}>Drag Kiosk</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}