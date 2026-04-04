import { loginWithGoogle } from "../services/auth";

const Login = () => {
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      window.location.href = "/"; // Redirect to home
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-orange-600 tracking-tighter">BAZAAR</h1>
        <p className="text-gray-500 font-medium">IIT Gandhinagar's Official Marketplace</p>
      </div>

      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <button 
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 py-3 rounded-2xl font-semibold text-gray-700 hover:bg-gray-50 transition-all active:scale-95"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5"/>
          Continue with IITGN Mail
        </button>

        <div className="mt-6 flex items-center gap-2 text-gray-300">
          <hr className="flex-1 border-gray-100"/>
          <span className="text-xs uppercase font-bold tracking-widest text-gray-400">Secure Entry</span>
          <hr className="flex-1 border-gray-100"/>
        </div>
        
        <p className="mt-6 text-[10px] text-gray-400 leading-relaxed">
          By continuing, you agree to the community guidelines. <br/>
          Entry is restricted to verified campus residents only.
        </p>
      </div>
    </div>
  );
};