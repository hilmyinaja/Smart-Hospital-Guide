import React, { useState, useEffect, useRef, useMemo } from "react";
import { Stage, Layer, Rect, Text, Line, Group, Circle } from "react-konva";
import Konva from "konva";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { translateName, getDisplayNodeName } from "../utils/translator";

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

    if (segLen === 0) continue; // Skip redundant points

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
    for (let i = pathPoints.length - 2; i >= 2; i -= 2) {
      const dx = pathPoints[i] - pathPoints[i - 2];
      const dy = pathPoints[i + 1] - pathPoints[i - 1];
      if (dx !== 0 || dy !== 0) {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return { x: lastX, y: lastY, angle };
      }
    }
  }
  return { x: lastX, y: lastY, angle: 0 };
}

export default function SharedMap({ path = [], activeStepPath = null, nextStepPath = null, activeStepIndex = 0, navigationSteps = [], currentFloor = "Lantai 1", currentBuilding = "Gedung A", selectedKiosk, onRoomClick, onAvatarPositionChange, showGrid = true, showBorder = false, language = "id", isDarkMode = false }) {
  const [rooms, setRooms] = useState([]);
  const [kiosks, setKiosks] = useState([]);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  const lineRef = useRef(null);
  const personRef = useRef(null);
  const leftFootRef = useRef(null);
  const rightFootRef = useRef(null);
  const idleAvatarRef = useRef(null);
  const wavingArmRef = useRef(null);
  const idlePositionRef = useRef(null);
  const lastAvatarReportRef = useRef(0);
  const onAvatarPositionChangeRef = useRef(onAvatarPositionChange);
  useEffect(() => { onAvatarPositionChangeRef.current = onAvatarPositionChange; }, [onAvatarPositionChange]);

  const GRID_SIZE = 25;

  // Hitung dan cari posisi kosong di sekitar kiosk untuk menempatkan avatar idle.
  function getIdlePosition(kiosk, floorRooms, floorKiosks) {
    const OFFSET = 22;
    const AV = 28;
    const cx = kiosk.x + kiosk.width / 2;
    const cy = kiosk.y + kiosk.height / 2;
    
    const candidates = [
      { x: cx, y: kiosk.y + kiosk.height + OFFSET },
      { x: kiosk.x + kiosk.width + OFFSET, y: cy },
      { x: kiosk.x - OFFSET, y: cy },
      { x: cx, y: kiosk.y - OFFSET },
    ];
    const allBoxes = [...floorRooms, ...floorKiosks].filter(b => b.id !== kiosk.id);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    [...floorRooms, ...floorKiosks].forEach(b => {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    });

    for (const pos of candidates) {
      const ax = pos.x - AV / 2;
      const ay = pos.y - AV / 2;

      const overlaps = allBoxes.some(b =>
        ax < b.x + b.width && ax + AV > b.x && ay < b.y + b.height && ay + AV > b.y
      );

      const isInsideBounds = ax >= minX && (ax + AV) <= maxX && ay >= minY && (ay + AV) <= maxY;

      if (!overlaps && isInsideBounds) return pos;
    }

    for (const pos of candidates) {
      const ax = pos.x - AV / 2;
      const ay = pos.y - AV / 2;
      const overlaps = allBoxes.some(b =>
        ax < b.x + b.width && ax + AV > b.x && ay < b.y + b.height && ay + AV > b.y
      );
      if (!overlaps) return pos;
    }

    return candidates[0];
  }

  const mapBounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    rooms.forEach((room) => {
      if (room.floor === currentFloor && (room.building || "Gedung A") === currentBuilding) {
        minX = Math.min(minX, room.x);
        minY = Math.min(minY, room.y);
        maxX = Math.max(maxX, room.x + room.width);
        maxY = Math.max(maxY, room.y + room.height);
      }
    });

    kiosks.forEach((kiosk) => {
      if (kiosk.floor === currentFloor && (kiosk.building || "Gedung A") === currentBuilding) {
        minX = Math.min(minX, kiosk.x);
        minY = Math.min(minY, kiosk.y);
        maxX = Math.max(maxX, kiosk.x + kiosk.width);
        maxY = Math.max(maxY, kiosk.y + kiosk.height);
      }
    });

    if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
      return null;
    }

    const padding = 40;
    return {
      x: minX - padding,
      y: minY - padding,
      width: (maxX - minX) + 2 * padding,
      height: (maxY - minY) + 2 * padding
    };
  }, [rooms, kiosks, currentFloor, currentBuilding]);

  const scaleAndOffset = useMemo(() => {
    if (!mapBounds || mapSize.width === 0 || mapSize.height === 0) {
      return { scale: 1, x: 0, y: 0 };
    }
    const padding = 20;
    const availableWidth = mapSize.width - padding * 2;
    const availableHeight = mapSize.height - padding * 2;
    const scaleX = availableWidth / mapBounds.width;
    const scaleY = availableHeight / mapBounds.height;
    const scale = Math.min(scaleX, scaleY, 2);


    const x = (mapSize.width - mapBounds.width * scale) / 2 - mapBounds.x * scale;
    const y = (mapSize.height - mapBounds.height * scale) / 2 - mapBounds.y * scale;

    return { scale, x, y };
  }, [mapBounds, mapSize]);

  const calculatedMapSize = useMemo(() => {
    let maxX = mapSize.width || 2000;
    let maxY = mapSize.height || 1500;

    rooms.forEach(room => {
      if (room.floor === currentFloor && (room.building || "Gedung A") === currentBuilding) {
        const right = room.x + room.width;
        const bottom = room.y + room.height;
        if (right > maxX) maxX = right;
        if (bottom > maxY) maxY = bottom;
      }
    });

    kiosks.forEach(kiosk => {
      if (kiosk.floor === currentFloor && (kiosk.building || "Gedung A") === currentBuilding) {
        const right = kiosk.x + kiosk.width;
        const bottom = kiosk.y + kiosk.height;
        if (right > maxX) maxX = right;
        if (bottom > maxY) maxY = bottom;
      }
    });

    return {
      width: maxX + 1000,
      height: maxY + 1000
    };
  }, [rooms, kiosks, currentFloor, mapSize.width, mapSize.height, currentBuilding]);

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

  useEffect(() => {
    const unsubscribeRooms = onSnapshot(collection(db, "Rooms"), (snapshot) => {
      const loadedRooms = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedRooms.push({
          id: docSnap.id,
          floor: data.floor || "Lantai 1",
          building: data.building || "Gedung A",
          name: data.name || "Tanpa Nama",
          name_en: data.name_en,
          x: (data.grid_x || 0) * GRID_SIZE,
          y: (data.grid_y || 0) * GRID_SIZE,
          width: (data.grid_width || 1) * GRID_SIZE,
          height: (data.grid_height || 1) * GRID_SIZE,
          endpoints: data.endpoints && data.endpoints.length > 0 ? data.endpoints : ['bottom'],
          is_connector: data.is_connector || false,
          target_building: data.target_building || "",
        });
      });
      setRooms(loadedRooms);
    }, (error) => console.error("Gagal memuat peta:", error));

    return () => unsubscribeRooms();
  }, []);

  useEffect(() => {
    const unsubscribeKiosks = onSnapshot(collection(db, "Kiosks"), (snapshot) => {
      const loadedKiosks = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedKiosks.push({
          id: docSnap.id,
          type: "kiosk",
          floor: data.floor || "Lantai 1",
          building: data.building || "Gedung A",
          name: data.name || "Kiosk",
          name_en: data.name_en,
          x: (data.grid_x || 0) * GRID_SIZE,
          y: (data.grid_y || 0) * GRID_SIZE,
          width: (data.grid_width || 2) * GRID_SIZE,
          height: (data.grid_height || 2) * GRID_SIZE,
          is_connector: data.is_connector || false,
          target_building: data.target_building || "",
        });
      });
      setKiosks(loadedKiosks);
    }, (error) => console.error("Gagal memuat kiosk:", error));

    return () => unsubscribeKiosks();
  }, []);

  const currentFloorRooms = useMemo(() => {
    const r = rooms.filter(room => room.floor === currentFloor && (room.building || "Gedung A") === currentBuilding);
    const kAsR = kiosks.filter(kiosk => kiosk.floor === currentFloor && (kiosk.building || "Gedung A") === currentBuilding && kiosk.name?.toLowerCase().includes('pintu'));
    return [...r, ...kAsR];
  }, [rooms, kiosks, currentFloor, currentBuilding]);

  const currentFloorKiosks = useMemo(() => {
    return kiosks.filter(kiosk => kiosk.floor === currentFloor && (kiosk.building || "Gedung A") === currentBuilding && !kiosk.name?.toLowerCase().includes('pintu'));
  }, [kiosks, currentFloor, currentBuilding]);

  const selectedKioskData = useMemo(() => {
    if (!selectedKiosk) return null;
    return currentFloorKiosks.find(k => k.id === selectedKiosk) || null;
  }, [selectedKiosk, currentFloorKiosks]);

  const pathPoints = useMemo(() => {
    const filteredPath = path.filter(p => (!p.floor || p.floor === currentFloor) && (!p.building || p.building === currentBuilding));
    let pts = filteredPath.flatMap((point) => [
      (point.x || 0) * GRID_SIZE + GRID_SIZE / 2,
      (point.y || 0) * GRID_SIZE + GRID_SIZE / 2
    ]);

    // Sambungkan titik awal rute ke avatar dengan belokan 90 derajat jika navigasi dimulai dari kiosk ini
    if (selectedKioskData && pts.length >= 2 && path.length > 0) {
      const isStartingFloor = path[0].floor === currentFloor || (!path[0].floor && currentFloor === "Lantai 1");
      if (isStartingFloor) {
        const idlePos = getIdlePosition(selectedKioskData, currentFloorRooms, currentFloorKiosks);
        const p0x = pts[0];
        const p0y = pts[1];
        const cx = selectedKioskData.x + selectedKioskData.width / 2;

        let cornerX = idlePos.x;
        let cornerY = p0y;
        if (Math.abs(idlePos.x - cx) < 1) { // Jika idlePos ada di atas/bawah kiosk
          cornerX = p0x;
          cornerY = idlePos.y;
        }

        const addCorner = (Math.abs(cornerX - idlePos.x) > 1 || Math.abs(cornerY - idlePos.y) > 1) &&
          (Math.abs(cornerX - p0x) > 1 || Math.abs(cornerY - p0y) > 1);

        if (addCorner) {
          pts = [idlePos.x, idlePos.y, cornerX, cornerY, ...pts];
        } else {
          pts = [idlePos.x, idlePos.y, ...pts];
        }
      }
    }
    return pts;
  }, [path, currentFloor, currentBuilding, selectedKioskData, currentFloorRooms, currentFloorKiosks]);

  const activeStepPathPoints = useMemo(() => {
    if (!activeStepPath || activeStepPath.length === 0) return [];
    const filteredPath = activeStepPath.filter(p => (!p.floor || p.floor === currentFloor) && (!p.building || p.building === currentBuilding));
    let pts = filteredPath.flatMap((point) => [
      (point.x || 0) * GRID_SIZE + GRID_SIZE / 2,
      (point.y || 0) * GRID_SIZE + GRID_SIZE / 2
    ]);

    // Jika ini adalah step navigasi pertama di lantai ini, sambungkan ke avatar dengan belokan 90 derajat
    if (activeStepIndex === 0 && selectedKioskData && pts.length >= 2) {
      const idlePos = getIdlePosition(selectedKioskData, currentFloorRooms, currentFloorKiosks);
      const p0x = pts[0];
      const p0y = pts[1];
      const cx = selectedKioskData.x + selectedKioskData.width / 2;

      let cornerX = idlePos.x;
      let cornerY = p0y;
      if (Math.abs(idlePos.x - cx) < 1) { // Jika idlePos ada di atas/bawah kiosk
        cornerX = p0x;
        cornerY = idlePos.y;
      }

      const addCorner = (Math.abs(cornerX - idlePos.x) > 1 || Math.abs(cornerY - idlePos.y) > 1) &&
        (Math.abs(cornerX - p0x) > 1 || Math.abs(cornerY - p0y) > 1);

      if (addCorner) {
        pts = [idlePos.x, idlePos.y, cornerX, cornerY, ...pts];
      } else {
        pts = [idlePos.x, idlePos.y, ...pts];
      }
    }
    return pts;
  }, [activeStepPath, currentFloor, currentBuilding, activeStepIndex, selectedKioskData, currentFloorRooms, currentFloorKiosks]);

  const nextStepPathPoints = useMemo(() => {
    if (!nextStepPath || nextStepPath.length === 0) return [];
    const filteredPath = nextStepPath.filter(p => (!p.floor || p.floor === currentFloor) && (!p.building || p.building === currentBuilding));
    return filteredPath.flatMap((point) => [
      (point.x || 0) * GRID_SIZE + GRID_SIZE / 2,
      (point.y || 0) * GRID_SIZE + GRID_SIZE / 2
    ]);
  }, [nextStepPath, currentFloor, currentBuilding]);

  // ── Referensi Animasi Persisten ──
  const activeStepPathPointsRef = useRef([]);
  const nextStepPathPointsRef = useRef([]);
  const walkedDistanceRef = useRef(0);
  const prevPathLengthRef = useRef(0);
  const activeStepIndexRef = useRef(0);
  const animPhaseRef = useRef("idle"); // "idle" | "waving" | "transitioning" | "rotating" | "walking" | "pre-rotating"
  const rotateStartTimeRef = useRef(0);
  const rotateFromAngleRef = useRef(0);
  const rotateToAngleRef = useRef(0);
  const walkStartTimeRef = useRef(0);
  const selectedKioskRef = useRef(selectedKiosk);
  const navigationStepsRef = useRef(navigationSteps);

  useEffect(() => { selectedKioskRef.current = selectedKiosk; }, [selectedKiosk]);
  useEffect(() => { navigationStepsRef.current = navigationSteps; }, [navigationSteps]);
  useEffect(() => { nextStepPathPointsRef.current = nextStepPathPoints; }, [nextStepPathPoints]);

  useEffect(() => {
    if (!selectedKioskData) {
      idlePositionRef.current = null;
      if (idleAvatarRef.current) idleAvatarRef.current.visible(false);
      if (personRef.current) personRef.current.visible(false);
      return;
    }
    const phase = animPhaseRef.current;
    if (phase === "walking" || phase === "rotating" || phase === "pre-rotating" || phase === "transitioning") return;

    const pos = getIdlePosition(selectedKioskData, currentFloorRooms, currentFloorKiosks);
    idlePositionRef.current = pos;

    if (idleAvatarRef.current) {
      idleAvatarRef.current.x(pos.x);
      idleAvatarRef.current.y(pos.y);
      idleAvatarRef.current.visible(true);
      idleAvatarRef.current.opacity(1);
    }
    if (wavingArmRef.current) {
      wavingArmRef.current.visible(true);
      wavingArmRef.current.opacity(1);
    }
    if (personRef.current) personRef.current.visible(false);
    animPhaseRef.current = "waving";
  }, [selectedKioskData, currentFloorRooms, currentFloorKiosks]);

  // Deteksi pergantian langkah navigasi untuk mengatur rotasi dan posisi avatar.
  useEffect(() => {
    let isSamePath = true;
    if (activeStepIndexRef.current !== activeStepIndex || activeStepPathPointsRef.current.length !== activeStepPathPoints.length) {
      isSamePath = false;
    } else {
      for (let i = 0; i < activeStepPathPoints.length; i++) {
        if (activeStepPathPoints[i] !== activeStepPathPointsRef.current[i]) {
          isSamePath = false;
          break;
        }
      }
    }

    activeStepPathPointsRef.current = activeStepPathPoints;
    activeStepIndexRef.current = activeStepIndex;

    if (isSamePath) return;

    if (activeStepPathPoints.length < 4) {
      walkedDistanceRef.current = 0;
      prevPathLengthRef.current = 0;

      if (selectedKioskData) {
        const pos = getIdlePosition(selectedKioskData, currentFloorRooms, currentFloorKiosks);
        idlePositionRef.current = pos;
        if (idleAvatarRef.current) {
          idleAvatarRef.current.x(pos.x);
          idleAvatarRef.current.y(pos.y);
          idleAvatarRef.current.visible(true);
          idleAvatarRef.current.opacity(1);
        }
        if (wavingArmRef.current) {
          wavingArmRef.current.visible(true);
          wavingArmRef.current.opacity(1);
        }
        if (personRef.current) personRef.current.visible(false);
        animPhaseRef.current = "waving";
      } else if (!selectedKioskData) {
        animPhaseRef.current = "idle";
        if (idleAvatarRef.current) idleAvatarRef.current.visible(false);
        if (personRef.current) personRef.current.visible(false);
      }
      return;
    }

    const totalLen = getTotalPathLength(activeStepPathPoints);
    prevPathLengthRef.current = totalLen;
    walkedDistanceRef.current = 0;

    const p0 = getPointAtDistance(activeStepPathPoints, 0);

    if (idleAvatarRef.current) idleAvatarRef.current.visible(false);
    if (personRef.current) personRef.current.visible(true);
    if (wavingArmRef.current) wavingArmRef.current.visible(false);

    let isTeleported = false;
    if (activeStepIndex > 0) {
      const prevStep = navigationStepsRef.current[activeStepIndex - 1];
      const currStep = navigationStepsRef.current[activeStepIndex];

      if (prevStep && currStep && (prevStep.floor !== currStep.floor || prevStep.building !== currStep.building)) {
        isTeleported = true;
      }

      if (personRef.current) {
        const dx = personRef.current.x() - p0.x;
        const dy = personRef.current.y() - p0.y;
        if (Math.sqrt(dx * dx + dy * dy) > 20) {
          isTeleported = true;
        }
      }
    }

    const wasWaving = animPhaseRef.current === "waving";
    if (activeStepIndex === 0 && wasWaving && idlePositionRef.current) {
      if (personRef.current) {
        personRef.current.x(p0.x);
        personRef.current.y(p0.y);
      }
    }

    let fromAngle;
    if (activeStepIndex === 0) {
      const kiosk = kiosks.find(k => k.id === selectedKioskRef.current);
      if (kiosk) {
        const kioskCenterX = kiosk.x + kiosk.width / 2;
        const kioskCenterY = kiosk.y + kiosk.height / 2;
        fromAngle = Math.atan2(kioskCenterY - p0.y, kioskCenterX - p0.x) * (180 / Math.PI);
      } else {
        fromAngle = p0.angle + 180;
      }
    } else if (isTeleported) {
      let exitAngle = personRef.current ? (personRef.current.rotation() + 180) % 360 : p0.angle + 180;
      let startRoom = rooms.find(r => 
        r.floor === currentFloor && 
        (r.building || "Gedung A") === currentBuilding &&
        p0.x >= r.x && p0.x <= r.x + r.width &&
        p0.y >= r.y && p0.y <= r.y + r.height
      );

      if (!startRoom) {
        // Fallback: cari room terdekat di lantai ini (Lift, Tangga, Connector)
        const candidates = rooms.filter(r => 
          r.floor === currentFloor && 
          (r.building || "Gedung A") === currentBuilding
        );
        if (candidates.length > 0) {
          candidates.sort((a, b) => {
            const distA = Math.hypot((a.x + a.width/2) - p0.x, (a.y + a.height/2) - p0.y);
            const distB = Math.hypot((b.x + b.width/2) - p0.x, (b.y + b.height/2) - p0.y);
            return distA - distB;
          });
          startRoom = candidates[0];
        }
      }
      if (startRoom && startRoom.endpoints && startRoom.endpoints.length > 0) {
        const ep = startRoom.endpoints[0];
        if (ep === 'top') exitAngle = 270;
        else if (ep === 'bottom') exitAngle = 90;
        else if (ep === 'left') exitAngle = 180;
        else if (ep === 'right') exitAngle = 0;
      }
      console.log(`[DEBUG] Teleport detected! p0.x=${p0.x}, p0.y=${p0.y}, p0.angle=${p0.angle}, startRoom=${startRoom?.name}, exitAngle=${exitAngle}`);
      fromAngle = exitAngle;
    } else {
      fromAngle = personRef.current?.rotation() ?? p0.angle;
    }

    rotateFromAngleRef.current = fromAngle;
    rotateToAngleRef.current = p0.angle;

    let diff = p0.angle - fromAngle;
    diff = ((diff + 180) % 360 + 360) % 360 - 180;

    if (Math.abs(diff) < 1) {
      animPhaseRef.current = "walking";
      walkStartTimeRef.current = performance.now();
    } else {
      animPhaseRef.current = "rotating";
      rotateStartTimeRef.current = performance.now();
    }

    if (personRef.current) {
      personRef.current.x(p0.x);
      personRef.current.y(p0.y);
      if (Math.abs(diff) < 1) {
        personRef.current.rotation(p0.angle);
      }
    }
  }, [activeStepPathPoints, activeStepIndex, kiosks, rooms, currentFloor, currentBuilding, currentFloorRooms, currentFloorKiosks, selectedKioskData]);

  // Satu animasi persisten — menangani waving, transition, dan walking
  useEffect(() => {
    const ROTATION_DURATION = 1000;
    const TRANSITION_DURATION = 600;
    const LEG_SWING_FREQ = 0.006;
    const WALK_SPEED = 50;
    const WAVE_ARM_FREQ = 0.005;
    const WAVE_ARM_AMPLITUDE = 40;
    const BODY_SWAY_FREQ = 0.002;
    const BODY_SWAY_AMPLITUDE = 3;

    const anim = new Konva.Animation((frame) => {
      if (lineRef.current) {
        const dashOffset = (frame.time / 25) % 20;
        lineRef.current.dashOffset(-dashOffset);
      }

      if (!personRef.current && !idleAvatarRef.current) return;

      const now = performance.now();
      const phase = animPhaseRef.current;

      // ── WAVING: animasi idle avatar front-facing ──
      if (phase === "waving") {
        if (idleAvatarRef.current && wavingArmRef.current) {
          const swing = Math.sin(frame.time * WAVE_ARM_FREQ) * WAVE_ARM_AMPLITUDE;
          wavingArmRef.current.rotation(swing);
        }
        if (idleAvatarRef.current && idlePositionRef.current) {
          const bounce = Math.sin(frame.time * BODY_SWAY_FREQ) * BODY_SWAY_AMPLITUDE;
          idleAvatarRef.current.x(idlePositionRef.current.x);
          idleAvatarRef.current.y(idlePositionRef.current.y + bounce);
        }
        const layer = (idleAvatarRef.current || personRef.current)?.getLayer();
        if (layer) layer.batchDraw();
        return;
      }

      // ── Fase navigasi: butuh path data ──
      const pts = activeStepPathPointsRef.current;
      if (pts.length < 4) return;

      const totalLen = prevPathLengthRef.current;
      if (totalLen <= 0) return;

      if (phase === "rotating") {
        const elapsed = now - rotateStartTimeRef.current;
        const progress = Math.min(elapsed / ROTATION_DURATION, 1);
        const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

        const p0 = getPointAtDistance(pts, 0);
        const fromAngle = rotateFromAngleRef.current;
        const toAngle = rotateToAngleRef.current;

        let diff = toAngle - fromAngle;
        diff = ((diff + 180) % 360 + 360) % 360 - 180;

        personRef.current.x(p0.x);
        personRef.current.y(p0.y);

        if (progress < 1) {
          personRef.current.rotation(fromAngle + diff * ease);
        } else {
          personRef.current.rotation(toAngle);
          animPhaseRef.current = "walking";
          walkStartTimeRef.current = now;
        }

        if (leftFootRef.current && rightFootRef.current) {
          leftFootRef.current.x(0);
          rightFootRef.current.x(0);
        }
      } else if (phase === "walking") {
        let currentWalkSpeed = WALK_SPEED;
        const currentStep = navigationStepsRef.current[activeStepIndexRef.current];
        if (currentStep && currentStep.teks) {
          const estimatedSpeechMs = Math.max((currentStep.teks.length / 17) * 1000, 2000);
          const walkDurationSec = Math.max((estimatedSpeechMs - ROTATION_DURATION) / 1000, 1);
          if (totalLen > 0) {
            currentWalkSpeed = totalLen / walkDurationSec;
          }
        }

        const timeDeltaSec = frame.timeDiff / 1000;
        walkedDistanceRef.current = Math.min(
          walkedDistanceRef.current + currentWalkSpeed * timeDeltaSec,
          totalLen
        );

        const distance = walkedDistanceRef.current;
        const isMoving = distance < totalLen;
        const { x, y, angle } = getPointAtDistance(pts, distance);

        let targetAngle = angle;
        let currentAngle = personRef.current.rotation();
        let diff = targetAngle - currentAngle;
        diff = ((diff + 180) % 360 + 360) % 360 - 180;

        let turnSpeed = 400 * timeDeltaSec;
        let newAngle;
        if (Math.abs(diff) <= turnSpeed) {
          newAngle = targetAngle;
        } else {
          newAngle = currentAngle + Math.sign(diff) * turnSpeed;
        }

        personRef.current.x(x);
        personRef.current.y(y);
        personRef.current.rotation(newAngle);

        // Report avatar position for camera follow (throttled ~250ms)
        const now2 = performance.now();
        if (onAvatarPositionChangeRef.current && now2 - lastAvatarReportRef.current > 250) {
          lastAvatarReportRef.current = now2;
          onAvatarPositionChangeRef.current(x, y);
        }

        if (leftFootRef.current && rightFootRef.current) {
          const footSwing = isMoving ? Math.sin(frame.time * LEG_SWING_FREQ) * 8 : 0;
          leftFootRef.current.x(footSwing);
          rightFootRef.current.x(-footSwing);
        }

        if (!isMoving) {
          const nextPts = nextStepPathPointsRef.current;
          if (nextPts && nextPts.length >= 4) {
            const nextDir = getPointAtDistance(nextPts, 0);
            animPhaseRef.current = "pre-rotating";
            rotateStartTimeRef.current = performance.now();
            rotateFromAngleRef.current = personRef.current.rotation();
            rotateToAngleRef.current = nextDir.angle;
          } else if (activeStepIndexRef.current === navigationStepsRef.current.length - 1) {
            // Rute selesai sepenuhnya! Ubah avatar menjadi front-facing waving di titik tujuan
            animPhaseRef.current = "waving";
            idlePositionRef.current = { x, y };
            if (idleAvatarRef.current) {
              idleAvatarRef.current.x(x);
              idleAvatarRef.current.y(y);
              idleAvatarRef.current.visible(true);
              idleAvatarRef.current.opacity(1);
            }
            if (personRef.current) personRef.current.visible(false);
            if (wavingArmRef.current) {
              wavingArmRef.current.visible(true);
              wavingArmRef.current.opacity(1);
            }
          }
        }
      } else if (phase === "pre-rotating") {
        const elapsed = now - rotateStartTimeRef.current;
        const progress = Math.min(elapsed / ROTATION_DURATION, 1);
        const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

        const fromAngle = rotateFromAngleRef.current;
        const toAngle = rotateToAngleRef.current;

        let diff = toAngle - fromAngle;
        diff = ((diff + 180) % 360 + 360) % 360 - 180;

        personRef.current.rotation(fromAngle + diff * ease);

        if (leftFootRef.current && rightFootRef.current) {
          leftFootRef.current.x(0);
          rightFootRef.current.x(0);
        }
      }

      const layerNode = lineRef.current || personRef.current;
      const layer = layerNode?.getLayer();
      if (layer) layer.batchDraw();
    });

    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!selectedKioskData || activeStepPathPoints.length > 0]);

  const drawGrid = () => {
    const lines = [];
    const { width, height } = calculatedMapSize;
    const gridColor = isDarkMode ? "#334155" : "#e0e0e0";
    for (let i = 0; i < width / GRID_SIZE; i++) {
      lines.push(<Line key={`v${i}`} points={[Math.round(i * GRID_SIZE), 0, Math.round(i * GRID_SIZE), height]} stroke={gridColor} strokeWidth={1} listening={false} perfectDrawEnabled={false} />);
    }
    for (let j = 0; j < height / GRID_SIZE; j++) {
      lines.push(<Line key={`h${j}`} points={[0, Math.round(j * GRID_SIZE), width, Math.round(j * GRID_SIZE)]} stroke={gridColor} strokeWidth={1} listening={false} perfectDrawEnabled={false} />);
    }
    return lines;
  };


  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", background: isDarkMode ? "#0f172a" : "#f5f5f5" }}>
      {mapSize.width > 0 && mapSize.height > 0 && (
        <Stage width={mapSize.width} height={mapSize.height}>
          <Layer>
            <Group scaleX={scaleAndOffset.scale} scaleY={scaleAndOffset.scale} x={scaleAndOffset.x} y={scaleAndOffset.y}>
              {showGrid && drawGrid()}

              {showBorder && mapBounds && (
                <Rect
                  x={mapBounds.x}
                  y={mapBounds.y}
                  width={mapBounds.width}
                  height={mapBounds.height}
                  fill={isDarkMode ? "#0f172a" : "#ffffff"}
                  stroke={isDarkMode ? "#3b82f6" : "#1a73c8"}
                  strokeWidth={isDarkMode ? 1.5 : 2.5}
                  cornerRadius={16}
                  shadowColor="rgba(26, 115, 200, 0.08)"
                  shadowBlur={10}
                  shadowOffset={{ x: 0, y: 4 }}
                  listening={false}
                  perfectDrawEnabled={false}
                  shadowForStrokeEnabled={false}
                />
              )}

              {/* Render Ruangan bersih senada background (Tanpa Endpoint) */}
              {currentFloorRooms
                .map((room) => {
                  let textContent = getDisplayNodeName(room, language);
                  if (!textContent) textContent = translateName("Tanpa Nama", language);
                  const textContentLen = Math.max(1, textContent.length);
                  const longestWordLen = Math.max(...textContent.split(' ').map(w => w.length), 1);
                  const actualUsableWidth = Math.max(10, room.width - 10);
                  const actualUsableHeight = Math.max(10, room.height - 10);

                  const maxFontSizeWord = actualUsableWidth / (longestWordLen * 0.65);
                  const safetyFactor = textContent.split(' ').length > 1 ? 1.5 : 1.1;
                  const maxFontSizeArea = Math.sqrt((actualUsableWidth * actualUsableHeight) / (textContentLen * 0.65 * 1.2 * safetyFactor));
                  const maxFontSizeSingleLine = actualUsableHeight / 1.2;

                  const fontSize = Math.max(9, Math.min(maxFontSizeWord, maxFontSizeArea, maxFontSizeSingleLine));

                  const isPintu = room.is_connector || room.name?.toLowerCase().includes('pintu');
                  const isLift = room.name?.toLowerCase().includes('lift');
                  const isStairs = room.name?.toLowerCase().includes('tangga') || room.name?.toLowerCase().includes('stairs');
                  
                  let fillCol = isDarkMode ? "#1e293b" : "#f8f9fa";
                  let strokeCol = isDarkMode ? "#334155" : "#dae0e5";
                  let textFill = isDarkMode ? "#f8fafc" : "#495057";

                  if (isPintu) {
                    fillCol = "#4CAF50"; strokeCol = "#2E7D32"; textFill = "#ffffff";
                  } else if (isLift) {
                    fillCol = "#9C27B0"; strokeCol = "#6A1B9A"; textFill = "#ffffff";
                  } else if (isStairs) {
                    fillCol = "#FF9800"; strokeCol = "#E65100"; textFill = "#ffffff";
                  }

                  return (
                    <Group
                      key={room.id}
                      onClick={(e) => onRoomClick && onRoomClick(room, e)}
                      onTap={(e) => onRoomClick && onRoomClick(room, e)}
                      onMouseEnter={(e) => { if (onRoomClick) { e.target.getStage().container().style.cursor = 'pointer'; } }}
                      onMouseLeave={(e) => { if (onRoomClick) { e.target.getStage().container().style.cursor = 'default'; } }}
                    >
                      <Rect x={room.x} y={room.y} width={room.width} height={room.height} fill={fillCol} stroke={strokeCol} strokeWidth={2} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
                      <Text
                        text={textContent}
                        x={room.x} y={room.y} width={room.width} height={room.height}
                        fontSize={fontSize} fontStyle="bold" fill={textFill}
                        align="center" verticalAlign="middle" padding={5}
                        wrap="word" ellipsis={false}
                        perfectDrawEnabled={false}
                        listening={false}
                      />
                    </Group>
                  );
                })}

              {currentFloorKiosks
                .map((kiosk) => {
                  let textContent = getDisplayNodeName(kiosk, language);
                  if (!textContent) textContent = "Kiosk";
                  const isPintu = kiosk.name?.toLowerCase().includes('pintu');
                  const isLift = kiosk.name?.toLowerCase().includes('lift');
                  const isStairs = kiosk.name?.toLowerCase().includes('tangga') || kiosk.name?.toLowerCase().includes('stairs');

                  let fillCol = "#2196F3";
                  let strokeCol = "#0D47A1";

                  if (isPintu) {
                    fillCol = "#4CAF50"; strokeCol = "#2E7D32";
                  } else if (isLift) {
                    fillCol = "#9C27B0"; strokeCol = "#6A1B9A";
                  } else if (isStairs) {
                    fillCol = "#FF9800"; strokeCol = "#E65100";
                  }

                  const textContentLen = Math.max(1, textContent.length);
                  const longestWordLen = Math.max(...textContent.split(' ').map(w => w.length), 1);
                  const actualUsableWidth = Math.max(10, kiosk.width - 10);
                  const actualUsableHeight = Math.max(10, kiosk.height - 10);

                  const maxFontSizeWord = actualUsableWidth / (longestWordLen * 0.65);
                  const safetyFactor = textContent.split(' ').length > 1 ? 1.5 : 1.1;
                  const maxFontSizeArea = Math.sqrt((actualUsableWidth * actualUsableHeight) / (textContentLen * 0.65 * 1.2 * safetyFactor));
                  const maxFontSizeSingleLine = actualUsableHeight / 1.2;

                  const fontSize = Math.max(9, Math.min(maxFontSizeWord, maxFontSizeArea, maxFontSizeSingleLine));

                  const isInteractive = !!onRoomClick;

                  return (
                    <Group
                      key={kiosk.id}
                      onClick={(e) => { if (isInteractive) onRoomClick(kiosk, e); }}
                      onTap={(e) => { if (isInteractive) onRoomClick(kiosk, e); }}
                      onMouseEnter={(e) => { if (isInteractive) { e.target.getStage().container().style.cursor = 'pointer'; } }}
                      onMouseLeave={(e) => { if (isInteractive) { e.target.getStage().container().style.cursor = 'default'; } }}
                    >
                      <Rect x={kiosk.x} y={kiosk.y} width={kiosk.width} height={kiosk.height} fill={fillCol} stroke={strokeCol} strokeWidth={2} perfectDrawEnabled={false} shadowForStrokeEnabled={false} listening={!isInteractive ? false : undefined} />

                      <Text
                        text={textContent}
                        x={kiosk.x} y={kiosk.y} width={kiosk.width} height={kiosk.height}
                        fontSize={fontSize} fontStyle="bold" fill="#ffffff"
                        align="center" verticalAlign="middle" padding={5}
                        wrap="word" ellipsis={false}
                        perfectDrawEnabled={false}
                        listening={false}
                      />
                    </Group>
                  );
                })}

              {/* Akhir Static Layer */}
            </Group>
          </Layer>

          {/* Layer Animasi Terpisah (penting untuk performa mobile) */}
          <Layer>
            <Group scaleX={scaleAndOffset.scale} scaleY={scaleAndOffset.scale} x={scaleAndOffset.x} y={scaleAndOffset.y}>
              {/* Garis Rute */}
              {pathPoints.length > 0 && (
                <>
                  <Line points={pathPoints} stroke="rgba(255, 0, 0, 0.2)" strokeWidth={5} lineCap="round" lineJoin="round" tension={0} />
                  {activeStepPathPoints.length > 0 && (
                    <Line ref={lineRef} points={activeStepPathPoints} stroke="red" strokeWidth={5} dash={[10, 10]} lineCap="round" lineJoin="round" tension={0} />
                  )}
                </>
              )}

              {/* Front-facing idle avatar — tampil saat kiosk dipilih, tanpa rotasi */}
              <Group ref={idleAvatarRef} listening={false}>
                {/* Kepala */}
                <Circle x={0} y={-16} radius={7} fill="#FFCCBC" stroke="#333" strokeWidth={1} />
                {/* Kacamata (front view) */}
                <Line points={[-3, -17, 3, -17]} stroke="#333" strokeWidth={1.5} />
                <Circle x={-3.5} y={-17} radius={2} fill="rgba(100,100,100,0.3)" stroke="#333" strokeWidth={0.8} />
                <Circle x={3.5} y={-17} radius={2} fill="rgba(100,100,100,0.3)" stroke="#333" strokeWidth={0.8} />
                {/* Badan */}
                <Rect x={0} y={-2} width={14} height={16} fill="#2196F3" cornerRadius={4} offsetX={7} offsetY={8} />
                {/* Lengan kiri (diam) */}
                <Line points={[-7, -8, -10, 2, -8, 8]} stroke="#FFCCBC" strokeWidth={3} lineCap="round" lineJoin="round" />
                {/* Lengan kanan (melambai) — pivot di bahu kanan */}
                <Group ref={wavingArmRef} x={7} y={-8}>
                  <Line points={[0, 0, 4, -8, 6, -12]} stroke="#FFCCBC" strokeWidth={3} lineCap="round" lineJoin="round" />
                  {/* Tangan kecil */}
                  <Circle x={6} y={-12} radius={2} fill="#FFCCBC" />
                </Group>
                {/* Kaki */}
                <Line points={[-3, 6, -4, 16]} stroke="#333" strokeWidth={3} lineCap="round" />
                <Line points={[3, 6, 4, 16]} stroke="#333" strokeWidth={3} lineCap="round" />
                {/* Sepatu */}
                <Rect x={-6} y={15} width={5} height={3} fill="#333" cornerRadius={1} />
                <Rect x={2} y={15} width={5} height={3} fill="#333" cornerRadius={1} />
              </Group>

              {/* Top-down walking avatar — tampil saat navigasi aktif */}
              {(selectedKioskData || activeStepPathPoints.length >= 4) && (
                <Group ref={personRef} listening={false}>
                  <Rect ref={leftFootRef} x={0} y={-8} width={10} height={6} fill="#333" cornerRadius={3} offsetX={5} offsetY={3} />
                  <Rect ref={rightFootRef} x={0} y={8} width={10} height={6} fill="#333" cornerRadius={3} offsetX={5} offsetY={3} />
                  <Rect x={0} y={0} width={16} height={24} fill="#2196F3" cornerRadius={8} offsetX={8} offsetY={12} />
                  <Circle x={0} y={0} radius={7} fill="#FFCCBC" stroke="#333" strokeWidth={1} />
                  <Line points={[3, -4, 3, 4]} stroke="#333" strokeWidth={1.5} />
                  <Circle x={4} y={-3} radius={2.5} fill="#333" />
                  <Circle x={4} y={3} radius={2.5} fill="#333" />
                </Group>
              )}
            </Group>
          </Layer>
        </Stage>
      )}
    </div>
  );
}