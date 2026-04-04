import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../services/socket';
import { auth } from '../services/auth';
import { API_URL } from '../config/constants';

/**
 * Props:
 *  roomId, otherEmail, otherName, sellerKarma,
 *  itemTitle, itemImage, itemPrice,
 *  isSeller  — true when the current user is the seller
 *  onOfferAccepted — callback so parent can update item status
 */
const Chat = ({
  roomId, otherEmail, otherName, sellerKarma,
  itemTitle, itemImage, itemPrice,
  isSeller = false, onOfferAccepted
}) => {
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [isTyping, setIsTyping]           = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending]             = useState(false);

  // Offer state
  const [offerStatus, setOfferStatus]     = useState('none'); // none | pending | accepted | rejected
  const [offerAmount, setOfferAmount]     = useState(0);
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerValue, setOfferValue]       = useState('');

  // Flag / report
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason]       = useState('');

  // Image upload
  const [uploadingImage, setUploadingImage] = useState(false);

  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const typingTimer  = useRef(null);
  const isTypingRef  = useRef(false);
  const fileInputRef = useRef(null);

  const userEmail = auth.currentUser?.email;
  const socket    = getSocket();

  // ── Load history + initial offer state ──────────────────────────────
  useEffect(() => {
    setLoadingHistory(true);

    fetch(`${API_URL}/api/messages/${encodeURIComponent(roomId)}`)
      .then(r => r.json())
      .then(data => { setMessages(Array.isArray(data) ? data : []); setLoadingHistory(false); })
      .catch(() => setLoadingHistory(false));

    // Fetch current offer state from conversation
    fetch(`${API_URL}/api/conversations/by-room/${encodeURIComponent(roomId)}`)
      .then(r => r.json())
      .then(convo => {
        if (convo?.offerStatus) {
          setOfferStatus(convo.offerStatus);
          setOfferAmount(convo.offerAmount || 0);
        }
      })
      .catch(() => {});

    // Mark as read
    fetch(`${API_URL}/api/conversations/${encodeURIComponent(roomId)}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail })
    }).catch(() => {});
  }, [roomId, userEmail]);

  // ── Socket setup ─────────────────────────────────────────────────────
  useEffect(() => {
    socket.emit('join_room', roomId);

    const handleReceive = (msg) => {
      setMessages(prev => {
        if (prev.some(m => m._id && m._id === msg._id)) return prev;
        
        // For file messages (image, video, file), match on type and filename to avoid comparing huge base64 strings
        if (msg.type === 'image' || msg.type === 'video' || msg.type === 'file') {
          const idx = prev.findIndex(m =>
            m.tempId && m.author === msg.author && m.type === msg.type && m.text === msg.text &&
            Math.abs(new Date(m.createdAt) - new Date(msg.createdAt)) < 3000
          );
          if (idx !== -1) { 
            const u = [...prev]; 
            u[idx] = msg;  // Replace optimistic with real message
            return u; 
          }
        } else {
          // For text/offer messages, match normally
          const idx = prev.findIndex(m =>
            m.tempId && m.author === msg.author && m.text === msg.text && m.type === msg.type &&
            Math.abs(new Date(m.createdAt) - new Date(msg.createdAt)) < 3000
          );
          if (idx !== -1) { 
            const u = [...prev]; 
            u[idx] = msg; 
            return u; 
          }
        }
        
        return [...prev, msg];
      });
    };

    const handleOfferUpdate = (data) => {
      setOfferStatus(data.offerStatus);
      if (data.offerAmount) setOfferAmount(data.offerAmount);
      if (data.offerStatus === 'accepted' && onOfferAccepted) onOfferAccepted();
    };

    const handleTyping = ({ author }) => {
      if (author !== userEmail) {
        setIsTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setIsTyping(false), 2500);
      }
    };

    socket.on('receive_message', handleReceive);
    socket.on('offer_update', handleOfferUpdate);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', () => setIsTyping(false));

    return () => {
      socket.emit('leave_room', roomId);
      socket.off('receive_message', handleReceive);
      socket.off('offer_update', handleOfferUpdate);
      socket.off('typing', handleTyping);
      socket.off('stop_typing');
      clearTimeout(typingTimer.current);
    };
  }, [roomId, userEmail]);

  // ── Auto-scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Typing indicator ──────────────────────────────────────────────────
  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing', { roomId, author: userEmail });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('stop_typing', { roomId });
    }, 1500);
  };

  // ── Send regular message ──────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const optimistic = {
      _id: null, tempId: Date.now(), roomId, author: userEmail,
      text, type: 'text', createdAt: new Date().toISOString(), pending: true
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    socket.emit('send_message', { roomId, author: userEmail, text });
    isTypingRef.current = false;
    socket.emit('stop_typing', { roomId });
    setSending(false);
    inputRef.current?.focus();
  }, [input, sending, roomId, userEmail, socket]);

  // ── Send file (image, video, pdf, etc) ────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 50MB for videos, 5MB for others)
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      alert(`File must be less than ${maxMB}MB`);
      // Reset input value to allow selecting a different file
      if (e.target) e.target.value = '';
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    const fileName = file.name;
    const fileType = file.type;
    const isImage = fileType.startsWith('image/');
    const isVideo = fileType.startsWith('video/');

    reader.onload = (event) => {
      const base64Data = event.target?.result;
      if (!base64Data) {
        console.error('Failed to read file');
        setUploadingImage(false);
        return;
      }

      // Compress images only
      if (isImage && fileType.startsWith('image/')) {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          let width = img.width;
          let height = img.height;
          const maxSize = 1200;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          sendFileMessage(compressedBase64, fileName, 'image', fileType);
        };

        // If image fails to load, send uncompressed or fallback
        img.onerror = () => {
          console.warn('Image compression failed, sending uncompressed');
          sendFileMessage(base64Data, fileName, 'image', fileType);
        };

        img.src = base64Data;
      } else {
        // For videos and other files, send as-is
        sendFileMessage(base64Data, fileName, isVideo ? 'video' : 'file', fileType);
      }
    };

    reader.onerror = () => {
      console.error('FileReader error:', reader.error);
      alert('Failed to read file. Please try again.');
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    };

    reader.readAsDataURL(file);
  };

  // Send file via socket
  const sendFileMessage = (fileData, fileName, fileCategory, mimeType) => {
    const optimistic = {
      _id: null,
      tempId: Date.now(),
      roomId,
      author: userEmail,
      text: fileName,
      type: fileCategory,
      fileData: fileData,
      mimeType: mimeType,
      createdAt: new Date().toISOString(),
      pending: true
    };
    setMessages(prev => [...prev, optimistic]);

    socket.emit('send_message', {
      roomId,
      author: userEmail,
      text: fileName,
      type: fileCategory,
      fileData: fileData,
      mimeType: mimeType
    });

    setUploadingImage(false);
    // Reset input value instead of clearing the ref
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ── Buyer: send offer ─────────────────────────────────────────────────
  const sendOffer = () => {
    const amount = Number(offerValue);
    if (!amount || amount <= 0) return alert("Enter a valid offer amount");
    socket.emit('send_offer', { roomId, buyerEmail: userEmail, offerAmount: amount });
    setShowOfferInput(false);
    setOfferValue('');
  };

  // ── Seller: accept / reject ───────────────────────────────────────────
  const acceptOffer = () => socket.emit('accept_offer', { roomId, sellerEmail: userEmail });
  const rejectOffer = () => socket.emit('reject_offer', { roomId, sellerEmail: userEmail });

  // ── Flag / report ─────────────────────────────────────────────────────
  const submitFlag = async () => {
    if (!flagReason.trim()) return;
    // Extract itemId from roomId (format: buyer__seller__itemId after sort)
    const parts = roomId.split('__');
    const itemId = parts[parts.length - 1];
    await fetch(`${API_URL}/api/items/${itemId}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reporterEmail: userEmail, reason: flagReason })
    }).catch(() => {});
    setShowFlagModal(false);
    setFlagReason('');
    alert("Report submitted. Thank you for keeping Bazaar safe!");
  };

  // ── Helpers ───────────────────────────────────────────────────────────
  const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d) => {
    const date = new Date(d), today = new Date(), yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const downloadFile = (fileData, filename) => {
    try {
      const link = document.createElement('a');
      link.href = fileData;
      link.download = filename || 'file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file');
    }
  };

  const groupedMessages = messages.reduce((acc, msg) => {
    const key = new Date(msg.createdAt).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(msg);
    return acc;
  }, {});

  const quickReplies = [
    "Is this still available?",
    "Can you do ₹500 less?",
    "When can I pick up?",
    "What's the condition?",
    "I'll take it! 🤝"
  ];

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col rounded-3xl overflow-hidden border border-gray-200 shadow-2xl bg-white relative"
      style={{ height: '580px', fontFamily: "'Space Mono', monospace" }}
    >

      {/* ── Header ── */}
      <div className="bg-[#0a0a0a] px-5 py-4 flex items-center gap-3 shrink-0">
        {itemImage ? (
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gray-800 shrink-0">
            <img src={itemImage} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center shrink-0">
            <span className="text-orange-400 text-lg">🛍</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-sm truncate">{itemTitle || 'Negotiation'}</p>
          <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest truncate">
            with {otherName || otherEmail?.split('@')[0]}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-[8px] text-gray-600 uppercase tracking-wider">Karma</p>
            <p className="font-black text-emerald-400 text-sm">⭐ {sellerKarma ?? 0}</p>
          </div>
          <button
            onClick={() => setShowFlagModal(true)}
            className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors"
            title="Report this listing"
          >
            🚩
          </button>
        </div>
      </div>

      {/* ── Listed Price Banner ── */}
      {itemPrice > 0 && (
        <div className="bg-orange-50 border-b border-orange-100 px-5 py-2 flex items-center justify-between shrink-0">
          <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Listed Price</span>
          <span className="font-black text-orange-600 text-sm">₹{itemPrice?.toLocaleString()}</span>
        </div>
      )}

      {/* ── Offer Status Banner ── */}
      {offerStatus === 'pending' && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-5 py-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">
                {isSeller ? 'Buyer Offer' : 'Your Offer — Pending'}
              </p>
              <p className="font-black text-yellow-700 text-lg">₹{offerAmount?.toLocaleString()}</p>
            </div>
            {/* Only seller sees Accept / Reject */}
            {isSeller ? (
              <div className="flex gap-2">
                <button
                  onClick={acceptOffer}
                  className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-90 shadow-md shadow-emerald-500/20"
                >
                  ✓ Accept
                </button>
                <button
                  onClick={rejectOffer}
                  className="bg-red-100 text-red-500 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-200 transition-all active:scale-90"
                >
                  ✕ Reject
                </button>
              </div>
            ) : (
              <span className="text-[9px] text-yellow-600 font-bold bg-yellow-100 px-3 py-1.5 rounded-xl">
                ⏳ Waiting for seller...
              </span>
            )}
          </div>
        </div>
      )}

      {offerStatus === 'accepted' && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-3 shrink-0 text-center">
          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
            🎉 Deal Closed at ₹{offerAmount?.toLocaleString()}
          </p>
          <p className="text-[9px] text-emerald-500 mt-0.5">
            Item marked as sold. Coordinate the handover!
          </p>
        </div>
      )}

      {offerStatus === 'rejected' && (
        <div className="bg-red-50 border-b border-red-100 px-5 py-2 shrink-0 text-center">
          <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">
            {isSeller ? 'You rejected the offer.' : 'Offer rejected — make a new one below.'}
          </p>
        </div>
      )}

      {offerStatus === 'auto_rejected' && (
        <div className="bg-red-50 border-b border-red-100 px-5 py-3 shrink-0 text-center">
          <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">
            ❌ Product Sold to Another Buyer
          </p>
          <p className="text-[9px] text-red-500 font-medium">
            This product is no longer available. Negotiations have ended.
          </p>
        </div>
      )}

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-[#fafaf9]">

        {loadingHistory && (
          <div className="flex flex-col gap-3 py-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className={`h-10 rounded-2xl bg-gray-200 animate-pulse ${i % 2 === 0 ? 'w-40' : 'w-48'}`} />
              </div>
            ))}
          </div>
        )}

        {/* Quick replies for buyer on empty chat */}
        {!loadingHistory && messages.length === 0 && (
          <div className="py-4">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">👋</div>
              <p className="text-gray-400 text-xs font-bold">Start the negotiation!</p>
              <p className="text-gray-300 text-[10px] mt-1">Messages are saved and both sides can reply anytime.</p>
            </div>
            {!isSeller && (
              <>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center">Quick Start</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickReplies.map(q => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="bg-white border border-orange-200 text-orange-600 text-[9px] font-bold px-3 py-2 rounded-xl hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Message Groups */}
        {!loadingHistory && Object.entries(groupedMessages).map(([dateKey, msgs]) => (
          <div key={dateKey}>
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">
                {formatDate(msgs[0].createdAt)}
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {msgs.map((msg) => {
              const isMe = msg.author === userEmail;
              const isOfferType = ['offer', 'offer_accepted', 'offer_rejected'].includes(msg.type);

              // Offer messages get special pill styling regardless of sender
              if (isOfferType) {
                const bgColor =
                  msg.type === 'offer_accepted' ? 'bg-emerald-100 border-emerald-200 text-emerald-800'
                  : msg.type === 'offer_rejected' ? 'bg-red-100 border-red-200 text-red-700'
                  : 'bg-yellow-100 border-yellow-200 text-yellow-800';

                return (
                  <div key={msg._id || msg.tempId} className="flex justify-center my-2">
                    <div className={`px-4 py-2 rounded-2xl text-xs font-black border ${bgColor} flex items-center gap-2`}>
                      {msg.text}
                      <span className="text-[8px] opacity-60 font-normal">{formatTime(msg.createdAt)}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg._id || msg.tempId}
                  className={`flex items-end gap-2 mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && (
                    <div className="w-7 h-7 rounded-xl shrink-0 bg-[#0a0a0a] flex items-center justify-center text-white text-[10px] font-black">
                      {msg.author?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}>
                    {msg.type === 'image' && msg.fileData ? (
                      // Image message - WhatsApp/Instagram style
                      <div className={`flex flex-col gap-1.5 ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`relative group rounded-2xl overflow-hidden shadow-md ${isMe ? 'rounded-br-md' : 'rounded-bl-md'} bg-white border border-gray-200`}>
                          <img 
                            src={msg.fileData} 
                            alt={msg.text}
                            className="max-w-full h-auto max-h-72 object-cover block"
                            onError={(e) => {
                              console.error('Image failed to load:', msg.text);
                              e.target.style.display = 'none';
                            }}
                            onLoad={(e) => console.log('Image loaded:', msg.text)}
                          />
                          {/* Download button - appears on hover */}
                          <button
                            onClick={() => downloadFile(msg.fileData, msg.text)}
                            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Download image"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                              <polyline points="7 10 12 15 17 10"/>
                              <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                          </button>
                        </div>
                        {/* Filename caption */}
                        <p className={`text-xs font-medium px-3 py-1 rounded-lg ${
                          isMe 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          📷 {msg.text}
                        </p>
                      </div>
                    ) : msg.type === 'video' && msg.fileData ? (
                      // Video message
                      <div className={`flex flex-col gap-1.5 ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`rounded-2xl overflow-hidden shadow-md ${isMe ? 'rounded-br-md' : 'rounded-bl-md'} bg-black border border-gray-200`}>
                          <video 
                            src={msg.fileData}
                            controls
                            className="max-w-full h-auto max-h-72 bg-black"
                          />
                        </div>
                        {/* Download button */}
                        <button
                          onClick={() => downloadFile(msg.fileData, msg.text)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 ${
                            isMe 
                              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          } transition-colors`}
                          title="Download video"
                        >
                          ⬇️ {msg.text}
                        </button>
                      </div>
                    ) : msg.type === 'file' && msg.fileData ? (
                      // Other files (PDF, doc, etc)
                      <div className={`flex flex-col gap-1.5 ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-md ${isMe ? 'rounded-br-md bg-orange-100' : 'rounded-bl-md bg-gray-100'} border border-gray-200`}>
                          <div className="text-2xl">
                            {msg.text.endsWith('.pdf') ? '📄' : msg.text.endsWith('.doc') || msg.text.endsWith('.docx') ? '📝' : '📦'}
                          </div>
                          <div className="flex flex-col flex-1">
                            <p className={`text-xs font-bold ${isMe ? 'text-orange-700' : 'text-gray-700'}`}>
                              {msg.text}
                            </p>
                            <p className={`text-[10px] ${isMe ? 'text-orange-600' : 'text-gray-500'}`}>
                              Tap to download
                            </p>
                          </div>
                          <button
                            onClick={() => downloadFile(msg.fileData, msg.text)}
                            className={`p-2 rounded-lg transition-colors ${
                              isMe
                                ? 'bg-orange-200 hover:bg-orange-300 text-orange-700'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}
                          >
                            ⬇️
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Text message
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                        isMe
                          ? `bg-orange-500 text-white rounded-br-md ${msg.pending ? 'opacity-70' : ''}`
                          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md shadow-sm'
                      }`}>
                        {msg.text}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[8px] text-gray-400 font-bold">{formatTime(msg.createdAt)}</span>
                      {isMe && msg.pending && <span className="text-[8px] text-gray-300">· sending</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2 mb-1">
            <div className="w-7 h-7 rounded-xl bg-[#0a0a0a] flex items-center justify-center text-white text-[10px] font-black shrink-0">
              {otherEmail?.[0]?.toUpperCase()}
            </div>
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm flex gap-1.5 items-center">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Offer Input Panel (buyer only, slides in above input bar) ── */}
      {showOfferInput && !isSeller && (
        <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-3 shrink-0">
          <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest mb-2">Make a Formal Offer</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-black">₹</span>
              <input
                type="number"
                placeholder="Your offer..."
                value={offerValue}
                onChange={e => setOfferValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendOffer()}
                className="w-full bg-white border border-yellow-300 rounded-xl pl-8 pr-3 py-2.5 text-sm font-bold outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-400/20"
                autoFocus
              />
            </div>
            <button
              onClick={sendOffer}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-90"
            >
              Send
            </button>
            <button
              onClick={() => { setShowOfferInput(false); setOfferValue(''); }}
              className="bg-gray-100 text-gray-500 px-3 py-2 rounded-xl font-black text-[10px] hover:bg-gray-200 transition-all"
            >
              ✕
            </button>
          </div>
          <p className="text-[9px] text-yellow-500 mt-2 font-bold">
            This sends a formal offer. Seller can accept or reject it.
          </p>
        </div>
      )}

      {/* ── Input Bar ── */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-2 shrink-0">
        
        {/* Message: Deal closed — chat is read-only */}
        {offerStatus === 'accepted' && (
          <div className="w-full text-center py-4 bg-emerald-50 rounded-2xl border border-emerald-200">
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
              ✅ Deal Closed — Chat is now read-only
            </p>
            <p className="text-[9px] text-emerald-500 mt-0.5">Coordinate the handover outside the app</p>
          </div>
        )}

        {/* Message: Deal rejected — buyer can retry */}
        {offerStatus === 'rejected' && !isSeller && (
          <div className="w-full text-center py-2 bg-amber-50 rounded-2xl border border-amber-200 mb-2">
            <p className="text-[9px] font-bold text-amber-600">Make another offer below</p>
          </div>
        )}

        {/* Only show input bar if deal is NOT closed/auto-rejected */}
        {offerStatus !== 'accepted' && offerStatus !== 'auto_rejected' && (
          <>
            {/* Offer button — only for BUYER, only when not already accepted/rejected */}
            {!isSeller && (offerStatus === 'none' || offerStatus === 'rejected') && (
              <button
                onClick={() => setShowOfferInput(v => !v)}
                title="Make a formal offer"
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-90 shrink-0 font-black text-sm border ${
                  showOfferInput
                    ? 'bg-yellow-500 text-white border-yellow-500 shadow-md shadow-yellow-500/20'
                    : 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100'
                }`}
              >
                ₹
              </button>
            )}

            {/* File upload button - images, videos, PDFs, etc */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              title="Share file (image, video, PDF, etc)"
              className="w-11 h-11 bg-blue-50 text-blue-600 border border-blue-200 rounded-2xl flex items-center justify-center transition-all active:scale-90 shrink-0 font-black text-sm hover:bg-blue-100 disabled:opacity-50"
            >
              📎
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />

            <input
              ref={inputRef}
              type="text"
              value={input}
              placeholder={isSeller ? "Reply to buyer..." : "Message or use ₹ to make an offer..."}
              className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 transition-all text-gray-800 font-medium"
              onChange={handleInputChange}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              autoComplete="off"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-11 h-11 bg-orange-500 hover:bg-orange-400 disabled:bg-gray-100 disabled:text-gray-300 text-white rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-md shadow-orange-500/20 shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ── Flag Modal ── */}
      {showFlagModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-end rounded-3xl overflow-hidden">
          <div className="bg-white w-full rounded-t-3xl p-6">
            <p className="font-black text-gray-800 text-base mb-1">🚩 Report this listing</p>
            <p className="text-[10px] text-gray-400 mb-4">Help keep Bazaar safe for everyone.</p>
            <textarea
              placeholder="Describe the issue (spam, fraud, misleading info, wrong item...)"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-sm outline-none focus:border-red-400 h-24 resize-none"
              value={flagReason}
              onChange={e => setFlagReason(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={submitFlag}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95"
              >
                Submit Report
              </button>
              <button
                onClick={() => { setShowFlagModal(false); setFlagReason(''); }}
                className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;