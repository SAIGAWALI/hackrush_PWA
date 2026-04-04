import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/auth';
import { getSocket } from './services/socket';
import { API_URL } from './config/constants';

import Auth from './pages/Auth';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Sell from './pages/Sell';
import ItemDetail from './pages/ItemDetail';
import Watchlist from './pages/Watchlist';
import Inbox from './pages/Inbox';
import Admin from './pages/Admin';
import BottomNav from './components/BottomNav';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbUser, setDbUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (currentUser.providerData[0].providerId === 'password' && !currentUser.emailVerified) {
          alert("Please verify your email address first!");
          signOut(auth);
          setUser(null);
        } else {
          setUser(currentUser);

          // Sync user to MongoDB
          try {
            const res = await fetch(`${API_URL}/api/users/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                uid: currentUser.uid,
                email: currentUser.email,
                name: currentUser.displayName || currentUser.email.split('@')[0]
              })
            });
            const userData = await res.json();
            
            // Check if account is disabled
            if (res.status === 403 || userData.disabled) {
              alert('⛔ Your account has been disabled by admins. Please contact them for more details.');
              signOut(auth);
              setUser(null);
              return;
            }
            
            setDbUser(userData);
          } catch (err) {
            console.error("Sync failed", err);
          }

          // Register with socket server (for inbox notifications)
          const socket = getSocket();
          socket.emit('register', currentUser.email);

          // Listen for inbox updates to bump badge
          socket.on('inbox_update', () => {
            setUnreadCount(prev => prev + 1);
          });

          // Fetch initial unread count
          try {
            const res = await fetch(`${API_URL}/api/conversations/unread-count?email=${encodeURIComponent(currentUser.email)}`);
            const data = await res.json();
            setUnreadCount(data.count || 0);
          } catch { }
        }
      } else {
        setUser(null);
        setDbUser(null);
        setUnreadCount(0);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <div className="text-5xl font-black text-orange-500 tracking-tighter mb-2 animate-pulse" style={{ fontFamily: "'Space Mono', monospace" }}>
          BAZAAR
        </div>
        <div className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-bold" style={{ fontFamily: "'Space Mono', monospace" }}>
          Campus Marketplace · IITGN
        </div>
      </div>
    </div>
  );

  return (
    <Router>
      <div className="min-h-screen bg-[#f5f4f0]">
        <Routes>
          <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Home dbUser={dbUser} /> : <Navigate to="/auth" />} />
          <Route path="/item/:id" element={user ? <ItemDetail dbUser={dbUser} setDbUser={setDbUser} /> : <Navigate to="/auth" />} />
          <Route path="/profile" element={user ? <Profile dbUser={dbUser} setDbUser={setDbUser} /> : <Navigate to="/auth" />} />
          <Route path="/sell" element={user ? <Sell /> : <Navigate to="/auth" />} />
          <Route path="/watchlist" element={user ? <Watchlist dbUser={dbUser} /> : <Navigate to="/auth" />} />
          <Route path="/inbox" element={user ? <Inbox /> : <Navigate to="/auth" />} />
          <Route path="/admin" element={user ? <Admin /> : <Navigate to="/auth" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        {user && <BottomNav unreadCount={unreadCount} setUnreadCount={setUnreadCount} />}
      </div>
    </Router>
  );
}

export default App;