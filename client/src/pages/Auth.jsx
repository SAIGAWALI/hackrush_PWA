import React, { useState } from 'react';
import { signInWithGoogle, signUpWithEmail, auth } from '../services/auth';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email.endsWith("@iitgn.ac.in")) return alert("Strictly for @iitgn.ac.in users!");
    setLoading(true);
    try {
      if (isLogin) {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        if (!userCred.user.emailVerified) {
          alert("Please verify your email before signing in.");
          await auth.signOut();
        }
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
    setGoogleLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) return alert("Enter your email address first.");
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Reset link sent! Check your IITGN inbox.");
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-5" style={{ fontFamily: "'Space Mono', monospace" }}>
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-block bg-orange-500/10 border border-orange-500/20 rounded-3xl px-8 py-5 mb-4">
            <h1 className="text-5xl font-black text-orange-400 tracking-tighter">BAZAAR</h1>
          </div>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">IIT Gandhinagar · Campus Exchange</p>
          <p className="text-gray-600 text-[9px] font-bold mt-1">Verified students only · @iitgn.ac.in</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-6 backdrop-blur-sm">
          {/* Google Sign In */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 py-4 rounded-2xl font-black text-sm hover:bg-gray-100 transition-all active:scale-95 shadow-xl mb-5"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5" alt="G" />
            )}
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <hr className="flex-1 border-white/10" />
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">OR</span>
            <hr className="flex-1 border-white/10" />
          </div>

          {/* Email Auth */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <input
              type="email"
              placeholder="IITGN Email (name@iitgn.ac.in)"
              className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-orange-500/50 transition-all"
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-orange-500/20 disabled:opacity-50"
            >
              {loading ? "Processing..." : isLogin ? "Sign In →" : "Create Account →"}
            </button>
          </form>

          {/* Footer links */}
          <div className="flex flex-col items-center gap-3 mt-5">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[11px] font-bold text-gray-500 hover:text-orange-400 transition-colors"
            >
              {isLogin ? "New to Bazaar? Create account" : "Already have an account? Sign in"}
            </button>
            {isLogin && (
              <button
                onClick={handleForgotPassword}
                className="text-[10px] text-orange-500 hover:text-orange-400 font-bold transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[9px] text-gray-700 mt-6 font-bold leading-relaxed">
          By continuing, you agree to Bazaar's community guidelines.<br/>
          Restricted to verified IITGN campus members only.
        </p>
      </div>
    </div>
  );
};

export default Auth;