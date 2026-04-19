import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Stage, Layer, Rect, Text } from "react-konva";
import "./Edit.css";

export default function EditPage() {
  return (
    <div className="edit-page-container">
      <header className="edit-page-header">
        <span className="edit-page-logo">Wayfinder</span>
        <div className="edit-page-actions">
          <button className="edit-page-btn cancel">Cancel</button>
          <button className="edit-page-btn save">Save</button>
        </div>
      </header>

      <div className="edit-page-layout">
        <main className="edit-page-map">
          <TransformWrapper initialScale={1} minScale={0.5} maxScale={5} centerOnInit={true}>
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%", cursor: "grab" }}
            >
              <div className="map-content">
                <span className="map-placeholder-text">Peta Aktif</span>
              </div>
            </TransformComponent>
          </TransformWrapper>
        </main>

        <aside className="edit-page-right-panel">
          <h3>Drag & Drop Elements</h3>
          <div className="dnd-zone">
            {/* Stage Konva sebagai area interaktif */}
            <Stage width={280} height={400}>
              <Layer>
                <Text text="Geser kotak di bawah ini:" x={20} y={10} fill="#8a97a8" />
                <Rect
                  x={90}
                  y={60}
                  width={100}
                  height={100}
                  fill="#1a73c8"
                  draggable
                  onDragStart={(e) => e.target.setAttrs({ shadowOpacity: 0.6, scaleX: 1.1, scaleY: 1.1 })}
                  onDragEnd={(e) => e.target.setAttrs({ shadowOpacity: 0, scaleX: 1, scaleY: 1 })}
                />
              </Layer>
            </Stage>
          </div>
        </aside>
      </div>
    </div>
  );
}