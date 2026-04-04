import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../services/auth';
import { API_URL } from '../config/constants';

const CATEGORIES = ["All", "Cycles", "Books", "Electronics", "Hostel Gear", "Mattresses", "Lab Equipment", "Clothing"];
const HOSTELS = ["All", "Aibaan", "Beauki", "Chimair", "Duven", "Emiet", "Firpeal", "Griwkish", "Hiqom", "Ijokha", "Jurqia", "Kyzeel", "Lekhag"];

const KarmaColor = (k) => {
  if (k >= 4.8) return 'text-emerald-400';
  if (k >= 4.0) return 'text-yellow-400';
  return 'text-red-400';
};

const Home = ({ dbUser }) => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedHostel, setSelectedHostel] = useState("All");
  const [bookmarks, setBookmarks] = useState(dbUser?.bookmarks || []);
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });

  useEffect(() => {
    setBookmarks(dbUser?.bookmarks || []);
  }, [dbUser]);

  useEffect(() => {
    fetch(`${API_URL}/api/items`)
      .then(res => res.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const toggleBookmark = async (e, itemId) => {
    e.preventDefault();
    e.stopPropagation();
    const email = auth.currentUser?.email;
    if (!email) return;

    const isBookmarked = bookmarks.includes(itemId);
    // Optimistic update
    setBookmarks(prev => isBookmarked ? prev.filter(b => b !== itemId) : [...prev, itemId]);

    try {
      const res = await fetch(`${API_URL}/api/users/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, itemId })
      });
      const updated = await res.json();
      setBookmarks(updated);
    } catch (err) {
      // Revert on error
      setBookmarks(prev => isBookmarked ? [...prev, itemId] : prev.filter(b => b !== itemId));
    }
  };

  const filteredItems = items
    .filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const matchesHostel = selectedHostel === "All" || item.hostel === selectedHostel;

      const isAvailable = item.status !== 'sold';
      const isNotMine = item.seller !== auth.currentUser?.email;
      const minOk = !priceRange.min || item.price >= Number(priceRange.min);
      const maxOk = !priceRange.max || item.price <= Number(priceRange.max);
      return matchesSearch && matchesCategory && matchesHostel && isAvailable && isNotMine && minOk && maxOk;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      return 0;
    });

  return (
    <div className="min-h-screen bg-[#f5f4f0] pb-28" style={{ fontFamily: "'Space Mono', monospace" }}>
      {/* Header */}
      <header className="bg-[#0a0a0a] text-white px-5 pt-10 pb-5 sticky top-0 z-30">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-3xl font-black text-orange-400 tracking-tighter leading-none">BAZAAR</h1>
            <p className="text-[9px] text-gray-500 uppercase tracking-[0.25em] font-bold mt-0.5">IIT Gandhinagar · Campus Exchange</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-lg">
              <span className="text-orange-400 text-[9px] font-black uppercase tracking-widest">LIVE</span>
            </div>
            {auth.currentUser?.email === 'sai.gawali@iitgn.ac.in' && (
              <Link
                to="/admin"
                className="bg-red-500/20 border border-red-500 hover:bg-red-500/30 px-3 py-1.5 rounded-lg transition-all"
                title="Admin Dashboard"
              >
                <span className="text-red-400 text-[9px] font-black uppercase tracking-widest">🛡️ ADMIN</span>
              </Link>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">⌕</span>
          <input
            type="text"
            placeholder="Search items, categories..."
            className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-600 pl-10 pr-4 py-3 rounded-2xl text-sm outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30'
                  : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Location Filters (Hostel & Wing) */}
        <div className="mt-3 space-y-2">
          <div>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1.5">📍 Hostel</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {HOSTELS.map(h => (
                <button
                  key={h}
                  onClick={() => setSelectedHostel(h)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold whitespace-nowrap transition-all border ${
                    selectedHostel === h
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white/10 text-gray-400 border-gray-600 hover:border-gray-500'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

        </div>
      </header>

      {/* Sort + Count bar */}
      <div className="px-5 py-3 flex justify-between items-center gap-3 flex-wrap">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
          {loading ? '...' : `${filteredItems.length} listings`}
        </span>
        <div className="flex gap-2 items-center">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-white border border-gray-200 text-gray-600 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl outline-none cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
          </select>
          <input type="number" placeholder="Min ₹" value={priceRange.min}
            onChange={e => setPriceRange(p => ({ ...p, min: e.target.value }))}
            className="w-24 bg-white border border-gray-200 text-gray-600 text-[10px] font-bold px-3 py-2 rounded-xl outline-none focus:border-orange-400"
          />
          <span className="text-gray-300 font-bold">–</span>
          <input type="number" placeholder="Max ₹" value={priceRange.max}
            onChange={e => setPriceRange(p => ({ ...p, max: e.target.value }))}
            className="w-24 bg-white border border-gray-200 text-gray-600 text-[10px] font-bold px-3 py-2 rounded-xl outline-none focus:border-orange-400"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="px-5 grid grid-cols-2 gap-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden animate-pulse">
              <div className="h-44 bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                <div className="h-4 bg-gray-200 rounded-full w-1/2" />
              </div>
            </div>
          ))
        ) : filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <Link
              to={`/item/${item._id}`}
              key={item._id}
              className="group relative bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col transition-all hover:shadow-xl hover:-translate-y-1 active:scale-95"
            >
              {/* Image */}
              <div className="relative h-44 bg-gray-100 overflow-hidden">
                <img
                  src={item.images?.[0] || item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Price chip */}
                <div className="absolute bottom-3 left-3 bg-[#0a0a0a]/90 backdrop-blur-sm text-white px-3 py-1 rounded-lg font-black text-sm">
                  ₹{item.price.toLocaleString()}
                </div>
                {/* Bookmark btn */}
                <button
                  onClick={(e) => toggleBookmark(e, item._id)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-lg"
                  style={{ background: bookmarks.includes(item._id) ? '#f97316' : 'rgba(255,255,255,0.9)' }}
                >
                  <span className="text-sm" style={{ color: bookmarks.includes(item._id) ? 'white' : '#9ca3af' }}>
                    {bookmarks.includes(item._id) ? '♥' : '♡'}
                  </span>
                </button>
                {/* Multi-image indicator */}
                {item.images?.length > 1 && (
                  <div className="absolute top-3 left-3 bg-black/60 text-white text-[9px] font-bold px-2 py-1 rounded-lg">
                    1/{item.images.length}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4 flex flex-col flex-1">
                <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">{item.category}</span>
                <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{item.title}</h3>
                <p className="text-gray-400 text-[10px] mt-1 line-clamp-1">{item.description || "—"}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <span className="text-[9px] text-gray-400 font-bold">📍 {item.hostel}</span>
                  <span className={`text-[9px] font-black ${KarmaColor(4.8)}`}>⭐ 4.8</span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-2 text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-400 text-sm font-bold">No listings found</p>
            <p className="text-gray-300 text-xs mt-1">Try a different search or category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;