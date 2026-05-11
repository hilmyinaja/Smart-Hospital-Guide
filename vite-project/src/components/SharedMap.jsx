// SharedMap.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Stage, Layer, Rect, Text, Line, Group, Circle } from "react-konva";
import Konva from "konva";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase"; 

// Helper: Hitung total panjang rute
function getTotalPathLength(pathPoints) {
  let total = 0;
  for (let i = 0; i < pathPoints.length - 2; i += 2) {
    const x1 = pathPoints[i];
    const y1 = pathPoints[i + 1];
    const x2 = pathPoints[i + 2];
    const y2 = pathPoints[i + 3];
    const dx = x2 - x1;
    const dy = y2 - y1;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

// Helper: Dapatkan koordinat dan sudut pada jarak tertentu dari rute
function getPointAtDistance(pathPoints, distance) {
  let currentDist = 0;
  for (let i = 0; i < pathPoints.length - 2; i += 2) {
    const x1 = pathPoints[i];
    const y1 = pathPoints[i + 1];
    const x2 = pathPoints[i + 2];
    const y2 = pathPoints[i + 3];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    
    if (currentDist + segLen >= distance) {
      const ratio = (distance - currentDist) / segLen;
      const x = x1 + dx * ratio;
      const y = y1 + dy * ratio;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      return { x, y, angle };
    }
    currentDist += segLen;
  }
  
  const lastX = pathPoints[pathPoints.length - 2];
  const lastY = pathPoints[pathPoints.length - 1];
  
  if (pathPoints.length >= 4) {
    const dx = pathPoints[pathPoints.length - 2] - pathPoints[pathPoints.length - 4];
    const dy = pathPoints[pathPoints.length - 1] - pathPoints[pathPoints.length - 3];
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return { x: lastX, y: lastY, angle };
  }
  return { x: lastX, y: lastY, angle: 0 };
}

// Pilar 2: Menambahkan prop 'currentFloor' untuk filter visual
export default function SharedMap({ path = [], currentFloor = "Lantai 1" }) {
  const [rooms, setRooms] = useState([]);
  const [kiosks, setKiosks] = useState([]);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  const lineRef = useRef(null);
  const personRef = useRef(null);
  const leftFootRef = useRef(null);
  const rightFootRef = useRef(null);
  
  const GRID_SIZE = 25; 

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setMapSize({
          width: containerRef.current.clientWidth || 2000, 
          height: containerRef.current.clientHeight || 1500,
        });
      }
    };
    
    setTimeout(updateSize, 100); 
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Fetch data Rooms
  useEffect(() => {
    const unsubscribeRooms = onSnapshot(collection(db, "Rooms"), (snapshot) => {
      const loadedRooms = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedRooms.push({
          id: docSnap.id,
          // Pilar 2: Pastikan data floor diambil dari Firestore
          floor: data.floor || "Lantai 1", 
          name: data.name || "Tanpa Nama",
          x: (data.grid_x || 0) * GRID_SIZE,
          y: (data.grid_y || 0) * GRID_SIZE,
          width: (data.grid_width || 1) * GRID_SIZE,
          height: (data.grid_height || 1) * GRID_SIZE,
          door_side: data.door_side || 'bottom',
          door_offset: data.door_offset || 0,
        });
      });
      setRooms(loadedRooms);
    }, (error) => console.error("Gagal memuat peta:", error));

    return () => unsubscribeRooms();
  }, []);

  // Fetch data Kiosks
  useEffect(() => {
    const unsubscribeKiosks = onSnapshot(collection(db, "Kiosks"), (snapshot) => {
      const loadedKiosks = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedKiosks.push({
          id: docSnap.id,
          // Pilar 2: Pastikan data floor diambil dari Firestore
          floor: data.floor || "Lantai 1",
          name: data.name || "Kiosk",
          x: (data.grid_x || 0) * GRID_SIZE,
          y: (data.grid_y || 0) * GRID_SIZE,
          width: (data.grid_width || 2) * GRID_SIZE,
          height: (data.grid_height || 2) * GRID_SIZE,
        });
      });
      setKiosks(loadedKiosks);
    }, (error) => console.error("Gagal memuat kiosk:", error));

    return () => unsubscribeKiosks();
  }, []);

  const pathPoints = useMemo(() => {
    const filteredPath = path.filter(p => !p.floor || p.floor === currentFloor);
    return filteredPath.flatMap((point) => [
      (point.x || 0) * GRID_SIZE + GRID_SIZE / 2,
      (point.y || 0) * GRID_SIZE + GRID_SIZE / 2
    ]);
  }, [path, currentFloor]);

  // Animasi garis rute dan orang berjalan
  useEffect(() => {
    if (!lineRef.current) return;
    
    const totalPathLength = getTotalPathLength(pathPoints);
    const WALK_SPEED = 70; // Kecepatan berjalan (pixels per second)

    const anim = new Konva.Animation((frame) => {
      // 1. Animasi dash line rute
      const dashOffset = (frame.time / 20) % 20; 
      lineRef.current.dashOffset(-dashOffset);

      // 2. Animasi orang berjalan
      if (personRef.current && pathPoints.length >= 4 && totalPathLength > 0) {
        const distance = ((frame.time / 1000) * WALK_SPEED) % totalPathLength;
        const { x, y, angle } = getPointAtDistance(pathPoints, distance);
        
        personRef.current.x(x);
        personRef.current.y(y);
        personRef.current.rotation(angle);
        
        // Animasi ayunan kaki (bergerak di sumbu X lokal karena orang menghadap ke X)
        if (leftFootRef.current && rightFootRef.current) {
            const footSwing = Math.sin(frame.time * 0.015) * 8; 
            leftFootRef.current.x(footSwing);
            rightFootRef.current.x(-footSwing); 
        }
      }
    }, lineRef.current.getLayer());
    
    anim.start();
    return () => anim.stop();
  }, [pathPoints]);

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
            
            {/* Pilar 2: Filter ruangan berdasarkan prop currentFloor */}
            {rooms
              .filter((room) => room.floor === currentFloor)
              .map((room) => {
                const fontSize = Math.max(10, Math.min(room.width / 5, room.height / 2.5));
                let dx = room.x;
                let dy = room.y;
                if (room.door_side === 'top') { dx += room.door_offset * GRID_SIZE; } 
                else if (room.door_side === 'bottom') { dx += room.door_offset * GRID_SIZE; dy += room.height - GRID_SIZE; } 
                else if (room.door_side === 'left') { dy += room.door_offset * GRID_SIZE; } 
                else if (room.door_side === 'right') { dx += room.width - GRID_SIZE; dy += room.door_offset * GRID_SIZE; }
                
                return (
                  <React.Fragment key={room.id}>
                    <Rect x={room.x} y={room.y} width={room.width} height={room.height} fill="#4caf50" stroke="#1b5e20" strokeWidth={2} />
                    <Rect x={dx} y={dy} width={GRID_SIZE} height={GRID_SIZE} fill="#795548" stroke="#5D4037" strokeWidth={2} />
                    <Text text={room.name} x={room.x} y={room.y} width={room.width} height={room.height} fontSize={fontSize} fontStyle="bold" fill="#1b5e20" align="center" verticalAlign="middle" padding={5} wrap="char" ellipsis={true} />
                  </React.Fragment>
                );
            })}

            {/* Pilar 2: Filter kiosk berdasarkan prop currentFloor */}
            {kiosks
              .filter((kiosk) => kiosk.floor === currentFloor)
              .map((kiosk) => {
                const fontSize = Math.max(10, Math.min(kiosk.width / 5, kiosk.height / 2.5));
                return (
                  <React.Fragment key={kiosk.id}>
                    <Rect x={kiosk.x} y={kiosk.y} width={kiosk.width} height={kiosk.height} fill="#2196F3" stroke="#0D47A1" strokeWidth={2} />
                    <Text text={kiosk.name} x={kiosk.x} y={kiosk.y} width={kiosk.width} height={kiosk.height} fontSize={fontSize} fontStyle="bold" fill="#FFFFFF" align="center" verticalAlign="middle" padding={5} wrap="char" ellipsis={true} />
                  </React.Fragment>
                );
            })}

            {/* Garis rute hanya muncul jika ada path data */}
            {pathPoints.length > 0 && (
              <>
                <Line ref={lineRef} points={pathPoints} stroke="red" strokeWidth={5} dash={[10, 10]} lineCap="round" lineJoin="round" tension={0} />
                
                {/* Animasi Orang Berjalan Top-down */}
                {pathPoints.length >= 4 && (
                  <Group ref={personRef}>
                    {/* Kaki Kiri */}
                    <Rect ref={leftFootRef} x={0} y={-8} width={10} height={6} fill="#333" cornerRadius={3} offsetX={5} offsetY={3} />
                    {/* Kaki Kanan */}
                    <Rect ref={rightFootRef} x={0} y={8} width={10} height={6} fill="#333" cornerRadius={3} offsetX={5} offsetY={3} />
                    
                    {/* Bahu/Badan */}
                    <Rect x={0} y={0} width={16} height={24} fill="#2196F3" cornerRadius={8} offsetX={8} offsetY={12} />
                    
                    {/* Kepala */}
                    <Circle x={0} y={0} radius={7} fill="#FFCCBC" stroke="#333" strokeWidth={1} />
                  </Group>
                )}
              </>
            )}
          </Layer>
        </Stage>
      )}
    </div>
  );
}