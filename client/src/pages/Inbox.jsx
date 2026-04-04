import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../services/auth';
import { getSocket } from '../services/socket';
import Chat from '../components/Chat';
import { API_URL } from '../config/constants';

const Inbox = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConvo, setActiveConvo] = useState(null); // { roomId, otherEmail, ... }
  const [sellerKarmaMap, setSellerKarmaMap] = useState({});

  const userEmail = auth.currentUser?.email;
  const socket = getSocket();

  const fetchConversations = useCallback(() => {
    if (!userEmail) return;
    fetch(`${API_URL}/api/conversations?email=${encodeURIComponent(userEmail)}`)
      .then(r => r.json())
      .then(data => {
        const convos = Array.isArray(data) ? data : [];
        setConversations(convos);
        setLoading(false);

        // Fetch karma for all unique emails
        const emails = [...new Set(convos.map(c =>
          c.sellerEmail === userEmail ? c.buyerEmail : c.sellerEmail
        ))];
        emails.forEach(email => {
          fetch(`${API_URL}/api/users/karma?email=${encodeURIComponent(email)}`)
            .then(r => r.json())
            .then(d => setSellerKarmaMap(prev => ({ ...prev, [email]: d.karma })))
            .catch(() => {});
        });
      })
      .catch(() => setLoading(false));
  }, [userEmail]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Listen for real-time inbox updates (new messages from others)
  useEffect(() => {
    const handleInboxUpdate = (data) => {
      setConversations(prev => prev.map(c => {
        if (c.roomId === data.roomId) {
          const isSeller = c.sellerEmail === userEmail;
          return {
            ...c,
            lastMessage: data.text,
            lastMessageAt: new Date().toISOString(),
            unreadSeller: isSeller ? c.unreadSeller + 1 : c.unreadSeller,
            unreadBuyer: !isSeller ? c.unreadBuyer + 1 : c.unreadBuyer
          };
        }
        return c;
      }));
    };

    socket.on('inbox_update', handleInboxUpdate);
    return () => socket.off('inbox_update', handleInboxUpdate);
  }, [userEmail, socket]);

  // Open a conversation — mark as read
  const openConversation = (convo) => {
    const isSeller = convo.sellerEmail === userEmail;
    const otherEmail = isSeller ? convo.buyerEmail : convo.sellerEmail;
    const otherName = otherEmail.split('@')[0];
    setActiveConvo({ ...convo, otherEmail, otherName, isSeller });

    // Mark read locally immediately
    setConversations(prev => prev.map(c => {
      if (c.roomId !== convo.roomId) return c;
      return {
        ...c,
        unreadSeller: c.sellerEmail === userEmail ? 0 : c.unreadSeller,
        unreadBuyer: c.buyerEmail === userEmail ? 0 : c.unreadBuyer
      };
    }));

    // Mark read on server
    fetch(`${API_URL}/api/conversations/${encodeURIComponent(convo.roomId)}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail })
    }).catch(() => {});
  };

  const totalUnread = conversations.reduce((sum, c) => {
    return sum + (c.sellerEmail === userEmail ? c.unreadSeller : c.unreadBuyer);
  }, 0);

  const formatRelativeTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-[#f5f4f0] pb-28" style={{ fontFamily: "'Space Mono', monospace" }}>
      {/* Header */}
      <div className="bg-[#0a0a0a] text-white px-5 pt-12 pb-5 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter">Inbox</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
              {loading ? '...' : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          {totalUnread > 0 && (
            <div className="bg-orange-500 text-white font-black text-xs w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
              {totalUnread > 99 ? '99+' : totalUnread}
            </div>
          )}
        </div>
      </div>

      {/* Active Chat View (slide in) */}
      {activeConvo && (
        <div className="fixed inset-0 z-50 bg-[#f5f4f0] flex flex-col pb-32" style={{ fontFamily: "'Space Mono', monospace" }}>
          {/* Chat Header */}
          <div className="bg-[#0a0a0a] text-white px-4 pt-12 pb-4 flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveConvo(null)}
              className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center text-white active:scale-90 transition-all"
            >
              ←
            </button>
            {activeConvo.itemImage && (
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gray-800 shrink-0">
                <img src={activeConvo.itemImage} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm truncate">{activeConvo.itemTitle}</p>
              <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest">
                {activeConvo.otherName}
                {activeConvo.sellerEmail === userEmail ? ' · Buyer' : ' · Seller'}
              </p>
            </div>
            <Link
              to={`/item/${activeConvo.itemId}`}
              className="bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest whitespace-nowrap"
            >
              View Item
            </Link>
          </div>

          {/* Chat Component */}
          <div className="flex-1 overflow-hidden p-4">
            <Chat
              roomId={activeConvo.roomId}
              otherEmail={activeConvo.otherEmail}
              otherName={activeConvo.otherName}
              sellerKarma={sellerKarmaMap[activeConvo.otherEmail] ?? 4.0}
              itemTitle={activeConvo.itemTitle}
              itemImage={activeConvo.itemImage}
              itemPrice={activeConvo.itemPrice}
              isSeller={activeConvo.isSeller}
            />
          </div>
        </div>
      )}

      {/* Conversation List */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-3xl p-4 flex gap-3 animate-pulse">
                <div className="w-14 h-14 bg-gray-200 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-200 rounded-full w-1/2" />
                  <div className="h-3 bg-gray-200 rounded-full w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-gray-500 font-black text-base">No conversations yet</p>
            <p className="text-gray-400 text-xs mt-2 mb-6 leading-relaxed">
              When a buyer messages you about your listing,<br />it will appear here.
            </p>
            <Link
              to="/"
              className="bg-[#0a0a0a] text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest"
            >
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map(convo => {
              const isSeller = convo.sellerEmail === userEmail;
              const otherEmail = isSeller ? convo.buyerEmail : convo.sellerEmail;
              const otherName = otherEmail.split('@')[0];
              const unread = isSeller ? convo.unreadSeller : convo.unreadBuyer;
              const hasUnread = unread > 0;

              return (
                <button
                  key={convo.roomId}
                  onClick={() => openConversation(convo)}
                  className={`w-full text-left flex items-center gap-3 p-4 rounded-3xl border transition-all active:scale-[0.98] ${
                    hasUnread
                      ? 'bg-white border-orange-200 shadow-md shadow-orange-100'
                      : 'bg-white border-gray-100 shadow-sm'
                  }`}
                >
                  {/* Item thumbnail */}
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100">
                      {convo.itemImage ? (
                        <img src={convo.itemImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🛍</div>
                      )}
                    </div>
                    {/* Unread badge */}
                    {hasUnread && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md">
                        {unread > 9 ? '9+' : unread}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm truncate ${hasUnread ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                          {convo.itemTitle}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                          {isSeller ? '🏷 Buyer: ' : '👤 Seller: '}{otherName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] text-gray-400 font-bold whitespace-nowrap">
                          {formatRelativeTime(convo.lastMessageAt)}
                        </span>
                        {convo.itemPrice > 0 && (
                          <p className="text-[9px] font-black text-orange-500 mt-0.5">₹{convo.itemPrice?.toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                    <p className={`text-xs mt-1 truncate ${hasUnread ? 'text-gray-700 font-bold' : 'text-gray-400 font-medium'}`}>
                      {convo.lastMessage || 'No messages yet'}
                    </p>
                  </div>

                  {/* Role badge */}
                  <div className={`shrink-0 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                    isSeller ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-500'
                  }`}>
                    {isSeller ? 'Seller' : 'Buyer'}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;