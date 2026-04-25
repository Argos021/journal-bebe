import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { auth } from './firebase.js'
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth'

function AuthGate() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
    return unsub;
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Email ou mot de passe incorrect.');
    }
    setLoading(false);
  }

  if (checking) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f5c6a0,#f9a8c0)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <div style={{fontSize:60}}>🍼</div>
      <div style={{fontSize:18,fontWeight:"bold",color:"#7a3b1e"}}>Journal Bébé</div>
    </div>
  );

  if (!user) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f5c6a0,#f9a8c0)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Georgia,serif"}}>
      <div style={{fontSize:60,marginBottom:8}}>🍼</div>
      <h1 style={{margin:"0 0 4px",color:"#7a3b1e",fontSize:24}}>Journal Bébé</h1>
      <p style={{color:"#b05a30",fontSize:13,margin:"0 0 32px"}}>Connexion requise</p>

      <div style={{background:"white",borderRadius:20,padding:28,width:"100%",maxWidth:360,boxShadow:"0 8px 40px rgba(0,0,0,0.15)"}}>
        <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={{fontSize:12,fontWeight:"bold",color:"#7a3b1e",display:"block",marginBottom:6}}>📧 Email</label>
            <input
              type="email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              placeholder="famille@bebe.com"
              required
              style={{width:"100%",padding:"12px 14px",borderRadius:10,border:"1.5px solid #e8c5a8",fontSize:15,boxSizing:"border-box",outline:"none",fontFamily:"Georgia,serif"}}
            />
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:"bold",color:"#7a3b1e",display:"block",marginBottom:6}}>🔒 Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{width:"100%",padding:"12px 14px",borderRadius:10,border:"1.5px solid #e8c5a8",fontSize:15,boxSizing:"border-box",outline:"none",fontFamily:"Georgia,serif"}}
            />
          </div>
          {error && (
            <div style={{background:"#ffebee",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c62828",fontWeight:"bold"}}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{padding:"14px 0",borderRadius:12,border:"none",background:"linear-gradient(135deg,#e8906a,#e06b8a)",color:"white",fontSize:16,fontWeight:"bold",cursor:"pointer",opacity:loading?0.7:1}}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
      <p style={{fontSize:11,color:"#b05a30",marginTop:20,textAlign:"center"}}>
        Utilise les identifiants créés dans Firebase
      </p>
    </div>
  );

  return <App onSignOut={() => signOut(auth)} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate />
  </React.StrictMode>
)
