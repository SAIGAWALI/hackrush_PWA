import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../services/auth';
import { API_URL } from '../config/constants';

const Watchlist = ({ dbUser }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dbUser?.bookmarks?.length) {
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/api/items`)
      .then(res => res.json())
      .then(data => {
        const saved = data.filter(item => dbUser.bookmarks.includes(item._id));
        setItems(saved);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [dbUser]);

  const removeBookmark = async (itemId) => {
    const email = auth.currentUser?.email;
    if (!email) return;

    setItems(prev => prev.filter(i => i._id !== itemId));

    try {
      await fetch(`${API_URL}/api/users/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, itemId })
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f4f0] pb-28" style={{ fontFamily: "'Space Mono', monospace" }}>
      {/* Header */}
      <div className="bg-[#0a0a0a] text-white px-5 pt-12 pb-6">
        <h1 className="text-3xl font-black tracking-tighter text-white">Watchlist</h1>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
          {items.length} saved {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-3xl overflow-hidden animate-pulse flex">
                <div className="w-28 h-28 bg-gray-200 shrink-0" />
                <div className="p-4 flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-4 bg-gray-200 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">♡</div>
            <p className="text-gray-500 font-black text-lg">Nothing saved yet</p>
            <p className="text-gray-400 text-xs mt-2 mb-6">Bookmark items from the home feed to track them here.</p>
            <Link
              to="/"
              className="bg-[#0a0a0a] text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest"
            >
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <div key={item._id} className="relative bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex">
                <Link to={`/item/${item._id}`} className="flex flex-1">
                  {/* Image */}
                  <div className="w-28 h-28 bg-gray-100 shrink-0 overflow-hidden">
                    <img
                      src={item.images?.[0] || item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {item.status === 'sold' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center w-28">
                        <span className="bg-black text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">SOLD</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">{item.category}</span>
                      <h3 className="font-black text-gray-900 text-sm truncate mt-0.5">{item.title}</h3>
                      <p className="text-gray-400 text-[10px] truncate">{item.description}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-black text-orange-500 text-base">₹{item.price.toLocaleString()}</span>
                      <span className={`text-[9px] font-black uppercase ${item.status === 'sold' ? 'text-red-400' : 'text-emerald-500'}`}>
                        ● {item.status === 'sold' ? 'Sold' : 'Available'}
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Remove bookmark */}
                <button
                  onClick={() => removeBookmark(item._id)}
                  className="absolute top-3 right-3 w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center text-white text-sm active:scale-90 transition-all"
                >
                  ♥
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Watchlist;