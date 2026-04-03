import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState("Checking backend...")

  useEffect(() => {
    // Replace with your actual backend URL if different
    fetch('http://localhost:5000/')
      .then(res => res.text())
      .then(data => setStatus(data))
      .catch(err => setStatus("Backend is Offline ❌"));
  }, [])

  return (
    <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'Arial' }}>
      <h1 style={{ color: '#ff5722' }}>Bazaar@IITGN</h1>
      <p>Status: <strong>{status}</strong></p>
      
      <div style={{ marginTop: '20px', border: '1px solid #ddd', padding: '20px', borderRadius: '10px' }}>
        <h3>CP1 Checklist:</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>✅ Basic Frontend (Vite/React)</li>
          <li>✅ Basic Backend (Node/Express)</li>
          <li>✅ Database (Atlas Connected)</li>
          <li>✅ Private Git Repo</li>
        </ul>
      </div>
    </div>
  )
}

export default App