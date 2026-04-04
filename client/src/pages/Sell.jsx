import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/auth';
import ImageUpload from '../components/ImageUpload';
import { API_URL } from '../config/constants';

const HOSTELS = [
  "Aibaan", "Beauki", "Chimair", "Duven", "Emiet", "Firpeal",
  "Griwkish", "Hiqom", "Ijokha", "Jurqia", "Kyzeel", "Lekhag"
];

const CATEGORIES = [
  { value: "Cycles", icon: "🚲" },
  { value: "Books", icon: "📚" },
  { value: "Electronics", icon: "💻" },
  { value: "Hostel Gear", icon: "🛋️" },
  { value: "Mattresses", icon: "🛏️" },
  { value: "Lab Equipment", icon: "🔬" },
  { value: "Clothing", icon: "👕" },
  { value: "Other", icon: "📦" },
];

const Sell = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    category: 'Cycles',
    otherCategory: '',
    hostel: 'Aibaan',
    description: ''
  });
  const [imageUrls, setImageUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = details, 2 = confirm

  const update = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (imageUrls.length === 0) return alert("Please upload at least one image!");
    if (!formData.title.trim()) return alert("Please add a title!");
    if (!formData.price || formData.price <= 0) return alert("Please enter a valid price!");

    setLoading(true);
    const finalCategory = formData.category === "Other" ? formData.otherCategory : formData.category;

    const itemData = {
      ...formData,
      category: finalCategory,
      images: imageUrls,
      image: imageUrls[0],
      seller: auth.currentUser?.email,
      price: Number(formData.price)
    };

    try {
      const res = await fetch(`${API_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });

      if (res.ok) {
        navigate('/');
      } else {
        alert("Failed to post. Check server.");
      }
    } catch {
      alert("Network error. Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f4f0] pb-28" style={{ fontFamily: "'Space Mono', monospace" }}>
      {/* Header */}
      <div className="bg-[#0a0a0a] text-white px-5 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white transition-colors text-lg">←</button>
          <h1 className="text-3xl font-black tracking-tighter">New Listing</h1>
        </div>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-7">Post to Campus Marketplace</p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Image Upload */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Photos</p>
          <ImageUpload imageUrls={imageUrls} onUploadSuccess={(urls) => setImageUrls(urls)} />
        </div>

        {/* Title */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Item Title</label>
          <input
            type="text"
            placeholder="e.g. Hercules Roadeo Cycle, MTB 21-gear"
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-gray-800"
            value={formData.title}
            onChange={e => update('title', e.target.value)}
            required
          />
        </div>

        {/* Price */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Price (₹)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">₹</span>
            <input
              type="number"
              placeholder="0"
              min="0"
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-3.5 text-xl font-black outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-gray-800"
              value={formData.price}
              onChange={e => update('price', e.target.value)}
              required
            />
          </div>
        </div>

        {/* Category */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map(({ value, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => update('category', value)}
                className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 text-[9px] font-black uppercase tracking-wider transition-all ${
                  formData.category === value
                    ? 'bg-orange-500/10 border-orange-500 text-orange-600'
                    : 'border-gray-100 text-gray-400 hover:border-gray-200'
                }`}
              >
                <span className="text-xl">{icon}</span>
                <span className="leading-tight text-center">{value}</span>
              </button>
            ))}
          </div>
          {formData.category === "Other" && (
            <input
              type="text"
              placeholder="Specify category..."
              className="w-full mt-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-orange-500 transition-all text-gray-800"
              onChange={e => update('otherCategory', e.target.value)}
              required
            />
          )}
        </div>

        {/* Hostel */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Your Hostel</label>
          <select
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:border-orange-500 transition-all text-gray-800 cursor-pointer"
            value={formData.hostel}
            onChange={e => update('hostel', e.target.value)}
          >
            {HOSTELS.map(h => <option key={h} value={h}>{h} Hostel</option>)}
          </select>
        </div>

        {/* Description */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Description</label>
          <textarea
            placeholder="Condition (new/good/fair), age, reason for selling, any defects..."
            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-medium outline-none focus:border-orange-500 transition-all h-28 resize-none leading-relaxed text-gray-800"
            value={formData.description}
            onChange={e => update('description', e.target.value)}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95 ${
            loading
              ? 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed'
              : 'bg-[#0a0a0a] text-white hover:bg-orange-500 shadow-black/20'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Publishing...
            </span>
          ) : (
            '→ Publish to Bazaar'
          )}
        </button>
      </form>
    </div>
  );
};

export default Sell;