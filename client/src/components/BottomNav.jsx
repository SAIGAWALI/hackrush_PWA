import { Link, useLocation } from 'react-router-dom';

const BottomNav = ({ unreadCount = 0, setUnreadCount }) => {
  const { pathname } = useLocation();

  const active = (path) => pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ fontFamily: "'Space Mono', monospace" }}>
      <div className="bg-[#0a0a0a] border-t border-gray-800/60">
        <div className="flex justify-around items-center px-2 pt-3 pb-4 relative max-w-md mx-auto">

          {/* Home */}
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${active('/') ? 'text-orange-400' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={active('/') ? '#fb923c' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
          </Link>

          {/* Inbox — with live unread badge */}
          <Link
            to="/inbox"
            onClick={() => setUnreadCount && setUnreadCount(0)}
            className={`relative flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${active('/inbox') ? 'text-orange-400' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <div className="relative">
              <svg width="22" height="22" viewBox="0 0 24 24" fill={active('/inbox') ? '#fb923c' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-orange-500 text-white text-[8px] font-black rounded-full flex items-center justify-center shadow-md shadow-orange-500/40 leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest">Inbox</span>
          </Link>

          {/* Sell FAB */}
          <Link
            to="/sell"
            className="absolute left-1/2 -translate-x-1/2 -top-7 w-14 h-14 bg-orange-500 hover:bg-orange-400 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-500/40 transition-all active:scale-90 border-4 border-[#0a0a0a]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </Link>

          {/* Spacer for FAB */}
          <div className="w-14" />

          {/* Watchlist */}
          <Link
            to="/watchlist"
            className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${active('/watchlist') ? 'text-orange-400' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={active('/watchlist') ? '#fb923c' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span className="text-[9px] font-black uppercase tracking-widest">Saved</span>
          </Link>

          {/* Profile */}
          <Link
            to="/profile"
            className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${active('/profile') ? 'text-orange-400' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={active('/profile') ? '#fb923c' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="text-[9px] font-black uppercase tracking-widest">Profile</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;