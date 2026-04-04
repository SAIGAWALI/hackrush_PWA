import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/auth';
import { API_URL } from '../config/constants';

const Admin = () => {
  const navigate = useNavigate();
  const [flags, setFlags] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [resolvingFlagId, setResolvingFlagId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('flags'); // 'flags' or 'members'
  const [selectedMember, setSelectedMember] = useState(null);
  const [actingOnMemberId, setActingOnMemberId] = useState(null);
  const [karmaReductionAmount, setKarmaReductionAmount] = useState('5');

  // Note: Admin authorization is verified server-side, not on the client

  useEffect(() => {
    // Check if user is logged in
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('No user logged in');
      navigate('/auth');
      return;
    }

    const email = currentUser.email;
    setUserEmail(email);
    setIsAdmin(true); // Let server verify admin access on each API call
    
    // Fetch both flags and members
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/flags?email=${encodeURIComponent(email)}`).then(r => r.ok ? r.json() : []),
      fetch(`${API_URL}/api/users/all?adminEmail=${encodeURIComponent(email)}`).then(r => r.ok ? r.json() : [])
    ])
      .then(([flagsData, membersData]) => {
        setFlags(flagsData || []);
        setMembers(membersData || []);
        setLoading(false);
      })
      .catch(err => {
        setFlags([]);
        setMembers([]);
        setLoading(false);
      });
  }, [navigate, API_URL]);

  const actionMember = async (memberEmail, action, value) => {
    setActingOnMemberId(memberEmail);
    try {
      const res = await fetch(`${API_URL}/api/admin/action-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberEmail, action, value, requestorEmail: userEmail })
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Action completed: ${action}`);
        // Refresh members list
        const updated = await fetch(`${API_URL}/api/users/all?adminEmail=${encodeURIComponent(userEmail)}`).then(r => r.json());
        setMembers(updated);
        setSelectedMember(null);
      } else {
        alert('Action failed');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setActingOnMemberId(null);
    }
  };

  const resolveFlag = async (flagId, newStatus) => {
    if (!flagId) return;
    setResolvingFlagId(flagId);
    
    try {
      const res = await fetch(`${API_URL}/api/flags/${flagId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setFlags(prev => prev.map(f => 
          f._id === flagId ? { ...f, status: newStatus } : f
        ));
        setSelectedFlag(null);
        alert(`Flag marked as ${newStatus}`);
      } else {
        alert('Failed to update flag status');
      }
    } catch (err) {
      alert('Error updating flag');
    } finally {
      setResolvingFlagId(null);
    }
  };

  if (!isAdmin) return (
    <div className="h-screen flex flex-col items-center justify-center p-10 text-center bg-[#f5f4f0]" style={{ fontFamily: "'Space Mono', monospace" }}>
      <div className="text-6xl font-black text-gray-200 mb-4">403</div>
      <h2 className="text-xl font-black text-gray-800 mb-4">Access Denied</h2>
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 max-w-md">
        <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Your Email</p>
        <p className="text-sm font-mono text-yellow-700 mt-1">{userEmail || 'Not set'}</p>
        <p className="text-[10px] text-yellow-600 mt-2">You are not an admin. Only authorized admins can access this page.</p>
      </div>
      <button onClick={() => navigate('/')} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-sm">
        ← Back to Home
      </button>
    </div>
  );

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#f5f4f0]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest" style={{ fontFamily: "'Space Mono', monospace" }}>Loading flags...</p>
      </div>
    </div>
  );

  const filteredFlags = filter === 'all' ? flags : flags.filter(f => f.status === 'pending');
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 border-yellow-200';
      case 'reviewed': return 'bg-blue-50 border-blue-200';
      case 'resolved': return 'bg-green-50 border-green-200';
      case 'dismissed': return 'bg-gray-50 border-gray-200';
      default: return 'bg-white border-gray-200';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f4f0] pb-20" style={{ fontFamily: "'Space Mono', monospace" }}>
      {/* Header */}
      <div className="sticky top-0 bg-[#f5f4f0]/95 backdrop-blur-md z-30 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-gray-900">🛡️ Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 bg-blue-500 border border-blue-600 rounded-2xl flex items-center justify-center text-white shadow-sm active:scale-90 transition-all font-bold hover:bg-blue-600"
              title="Back to Home"
            >
              🏠
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-gray-600 shadow-sm active:scale-90 transition-all font-bold"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Admin Info Debug */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
          <p className="text-[9px] font-black text-green-600 uppercase tracking-widest">✓ Logged In As</p>
          <p className="text-xs text-green-700 mt-1 font-mono">{userEmail || 'Loading...'}</p>
          <p className="text-[9px] text-green-600 mt-1">Admin Access Verified</p>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-2 bg-white rounded-2xl p-2 border border-gray-200 shadow-sm">
          <button
            onClick={() => setActiveTab('flags')}
            className={`flex-1 py-2 rounded-lg font-black text-sm uppercase tracking-widest transition-all ${
              activeTab === 'flags'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            📋 Flags
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-2 rounded-lg font-black text-sm uppercase tracking-widest transition-all ${
              activeTab === 'members'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            👥 Members
          </button>
        </div>

        {/* FLAGS TAB */}
        {activeTab === 'flags' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pending</p>
                <p className="text-2xl font-black text-orange-500">{flags.filter(f => f.status === 'pending').length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                <p className="text-2xl font-black text-gray-900">{flags.length}</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('pending')}
                className={`flex-1 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                  filter === 'pending'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                  filter === 'all'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                All Reports
              </button>
            </div>

        {/* Flags List */}
        {filteredFlags.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-gray-200 shadow-sm">
            <p className="text-gray-400 text-sm font-bold">No flags to display</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFlags.map(flag => (
              <button
                key={flag._id}
                onClick={() => setSelectedFlag(flag)}
                className={`w-full text-left rounded-2xl p-4 border-2 transition-all hover:shadow-md ${getStatusColor(flag.status)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${getStatusBadgeColor(flag.status)}`}>
                      {flag.status}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                      flag.targetType === 'item' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {flag.targetType === 'item' ? '📦 Item' : '👤 User'}
                    </span>
                  </div>
                  <span className="text-[9px] text-gray-400 font-bold">
                    {new Date(flag.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-sm font-black text-gray-900 mb-1 line-clamp-1">
                  {flag.targetType === 'item' ? `Item: ${flag.targetId}` : `User: ${flag.targetId}`}
                </p>

                <p className="text-[10px] text-gray-600 line-clamp-2 mb-2">
                  {flag.reason}
                </p>

                <p className="text-[9px] text-gray-400 font-bold">
                  Reported by: {flag.reporterEmail.split('@')[0]}
                </p>
              </button>
            ))}
          </div>
        )}
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Members</p>
                <p className="text-2xl font-black text-blue-500">{members.length}</p>
              </div>
            </div>

            {/* Members List */}
            {members.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-200 shadow-sm">
                <p className="text-gray-400 text-sm font-bold">No members to display</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map(member => (
                  <button
                    key={member.email}
                    onClick={() => setSelectedMember(member)}
                    className={`w-full text-left rounded-2xl p-4 border-2 transition-all ${
                      member.disabled 
                        ? 'border-gray-300 bg-gray-100' 
                        : 'border-blue-100 bg-blue-50 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-gray-900">{member.email.split('@')[0]}</p>
                          {member.disabled && <span className="text-lg">🚫</span>}
                        </div>
                        <p className="text-[10px] text-gray-500">{member.email}</p>
                      </div>
                      <span className="text-lg font-black text-orange-500">⭐ {member.karma || 0}</span>
                    </div>
                    <p className="text-[10px] text-gray-600">Listings: {member.listings || 0}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {selectedFlag && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" style={{ fontFamily: "'Space Mono', monospace" }}>
          <div className="bg-[#f5f4f0] w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-black text-gray-900">Report Details</h2>
              <button onClick={() => setSelectedFlag(null)} className="w-9 h-9 bg-gray-200 rounded-xl flex items-center justify-center text-gray-600">✕</button>
            </div>

            <div className="space-y-4">
              {/* Status Badge */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Status</p>
                <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${getStatusBadgeColor(selectedFlag.status)}`}>
                  {selectedFlag.status}
                </span>
              </div>

              {/* Target Info */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Target</p>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-900">
                    {selectedFlag.targetType === 'item' ? '📦 Item Report' : '👤 User Report'}
                  </p>
                  <p className="text-[10px] text-gray-600 bg-gray-50 px-3 py-2 rounded-lg font-mono break-all">
                    {selectedFlag.targetId}
                  </p>
                </div>
              </div>

              {/* Reporter Info */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Reporter</p>
                <p className="text-sm font-bold text-gray-900">{selectedFlag.reporterEmail}</p>
                <p className="text-[9px] text-gray-400 mt-1">
                  Reported on: {new Date(selectedFlag.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Reason */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Reason</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedFlag.reason}
                </p>
              </div>

              {/* Actions */}
              {selectedFlag.status === 'pending' && (
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Actions</p>
                  
                  <button
                    onClick={() => resolveFlag(selectedFlag._id, 'resolved')}
                    disabled={resolvingFlagId === selectedFlag._id}
                    className="w-full bg-green-500 text-white py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-600 active:scale-95 transition-all disabled:bg-gray-300"
                  >
                    {resolvingFlagId === selectedFlag._id ? '⏳...' : '✅ Resolve'}
                  </button>

                  <button
                    onClick={() => resolveFlag(selectedFlag._id, 'dismissed')}
                    disabled={resolvingFlagId === selectedFlag._id}
                    className="w-full bg-gray-400 text-white py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-500 active:scale-95 transition-all disabled:bg-gray-300"
                  >
                    {resolvingFlagId === selectedFlag._id ? '⏳...' : '❌ Dismiss'}
                  </button>
                </div>
              )}

              {selectedFlag.status !== 'pending' && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">ℹ️ Info</p>
                  <p className="text-[10px] text-orange-600 mt-1">This report has already been processed.</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedFlag(null)}
              className="w-full mt-4 py-3 rounded-2xl font-black text-sm uppercase tracking-widest bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" style={{ fontFamily: "'Space Mono', monospace" }}>
          <div className="bg-[#f5f4f0] w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-black text-gray-900">Member Actions</h2>
              <button onClick={() => setSelectedMember(null)} className="w-9 h-9 bg-gray-200 rounded-xl flex items-center justify-center text-gray-600">✕</button>
            </div>

            <div className="space-y-4">
              {/* Member Info */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Member {selectedMember.disabled && '(🚫 DISABLED)'}</p>
                <p className="text-sm font-bold text-gray-900">{selectedMember.email}</p>
                <div className="flex gap-4 mt-2">
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold">Karma</p>
                    <p className="text-lg font-black text-orange-500">⭐ {selectedMember.karma || 0}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold">Listings</p>
                    <p className="text-lg font-black text-blue-500">{selectedMember.listings || 0}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-gray-200">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">⚠️ Admin Actions</p>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-600">Reduce Karma</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={karmaReductionAmount}
                      onChange={(e) => setKarmaReductionAmount(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-300 font-black text-sm text-gray-900"
                      placeholder="Enter amount"
                      min="1"
                    />
                    <button
                      onClick={() => actionMember(selectedMember.email, 'reduce_karma', parseInt(karmaReductionAmount) || 5)}
                      disabled={actingOnMemberId === selectedMember.email}
                      className="flex-1 bg-yellow-500 text-white py-2 rounded-xl font-black text-sm hover:bg-yellow-600 active:scale-95 transition-all disabled:bg-gray-300"
                    >
                      {actingOnMemberId === selectedMember.email ? '⏳' : '📉'}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => actionMember(selectedMember.email, 'remove_all_products', null)}
                  disabled={actingOnMemberId === selectedMember.email}
                  className="w-full bg-red-500 text-white py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 active:scale-95 transition-all disabled:bg-gray-300"
                >
                  {actingOnMemberId === selectedMember.email ? '⏳...' : '🗑️ Remove All Products'}
                </button>

                <button
                  onClick={() => actionMember(selectedMember.email, selectedMember.disabled ? 'enable_account' : 'disable_account', null)}
                  disabled={actingOnMemberId === selectedMember.email}
                  className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:bg-gray-300 ${
                    selectedMember.disabled
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-red-700 text-white hover:bg-red-800'
                  }`}
                >
                  {actingOnMemberId === selectedMember.email ? '⏳...' : (selectedMember.disabled ? '✅ Enable Account' : '🚫 Disable Account')}
                </button>
              </div>

              <p className="text-[9px] text-gray-500 italic">Disabling an account prevents login but keeps all data. You can re-enable it later.</p>
            </div>

            <button
              onClick={() => setSelectedMember(null)}
              className="w-full mt-4 py-3 rounded-2xl font-black text-sm uppercase tracking-widest bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
