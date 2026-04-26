import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Stage, Layer, Rect, Text, Line, Transformer } from "react-konva";
import "./Edit.css";

// Hilmy Add: Komponen khusus untuk menggabungkan Kotak, Nama Ruangan, dan Transformer
const RoomShape = ({ shapeProps, isSelected, onSelect, onChange, setIsDraggingElement, GRID_SIZE }) => {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // Hilmy Add: Fungsi untuk mengubah nama ruangan saat di-double click
  const handleRename = () => {
    const newName = window.prompt("Masukkan Nama Ruangan:", shapeProps.name || "");
    if (newName !== null) {
      onChange({
        ...shapeProps,
        name: newName,
      });
    }
  };

  // Hilmy Add: Kalkulasi ukuran font dinamis berdasarkan ukuran kotak
  // Kita ambil nilai terkecil antara lebar/5 atau tinggi/2.5 agar teks tetap proporsional
  const dynamicFontSize = Math.max(10, Math.min(shapeProps.width / 5, shapeProps.height / 2.5));
  
  return (
    <React.Fragment>
      {/* 1. KOTAK RUANGAN */}
      <Rect
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={handleRename} // Hilmy Add: Double click untuk ganti nama
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

      {/* 2. NAMA RUANGAN (CENTERED) */}
      {/* Hilmy Add: Fitur teks agar selalu di tengah dan tidak keluar kotak */}
      <Text
        text={shapeProps.name || "Tanpa Nama"}
        x={shapeProps.x}
        y={shapeProps.y}
        width={shapeProps.width}
        height={shapeProps.height}
        // Hilmy Add: fontSize menggunakan nilai dinamis hasil perhitungan di atas
        fontSize={dynamicFontSize}
        fontStyle="bold"
        fill="#1b5e20"
        align="center"          // Hilmy Add: Centered horizontal
        verticalAlign="middle"  // Hilmy Add: Centered vertical
        padding={5}
        listening={false}       // Hilmy Add: Agar klik tembus ke Rect di bawahnya
        wrap="char"             // Hilmy Add: Teks akan ganti baris jika kepanjangan
        ellipsis={true}         // Hilmy Add: Teks akan jadi "..." jika benar-benar tidak muat
      />

      {/* 3. TRANSFORMER */}
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={false} 
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < GRID_SIZE || newBox.height < GRID_SIZE) {
              return oldBox;
            }
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

  const mapRef = useRef(null);
  const transformRef = useRef(null);

  const GRID_SIZE = 25;
  
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

  const checkDeselect = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.attrs.id === "bg-grid";
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
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

      const newId = Date.now().toString();
      // Hilmy Add: Default name saat ruangan baru dibuat
      setPlacedElements([...placedElements, { 
        id: newId, 
        x: snappedX, 
        y: snappedY, 
        width: GRID_SIZE * 2, // Default lebar 2 grid
        height: GRID_SIZE * 2, // Default tinggi 2 grid
        name: "Ruangan Baru"
      }]);
      setSelectedId(newId);
    }
  };

  const openConfirmDialog = (action) => {
    setConfirmAction(action);
    setIsConfirmOpen(true);
  };

  const handleConfirmYes = () => {
    setIsConfirmOpen(false);
    setConfirmAction(null);
    navigate("/admin");
  };

  const handleConfirmNo = () => {
    setIsConfirmOpen(false);
    setConfirmAction(null);
  };

  const drawGrid = () => {
    const lines = [];
    const width = mapSize.width;
    const height = mapSize.height;

    for (let i = 0; i < width / GRID_SIZE; i++) {
      lines.push(
        <Line 
          key={`v${i}`} 
          points={[Math.round(i * GRID_SIZE), 0, Math.round(i * GRID_SIZE), height]} 
          stroke="#9e9e9e" 
          strokeWidth={1} 
        />
      );
    }
    for (let j = 0; j < height / GRID_SIZE; j++) {
      lines.push(
        <Line 
          key={`h${j}`} 
          points={[0, Math.round(j * GRID_SIZE), width, Math.round(j * GRID_SIZE)]} 
          stroke="#9e9e9e" 
          strokeWidth={1} 
        />
      );
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
            panning={{disabled: isDraggingElement}} 
          >
            <TransformComponent wrapperStyle={{ width: "100%", height: "100%", cursor: isDraggingElement ? "grabbing" : "grab" }}>
              <div className="map-content" style={{ width: mapSize.width, height: mapSize.height, background: "#e0e0e0" }}>
                <Stage 
                  width={mapSize.width} 
                  height={mapSize.height}
                  onMouseDown={checkDeselect} 
                  onTouchStart={checkDeselect}
                >
                  <Layer>
                    <Rect id="bg-grid" x={0} y={0} width={mapSize.width} height={mapSize.height} fill="transparent" />

                    {drawGrid()}

                    {placedElements.map((rect, i) => (
                      <RoomShape
                        key={rect.id}
                        shapeProps={{...rect, fill: "#4caf50"}}
                        isSelected={rect.id === selectedId}
                        setIsDraggingElement={setIsDraggingElement}
                        GRID_SIZE={GRID_SIZE}
                        onSelect={() => {
                          setSelectedId(rect.id);
                        }}
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
          <h3>Drag & Drop Elements</h3>
          <div className="dnd-zone">
            <div 
              draggable 
              onDragStart={(e) => e.dataTransfer.setData("text/plain", "new-element")}
              style={{ width: GRID_SIZE, height: GRID_SIZE, background: "#1a73c8", cursor: "grab", marginBottom: 20 }}
            >
              <p style={{ color: "white", padding: "5px", fontSize: "8px", textAlign: "center" }}>Drag</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}