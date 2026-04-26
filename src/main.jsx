import React, { useState, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

function Root() {
  const appRef = useRef(null);
  const [tab, setTab] = useState("journal");

  // These callbacks are passed to App so the FABs can trigger its modals
  const showBoireRef = useRef(null);
  const showCoucheRef = useRef(null);

  return (
    <>
      <App
        onRegisterShowBoire={(fn) => { showBoireRef.current = fn; }}
        onRegisterShowCouche={(fn) => { showCoucheRef.current = fn; }}
        onTabChange={(t) => setTab(t)}
      />

      {/* Floating Action Buttons — rendered at root level, always on top */}
      {tab === "journal" && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          alignItems: "flex-end",
          zIndex: 9999,
        }}>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <span style={{
              background:"rgba(255,255,255,0.95)",
              color:"#1565c0",
              fontSize:"12px",
              fontWeight:"bold",
              padding:"4px 10px",
              borderRadius:"20px",
              boxShadow:"0 2px 8px rgba(0,0,0,0.2)"
            }}>Couche</span>
            <button
              onClick={() => showCoucheRef.current?.()}
              style={{
                width:"50px", height:"50px", borderRadius:"50%",
                border:"none",
                background:"linear-gradient(135deg,#64b5f6,#1565c0)",
                color:"white", fontSize:"22px", cursor:"pointer",
                boxShadow:"0 4px 16px rgba(21,101,192,0.5)",
                display:"flex", alignItems:"center", justifyContent:"center"
              }}>
              🧷
            </button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
            <span style={{
              background:"rgba(255,255,255,0.95)",
              color:"#c2185b",
              fontSize:"12px",
              fontWeight:"bold",
              padding:"4px 10px",
              borderRadius:"20px",
              boxShadow:"0 2px 8px rgba(0,0,0,0.2)"
            }}>Boire</span>
            <button
              onClick={() => showBoireRef.current?.()}
              style={{
                width:"56px", height:"56px", borderRadius:"50%",
                border:"none",
                background:"linear-gradient(135deg,#e8906a,#e06b8a)",
                color:"white", fontSize:"28px", fontWeight:"bold",
                cursor:"pointer",
                boxShadow:"0 4px 20px rgba(232,144,106,0.55)",
                display:"flex", alignItems:"center", justifyContent:"center"
              }}>
              +
            </button>
          </div>
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
