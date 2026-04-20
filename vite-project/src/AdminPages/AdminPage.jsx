import { useState } from "react";
import { useNavigate } from "react-router";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import "./Admin.css";

// ── Icon components ──
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

const EditIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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

export default function App() {
  const navigate = useNavigate();
  const [search,      setSearch]      = useState("");
  const [outputText,  setOutputText]  = useState("");
  const [location,    setLocation]    = useState("");
  const [floor,       setFloor]       = useState("Lantai 1");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleSearchKey = (e) => {
    if (e.key === "Enter" && search.trim()) {
      setOutputText(`Destination: ${search.trim()}\nLocation: ${location || "—"}\nFloor: ${floor || "—"}`);
    }
  };

  // Fungsi untuk membuka modal konfirmasi logout
  const openLogoutConfirm = () => {
    setIsConfirmOpen(true);
  };

  // Fungsi untuk handle "Iya" - logout ke main page
  const handleLogoutYes = () => {
    setIsConfirmOpen(false);
    navigate("/");
  };

  // Fungsi untuk handle "Tidak" - tetap di admin page
  const handleLogoutNo = () => {
    setIsConfirmOpen(false);
  };

  return (
    <div>
      <header className="header">
        <span className="header-logo">Wayfinder</span>
        <div className="header-actions">
          <button className="header-edit-btn" onClick={() => navigate("/edit")}>
            <EditIcon />
            Edit
          </button>
          <button className="header-login-btn" onClick={openLogoutConfirm}>
            <LoginIcon />
            Logout
          </button>
        </div>
      </header>

      {/* MODAL KONFIRMASI LOGOUT */}
      {isConfirmOpen && (
        <div className="modal-overlay" onClick={handleLogoutNo}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Konfirmasi Logout</h3>
            <p>Apakah Anda yakin ingin logout?</p>
            <div className="confirm-modal-actions">
              <button className="confirm-btn no" onClick={handleLogoutNo}>Tidak</button>
              <button className="confirm-btn yes" onClick={handleLogoutYes}>Iya</button>
            </div>
          </div>
        </div>
      )}

      <div className="main-layout">
        <aside className="left-panel">
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

          <textarea
            className="destination-output"
            placeholder="Destination output text"
            value={outputText}
            onChange={(e) => setOutputText(e.target.value)}
          />

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
            {floor && <div className="floor-selected-chip">{floor}</div>}
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