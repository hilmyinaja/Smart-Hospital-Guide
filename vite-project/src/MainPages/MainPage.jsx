import { useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import "./Main.css";

// ── Icon components (inline SVG, no extra deps needed) ──
const SearchIcon = () => (
  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ChevronIcon = () => (
  <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const LoginIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

// ── Sample data ──────────────────────────────────────────
const LOCATIONS = ["", "Building A", "Building B", "Building C", "Lobby"];
const FLOORS    = ["", "Lantai 1", "Lantai 2", "Lantai 3", "Lantai 4"];

// ── Main component ───────────────────────────────────────
export default function App() {
  const [search,      setSearch]      = useState("");
  const [outputText,  setOutputText]  = useState("");
  const [location,    setLocation]    = useState("");
  const [floor,       setFloor]       = useState("Lantai 1");

  // When user submits a search, fill the output textarea
  const handleSearchKey = (e) => {
    if (e.key === "Enter" && search.trim()) {
      setOutputText(`Destination: ${search.trim()}\nLocation: ${location || "—"}\nFloor: ${floor || "—"}`);
    }
  };

  return (
    <div>
      {/* ── Header ── */}
      <header className="header">
        <span className="header-logo">Wayfinder</span>
        <button className="header-login-btn">
          <LoginIcon />
          Login
        </button>
      </header>

      {/* ── Body ── */}
      <div className="main-layout">

        {/* Left panel */}
        <aside className="left-panel">

          {/* Search destination */}
          <div className="search-wrapper">
            <input
              className="search-input"
              type="text"
              placeholder="Search destination"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKey}
            />
            <SearchIcon />
          </div>

          {/* Destination output */}
          <textarea
            className="destination-output"
            placeholder="Destination output text"
            value={outputText}
            onChange={(e) => setOutputText(e.target.value)}
          />

          {/* Location dropdown */}
          <div className="dropdown-wrapper">
            <select
              className="dropdown-select"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="" disabled>Location</option>
              {LOCATIONS.filter(Boolean).map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <ChevronIcon />
          </div>

          {/* Floor dropdown + selected chip */}
          <div className="floor-group">
            <div className="dropdown-wrapper">
              <select
                className="dropdown-select"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              >
                <option value="" disabled>Floor</option>
                {FLOORS.filter(Boolean).map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <ChevronIcon />
            </div>
            {floor && (
              <div className="floor-selected-chip">{floor}</div>
            )}
          </div>

        </aside>

        <main className="map-panel">
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={5}
            centerOnInit={true}
          >
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
      </div>
    </div>
  );
}