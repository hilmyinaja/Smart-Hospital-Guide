import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import "./Edit.css";

export default function EditPage() {
  return (
    <div className="edit-page-container">
      {/* Header Khusus Edit */}
      <header className="edit-page-header">
        <span className="edit-page-logo">Wayfinder</span>
        <div className="edit-page-actions">
          <button className="edit-page-btn cancel">Cancel</button>
          <button className="edit-page-btn save">Save</button>
        </div>
      </header>

      {/* Main Content dengan Grid Layout Khusus */}
      <div className="edit-page-layout">
        
        {/* Peta (Kiri) */}
        <main className="edit-page-map">
          <TransformWrapper initialScale={1} minScale={0.5} maxScale={5} centerOnInit={true}>
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%", cursor: "grab" }}
              contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <div className="map-content">
                <span className="map-placeholder-text">Peta Aktif</span>
              </div>
            </TransformComponent>
          </TransformWrapper>
        </main>

        {/* Panel Kanan (Drag & Drop) */}
        <aside className="edit-page-right-panel">
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