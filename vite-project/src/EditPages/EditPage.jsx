import { useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import "./Edit.css";

export default function App() {
  return (
    <div>
      {/* ── Header Diperbarui ── */}
      <header className="header">
        <span className="header-logo">Wayfinder</span>
        <div className="header-actions">
          <button className="header-btn cancel">Cancel</button>
          <button className="header-btn save">Save</button>
        </div>
      </header>

      {/* ── Main Layout Baru ── */}
      <div className="main-layout">
        
        {/* Peta sekarang memenuhi sisi kiri */}
        <main className="map-panel">
          <TransformWrapper initialScale={1} minScale={0.5} maxScale={5} centerOnInit={true}>
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%", cursor: "grab" }}
              contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <div className="map-content">
                <span className="map-placeholder-text">Peta Aktif (Pinch & Pan)</span>
              </div>
            </TransformComponent>
          </TransformWrapper>
        </main>

        {/* Panel Baru di sebelah kanan */}
        <aside className="right-panel">
          <div className="dnd-container">
            <h3>Drag & Drop Elements</h3>
            <div className="dnd-zone">
              <p>Drop items here</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}