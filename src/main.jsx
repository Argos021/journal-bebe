import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

function Root() {
  const [tab, setTab] = useState("journal");
  const [formOpen, setFormOpen] = useState(false); // true when boire or couche form is open
  const [headerVisible, setHeaderVisible] = useState(true); // true when header still in view

  const showBoireRef = useRef(null);
  const showCoucheRef = useRef(null);

  // Watch scroll to detect when header scrolls out of view (header is ~120px tall)
  useEffect(() => {
    const onScroll = () => {
      setHeaderVisible(window.scrollY < 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // run once on mount
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // FABs visible only when: journal tab + no form open + header scrolled out of view
  const showFAB = tab === "journal" && !formOpen && !headerVisible;

  return (
    <>
      <App
        onRegisterShowBoire={(fn) => { showBoireRef.current = fn; }}
        onRegisterShowCouche={(fn) => { showCoucheRef.current = fn; }}
        onTabChange={(t) => setTab(t)}
        onFormOpen={() => setFormOpen(true)}
        onFormClose={() => setFormOpen(false)}
      />

      {showFAB && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          alignItems: "flex-end",
          zIndex: 9999,
        }}>
          {/* Couche */}
          <button
            onClick={() => showCoucheRef.current?.()}
            style={{
              width: "50px", height: "50px", borderRadius: "50%",
              border: "none",
              background: "linear-gradient(135deg,#64b5f6,#1565c0)",
              color: "white", fontSize: "22px", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(21,101,192,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            🧷
          </button>
          {/* Boire */}
          <button
            onClick={() => showBoireRef.current?.()}
            style={{
              width: "56px", height: "56px", borderRadius: "50%",
              border: "none",
              background: "linear-gradient(135deg,#e8906a,#e06b8a)",
              color: "white", fontSize: "26px", fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(232,144,106,0.55)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            +
          </button>
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
