import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Rect, Text, Line } from "react-konva";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase"; // Sesuaikan path jika perlu

export default function SharedMap() {
  const [rooms, setRooms] = useState([]);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  
  const GRID_SIZE = 25; // Harus sama dengan yang ada di EditPage.jsx

  // Mengambil ukuran kontainer induk agar peta responsif
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setMapSize({
          // HILMY FIX: Beri nilai fallback (misal 2000x1500) jika clientWidth kebetulan 0 saat pertama kali render
          width: containerRef.current.clientWidth || 2000, 
          height: containerRef.current.clientHeight || 1500,
        });
      }
    };
    
    // timeout biar CSS selesai ngeload sebelum mengukur
    setTimeout(updateSize, 100); 
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Fetch data dari Firestore
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
        
        setRooms(loadedRooms);
      } catch (error) {
        console.error("Gagal memuat peta:", error);
      }
    };

    fetchRoomsData();
  }, []);

  // Fungsi menggambar background grid (opsional untuk mode view)
  const drawGrid = () => {
    const lines = [];
    const { width, height } = mapSize;
    for (let i = 0; i < width / GRID_SIZE; i++) {
      lines.push(<Line key={`v${i}`} points={[Math.round(i * GRID_SIZE), 0, Math.round(i * GRID_SIZE), height]} stroke="#e0e0e0" strokeWidth={1} />);
    }
    for (let j = 0; j < height / GRID_SIZE; j++) {
      lines.push(<Line key={`h${j}`} points={[0, Math.round(j * GRID_SIZE), width, Math.round(j * GRID_SIZE)]} stroke="#e0e0e0" strokeWidth={1} />);
    }
    return lines;
  };

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", background: "#f5f5f5" }}>
      {mapSize.width > 0 && mapSize.height > 0 && (
        <Stage width={mapSize.width} height={mapSize.height}>
          <Layer>
            {drawGrid()}
            
            {/* Render ruangan Read Only */}
            {rooms.map((room) => {
              const fontSize = Math.max(10, Math.min(room.width / 5, room.height / 2.5));
              
              return (
                <React.Fragment key={room.id}>
                  <Rect
                    x={room.x}
                    y={room.y}
                    width={room.width}
                    height={room.height}
                    fill="#4caf50"
                    stroke="#1b5e20"
                    strokeWidth={2}
                  />
                  <Text
                    text={room.name}
                    x={room.x}
                    y={room.y}
                    width={room.width}
                    height={room.height}
                    fontSize={fontSize}
                    fontStyle="bold"
                    fill="#1b5e20"
                    align="center"
                    verticalAlign="middle"
                    padding={5}
                    wrap="char"
                    ellipsis={true}
                  />
                </React.Fragment>
              );
            })}
          </Layer>
        </Stage>
      )}
    </div>
  );
}