import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { auth } from '../services/auth';
import Chat from '../components/Chat';
import { API_URL } from '../config/constants';
const ItemDetail = ({ dbUser, setDbUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [error, setError] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [bookmarks, setBookmarks] = useState(dbUser?.bookmarks || []);
  const [sellerKarma, setSellerKarma] = useState(null);
  const [conversationReady, setConversationReady] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagType, setFlagType] = useState('item');
  const [submittingFlag, setSubmittingFlag] = useState(false);

  const userEmail = auth.currentUser?.email;

  useEffect(() => { setBookmarks(dbUser?.bookmarks || []); }, [dbUser]);

  useEffect(() => {
    fetch(`${API_URL}/api/items/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        setItem(data);
        return fetch(`${API_URL}/api/users/karma?email=${encodeURIComponent(data.seller)}`);
      })
      .then(r => r.json())
      .then(d => setSellerKarma(d.karma))
      .catch(() => setError(true));
  }, [id]);

  // Deterministic room ID — sorted so buyer+seller always get same room for this item
  const getRoomId = () => {
    if (!item || !userEmail) return null;
    const parts = [userEmail, item.seller, item._id].sort();
    return parts.join('__');
  };

  const handleStartChat = async () => {
    if (!item) return;
    const roomId = getRoomId();

    // Init the conversation in DB so both sides can find it in their inbox
    try {
      await fetch(`${API_URL}/api/conversations/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          itemId: item._id,
          sellerEmail: item.seller,
          buyerEmail: userEmail
        })
      });
      setConversationReady(true);
    } catch (err) {
      console.error('Failed to init conversation', err);
      setConversationReady(true); // Still show chat even if init fails
    }
    setShowChat(true);
  };

  const toggleBookmark = async () => {
    if (!userEmail) return;
    const isBookmarked = bookmarks.includes(id);
    setBookmarks(prev => isBookmarked ? prev.filter(b => b !== id) : [...prev, id]);
    try {
      const res = await fetch(`${API_URL}/api/users/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, itemId: id })
      });
      const updated = await res.json();
      setBookmarks(updated);
      if (setDbUser) setDbUser(prev => ({ ...prev, bookmarks: updated }));
    } catch { }
  };

  const submitFlag = async () => {
    if (!userEmail || !flagReason.trim() || !item) return;
    
    setSubmittingFlag(true);
    try {
      const res = await fetch(`${API_URL}/api/flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterEmail: userEmail,
          targetType: flagType,
          targetId: flagType === 'item' ? item._id : item.seller,
          reason: flagReason
        })
      });

      if (res.ok) {
        alert('Report submitted. Thank you for helping keep Bazaar safe!');
        setShowFlagModal(false);
        setFlagReason('');
        setFlagType('item');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to submit report');
      }
    } catch (err) {
      console.error('Flag error:', err);
      alert('Error submitting report');
    } finally {
      setSubmittingFlag(false);
    }
  };

  if (error) return (
    <div className="h-screen flex flex-col items-center justify-center p-10 text-center bg-[#f5f4f0]" style={{ fontFamily: "'Space Mono', monospace" }}>
      <div className="text-6xl font-black text-gray-200 mb-4">404</div>
      <h2 className="text-xl font-black text-gray-800 mb-2">Item not found</h2>
      <p className="text-gray-400 text-sm mb-6">This listing may have been removed.</p>
      <button onClick={() => navigate('/')} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-sm">
        ← Back to Home
      </button>
    </div>
  );

  if (!item) return (
    <div className="h-screen flex items-center justify-center bg-[#f5f4f0]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace" }}>Loading...</p>
      </div>
    </div>
  );

  const images = item.images?.length > 0 ? item.images : [item.image].filter(Boolean);
  const isBookmarked = bookmarks.includes(id);
  const isMine = item.seller === userEmail;
  const karmaColor = sellerKarma >= 4.8 ? '#10b981' : sellerKarma >= 4.0 ? '#f59e0b' : '#ef4444';
  const roomId = getRoomId();

  return (
    <div className="min-h-screen bg-[#f5f4f0] pb-28" style={{ fontFamily: "'Space Mono', monospace" }}>
      {/* Top Nav */}
      <div className="flex items-center justify-between p-4 sticky top-0 bg-[#f5f4f0]/95 backdrop-blur-md z-30 border-b border-gray-200">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-gray-600 shadow-sm active:scale-90 transition-all font-bold"
        >
          ←
        </button>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Product View</span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleBookmark}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg transition-all active:scale-90 border ${
              isBookmarked ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white border-gray-200 text-gray-400'
            }`}
          >
            {isBookmarked ? '♥' : '♡'}
          </button>
          {!isMine && (
            <button
              onClick={() => setShowFlagModal(true)}
              className="w-10 h-10 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-red-500 shadow-sm active:scale-90 transition-all font-bold hover:bg-red-50"
              title="Report this listing"
            >
              🚩
            </button>
          )}
        </div>
      </div>

      {/* Image Gallery */}
      <div className="bg-gradient-to-b from-gray-50 to-white">
        <div className="relative h-[400px] md:h-[500px] overflow-hidden flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 border-b-2 border-gray-100">
          {item.status === 'sold' && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="bg-white text-black px-10 py-3 rounded-full font-black text-2xl rotate-[-12deg] shadow-2xl border-4 border-black">
                SOLD
              </div>
            </div>
          )}
          <div className="relative w-full h-full flex items-center justify-center px-8">
            <img src={images[activeImg]} alt={item.title} className="max-h-full max-w-full object-contain drop-shadow-lg" />
          </div>
        </div>

        {images.length > 1 && (
          <div className="px-4 pt-4 pb-6 flex justify-center">
            <div className="flex gap-3 overflow-x-auto no-scrollbar">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className="shrink-0 w-20 h-20 rounded-xl overflow-hidden transition-all hover:scale-105 shadow-md"
                  style={{ 
                    border: activeImg === i ? '3px solid #f97316' : '2px solid #e5e7eb',
                    boxShadow: activeImg === i ? '0 4px 12px rgba(249,115,22,0.25)' : '0 2px 8px rgba(0,0,0,0.08)'
                  }}
                >
                  <img src={img} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Title & Price */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <span className="text-[9px] font-black text-orange-500 uppercase tracking-[0.25em]">{item.category}</span>
          <div className="flex items-start justify-between mt-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight max-w-[65%]">{item.title}</h1>
            <p className="text-3xl font-black text-orange-500">₹{item.price?.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-50">
            <span className="text-[10px] text-gray-400 font-bold">📍 {item.hostel} Hostel</span>
            <span className="text-gray-200">·</span>
            <span className={`text-[10px] font-black uppercase ${item.status === 'sold' ? 'text-red-400' : 'text-emerald-500'}`}>
              ● {item.status === 'sold' ? 'Sold' : 'Available'}
            </span>
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3">Description</p>
            <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
          </div>
        )}

        {/* Seller Card */}
        <div className="bg-[#0a0a0a] rounded-3xl p-6 text-white shadow-xl">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">Seller</p>
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shadow-orange-500/20">
                {item.seller?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-black text-base">{item.seller?.split('@')[0]}</p>
                <p className="text-[9px] text-gray-500">Verified @iitgn.ac.in</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Karma</p>
              <p className="text-xl font-black" style={{ color: karmaColor }}>
                ⭐ {sellerKarma !== null ? sellerKarma : '...'}
              </p>
            </div>
          </div>

          {/* CTA */}
          {!isMine && item.status !== 'sold' && (
            <button
              onClick={showChat ? () => setShowChat(false) : handleStartChat}
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-xl"
              style={{ background: showChat ? '#1f1f1f' : '#f97316', boxShadow: showChat ? 'none' : '0 10px 30px rgba(249,115,22,0.3)' }}
            >
              {showChat ? '✕ Close Chat' : '💬 Start Negotiation'}
            </button>
          )}

          {isMine && item.status !== 'sold' && (
            <button
              onClick={() => { setEditMode(true); setEditData({ title: item.title, price: item.price, description: item.description }); }}
              className="w-full mt-3 py-3 rounded-2xl font-black text-sm uppercase tracking-widest bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
            >
              ✏️ Edit Listing
            </button>
          )}

          {isMine && (
            <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl text-center mt-3">
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">This is your listing</p>
              <Link to="/inbox" className="text-orange-400 text-[10px] font-black mt-1 block hover:text-orange-300">
                View buyer messages in Inbox →
              </Link>
            </div>
          )}

          {item.status === 'sold' && (
            <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-2xl text-center">
              <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">This item has been sold</p>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        {showChat && conversationReady && !isMine && (
          <div style={{ animation: 'slideUp 0.3s ease-out' }}>
            <Chat
              roomId={roomId}
              otherEmail={item.seller}
              otherName={item.seller?.split('@')[0]}
              sellerKarma={sellerKarma}
              itemTitle={item.title}
              itemImage={images[0]}
              itemPrice={item.price}
              isSeller={false}
              onOfferAccepted={() => setItem(prev => ({ ...prev, status: 'sold' }))}
            />
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editMode && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" style={{ fontFamily: "'Space Mono', monospace" }}>
          <div className="bg-[#f5f4f0] w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-black text-gray-900">Edit Listing</h2>
              <button onClick={() => setEditMode(false)} className="w-9 h-9 bg-gray-200 rounded-xl flex items-center justify-center text-gray-600">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Title</label>
                <input type="text" value={editData.title || ''} onChange={e => setEditData(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Price (₹)</label>
                <input type="number" value={editData.price || ''} onChange={e => setEditData(p => ({ ...p, price: Number(e.target.value) }))}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Description</label>
                <textarea value={editData.description || ''} onChange={e => setEditData(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-orange-500 h-24 resize-none" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="urgent" checked={editData.urgent || false} onChange={e => setEditData(p => ({ ...p, urgent: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
                <label htmlFor="urgent" className="text-sm font-bold text-gray-700">🚨 Mark as Urgent Sale</label>
              </div>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_URL}/api/items/${id}`, {
                      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(editData)
                    });
                    const updated = await res.json();
                    setItem(updated);
                    setEditMode(false);
                  } catch { alert("Failed to update"); }
                }}
                className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-400 transition-all"
              >
                Save Changes →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" style={{ fontFamily: "'Space Mono', monospace" }}>
          <div className="bg-[#f5f4f0] w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-black text-gray-900">🚩 Report Listing</h2>
              <button onClick={() => setShowFlagModal(false)} className="w-9 h-9 bg-gray-200 rounded-xl flex items-center justify-center text-gray-600">✕</button>
            </div>
            
            <div className="space-y-4">
              {/* Report Type Toggle */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Report Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFlagType('item')}
                    className={`flex-1 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                      flagType === 'item'
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    📦 Report Item
                  </button>
                  <button
                    onClick={() => setFlagType('user')}
                    className={`flex-1 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                      flagType === 'user'
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    👤 Report Seller
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Reason for Report
                </label>
                <textarea
                  value={flagReason}
                  onChange={e => setFlagReason(e.target.value.slice(0, 500))}
                  placeholder={flagType === 'item' ? 'e.g., Misleading description, Inappropriate content, Counterfeit item...' : 'e.g., Non-responsive, Suspicious behavior...'}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-red-500 h-24 resize-none"
                />
                <p className="text-[9px] text-gray-400 mt-2">{flagReason.length}/500 characters</p>
              </div>

              {/* Info Box */}
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">⚠️ Important</p>
                <p className="text-[10px] text-red-600">Admins will review all reports. False reports may result in action against your account.</p>
              </div>

              {/* Submit Button */}
              <button
                onClick={submitFlag}
                disabled={!flagReason.trim() || submittingFlag}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                  !flagReason.trim() || submittingFlag
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 active:scale-95'
                }`}
              >
                {submittingFlag ? '⏳ Submitting...' : '📤 Submit Report'}
              </button>

              <button
                onClick={() => setShowFlagModal(false)}
                className="w-full py-3 rounded-2xl font-black text-sm uppercase tracking-widest bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ItemDetail;