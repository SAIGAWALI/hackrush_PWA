import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, logout } from '../services/auth';
import { API_URL } from '../config/constants';

const Profile = ({ dbUser, setDbUser }) => {
  const [myItems, setMyItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('listings');
  const [ratedItems, setRatedItems] = useState(new Set());  // Track which items have been rated
  const [ratingStates, setRatingStates] = useState({});     // Track selected rating for each item
  const [submittingRating, setSubmittingRating] = useState(null);  // Track which item is being rated
  const userEmail = auth.currentUser?.email;
  const userName = auth.currentUser?.displayName || userEmail?.split('@')[0];

  // Karma comes from DB (no cap, starts at 0)
  const karma = dbUser?.karma ?? 0;
  const karmaDisplay = Number(karma).toFixed(1);
  const karmaColor = karma >= 10 ? '#10b981' : karma >= 5 ? '#f59e0b' : '#fb923c';

  const soldCount = myItems.filter(i => i.status === 'sold').length;
  const activeListings = myItems.filter(i => i.status !== 'sold');
  const soldListings = myItems.filter(i => i.status === 'sold');

  useEffect(() => {
    fetch(`${API_URL}/api/items`)
      .then(res => res.json())
      .then(data => {
        const mine = data.filter(i => i.seller === userEmail);
        setMyItems(mine.sort((a, b) => (a.status === 'sold') - (b.status === 'sold')));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    fetch(`${API_URL}/api/users/purchases?email=${encodeURIComponent(userEmail)}`)
      .then(r => r.json())
      .then(data => setPurchases(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [userEmail]);

  const markAsSold = async (id) => {
    // Removed: Items can only be marked sold through accepting an offer
    // This prevents karma farming by sellers manually marking items as sold
  };

  // Submit rating for a purchase
  const submitRating = async (purchase, rating) => {
    setSubmittingRating(purchase.itemId);
    try {
      const res = await fetch(`${API_URL}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerEmail: userEmail,
          sellerEmail: purchase.sellerEmail,
          itemId: purchase.itemId,
          rating: rating,  // -1, 0, or +1
          comment: ''
        })
      });

      if (res.ok) {
        // Mark as rated
        const updatedRated = new Set(ratedItems);
        updatedRated.add(purchase.itemId);
        setRatedItems(updatedRated);
        
        // Clear rating state
        const newStates = { ...ratingStates };
        delete newStates[purchase.itemId];
        setRatingStates(newStates);

        // Show success feedback
        alert(`Rating submitted! Seller's karma updated.`);
        
        // Refresh user data to see updated karma if they're also a seller
        fetch(`${API_URL}/api/users/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: auth.currentUser?.uid, email: userEmail, name: userName })
        })
          .then(r => r.json())
          .then(updated => {
            if (setDbUser) setDbUser(updated);
          });
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to submit rating');
      }
    } catch (err) {
      console.error('Rating error:', err);
      alert('Error submitting rating');
    } finally {
      setSubmittingRating(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this listing permanently?")) return;
    try {
      const res = await fetch(`${API_URL}/api/items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMyItems(prev => prev.filter(i => i._id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Delete failed.");
      }
    } catch { alert("Delete failed."); }
  };

  const TABS = [
    { key: 'listings', label: `Active (${activeListings.length})` },
    { key: 'sold', label: `Sold (${soldCount})` },
    { key: 'purchases', label: `Bought (${purchases.length})` },
  ];

  return (
    <div className="min-h-screen bg-[#f5f4f0] pb-28" style={{ fontFamily: "'Space Mono', monospace" }}>

      {/* ── Hero Header ── */}
      <div className="bg-[#0a0a0a] text-white px-5 pt-12 pb-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-3xl flex items-center justify-center text-2xl font-black shadow-xl shadow-orange-500/30">
            {userName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tighter">{userName}</h2>
            <p className="text-[10px] text-gray-500 font-bold">{userEmail}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">Verified IITGN</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black" style={{ color: karmaColor }}>⭐ {karmaDisplay}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mt-1">Karma</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-white">{activeListings.length}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mt-1">Active</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-400">{soldCount}</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mt-1">Sold</p>
          </div>
        </div>

        {/* Karma Info */}
        <div className="mt-5 bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Karma Score</span>
            <span className="text-[9px] font-black" style={{ color: karmaColor }}>⭐ {karmaDisplay} pts</span>
          </div>
          <p className="text-[9px] text-gray-600 font-bold mt-2">
            {karma === 0
              ? '🌱 Complete your first sale to earn karma!'
              : `+1 per sale · +0.5 per 5★ review · no limit`}
          </p>
          <div className="flex gap-4 mt-3">
            <div className="text-center">
              <p className="text-xs font-black text-white">{soldCount}</p>
              <p className="text-[8px] text-gray-600 uppercase tracking-widest">Sales</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-white">{purchases.length}</p>
              <p className="text-[8px] text-gray-600 uppercase tracking-widest">Purchases</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="px-5 pt-5">
        <div className="flex bg-white rounded-2xl p-1 border border-gray-100 shadow-sm mb-5 gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.key ? 'bg-[#0a0a0a] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Loading ── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-3xl p-4 flex gap-4 animate-pulse">
                <div className="w-16 h-16 bg-gray-200 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-200 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">

            {/* ── Active & Sold Listings ── */}
            {(activeTab === 'listings' || activeTab === 'sold') && (
              <>
                {(activeTab === 'listings' ? activeListings : soldListings).map(item => (
                  <div
                    key={item._id}
                    className={`flex items-center gap-4 p-4 rounded-3xl border transition-all bg-white shadow-sm ${
                      item.status === 'sold' ? 'opacity-70' : ''
                    }`}
                  >
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                      <img
                        src={item.images?.[0] || item.image}
                        className="w-full h-full object-cover"
                        alt={item.title}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-gray-800 truncate">{item.title}</h4>
                      <p className="text-orange-500 font-black text-xs">₹{item.price.toLocaleString()}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                        {item.category} · {item.hostel}
                        {item.urgent && <span className="ml-2 text-red-400">🚨 Urgent</span>}
                      </p>
                      {item.status === 'sold' && item.buyerEmail && (
                        <p className="text-[9px] text-emerald-500 font-bold mt-0.5">
                          Sold to {item.buyerEmail.split('@')[0]}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {item.status === 'sold' ? (
                        <div className="bg-emerald-50 text-emerald-600 px-3 py-2 rounded-xl text-[9px] font-black text-center uppercase border border-emerald-100">
                          ✓ Sold
                        </div>
                      ) : (
                        <div className="text-[9px] text-gray-400 px-3 py-2 text-center font-bold">Waiting for offer</div>
                      )}
                      {item.status !== 'sold' && (
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="bg-red-50 hover:bg-red-500 text-red-400 hover:text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-90"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {(activeTab === 'listings' ? activeListings : soldListings).length === 0 && (
                  <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                    <div className="text-4xl mb-3">{activeTab === 'listings' ? '📦' : '🏷️'}</div>
                    <p className="text-gray-400 text-sm font-bold">
                      {activeTab === 'listings' ? "No active listings" : "No sales yet"}
                    </p>
                    <p className="text-gray-300 text-xs mt-1">
                      {activeTab === 'listings' ? "Post something to get started!" : "Mark items as sold to track here"}
                    </p>
                    {activeTab === 'listings' && (
                      <Link to="/sell" className="inline-block mt-4 bg-orange-500 text-white px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                        + New Listing
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── Purchases Tab ── */}
            {activeTab === 'purchases' && (
              <>
                {purchases.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
                    <div className="text-4xl mb-3">🛍️</div>
                    <p className="text-gray-400 text-sm font-bold">No purchases yet</p>
                    <p className="text-gray-300 text-xs mt-1">Items you buy via accepted offers appear here</p>
                    <Link to="/" className="inline-block mt-4 bg-[#0a0a0a] text-white px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                      Browse Listings
                    </Link>
                  </div>
                ) : (
                  purchases.map((p, i) => (
                    <div key={i} className="flex flex-col gap-3 p-4 rounded-3xl border bg-white shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                          {p.itemImage
                            ? <img src={p.itemImage} className="w-full h-full object-cover" alt="" />
                            : <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-black text-gray-800 truncate">{p.itemTitle}</h4>
                          <p className="text-orange-500 font-black text-xs">₹{p.price?.toLocaleString()}</p>
                          <p className="text-[9px] text-gray-400 font-bold mt-0.5 truncate">
                            from {p.sellerEmail?.split('@')[0]}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border border-emerald-100">
                            ✓ Bought
                          </div>
                          <p className="text-[8px] text-gray-300 font-bold mt-1">
                            {new Date(p.purchasedAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {/* ── Rating Section ── */}
                      {!ratedItems.has(p.itemId) ? (
                        <div className="border-t border-gray-100 pt-3 mt-1">
                          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2">Rate this seller</p>
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => submitRating(p, -1)}
                              disabled={submittingRating === p.itemId}
                              className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-black text-[10px] py-2 rounded-xl transition-all disabled:opacity-50 border border-red-200"
                              title="Negative rating: Seller was unhelpful or problematic"
                            >
                              👎 Bad
                            </button>
                            <button
                              onClick={() => submitRating(p, 0)}
                              disabled={submittingRating === p.itemId}
                              className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-black text-[10px] py-2 rounded-xl transition-all disabled:opacity-50 border border-gray-200"
                              title="Neutral rating: Transaction was okay"
                            >
                              😐 Okay
                            </button>
                            <button
                              onClick={() => submitRating(p, 1)}
                              disabled={submittingRating === p.itemId}
                              className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-black text-[10px] py-2 rounded-xl transition-all disabled:opacity-50 border border-emerald-200"
                              title="Positive rating: Seller was responsive and reliable"
                            >
                              👍 Great
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-gray-100 pt-3 mt-1 text-center">
                          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">✓ Your rating has been recorded</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </>
            )}

          </div>
        )}
      </div>

      {/* ── Sign Out ── */}
      <div className="px-5 mt-8">
        <button
          onClick={logout}
          className="w-full py-4 border-2 border-dashed border-red-200 text-red-400 hover:bg-red-50 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all"
        >
          Sign Out from Bazaar
        </button>
      </div>
    </div>
  );
};

export default Profile;