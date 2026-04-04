import React, { useState } from 'react';

const ImageUpload = ({ imageUrls = [], onUploadSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [progress, setProgress] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const totalImages = imageUrls.length + files.length;
    if (totalImages > 4) return alert(`Maximum 4 images allowed. You have ${imageUrls.length}, trying to add ${files.length}.`);

    // Instant local previews for new files only
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPreviews(newPreviews); // Only store NEW previews temporarily
    setLoading(true);
    setProgress(0);

    try {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      const folder = import.meta.env.VITE_CLOUDINARY_FOLDER;

      let done = 0;
      const uploadedUrls = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('upload_preset', uploadPreset);
          if (folder) formData.append('folder', folder);

          const res = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: 'POST', body: formData }
          );
          const data = await res.json();
          done++;
          setProgress(Math.round((done / files.length) * 100));
          return data.secure_url;
        })
      );

      // Append new uploaded URLs to existing imageUrls
      const updatedUrls = [...imageUrls, ...uploadedUrls];
      onUploadSuccess(updatedUrls);
      setPreviews([]); // Clear temporary previews
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed. Check your Cloudinary config in .env");
      setPreviews([]);
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (index) => {
    const updated = imageUrls.filter((_, i) => i !== index);
    onUploadSuccess(updated);
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (index) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...imageUrls];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    
    onUploadSuccess(updated);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-3" style={{ fontFamily: "'Space Mono', monospace" }}>
      {/* Preview Grid */}
      {imageUrls.length > 0 || previews.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {/* Show uploaded images first */}
          {imageUrls.map((src, i) => (
            <div
              key={`uploaded-${i}`}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(i)}
              onDragEnd={handleDragEnd}
              className={`relative aspect-square rounded-2xl overflow-hidden bg-gray-100 group cursor-move transition-all ${
                draggedIndex === i ? 'opacity-50 scale-95' : ''
              } ${draggedIndex !== null && draggedIndex !== i ? 'hover:scale-105' : ''}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
              {!loading && (
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-lg flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
                >
                  ✕
                </button>
              )}
              {i === 0 && (
                <div className="absolute bottom-2 left-2 bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
                  🖼️ Cover
                </div>
              )}
              {i > 0 && (
                <div className="absolute top-2 left-2 bg-gray-600 text-white text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">
                  #{i + 1}
                </div>
              )}
              {draggedIndex === null && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs font-black">Drag to reorder</span>
                </div>
              )}
            </div>
          ))}
          
          {/* Show temporary preview for new uploading files */}
          {previews.map((src, i) => (
            <div
              key={`preview-${i}`}
              className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 opacity-50"
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ))}
          
          {/* Add more slot */}
          {imageUrls.length + previews.length < 4 && !loading && (
            <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-300 transition-colors bg-gray-50 hover:bg-orange-50">
              <span className="text-2xl text-gray-300 mb-1">+</span>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Add image</span>
              <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
            </label>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-36 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-orange-300 hover:bg-orange-50/50 transition-all group">
          <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📸</span>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Upload Photos</span>
          <span className="text-[9px] text-gray-300 mt-1">Up to 4 images · JPG, PNG</span>
          <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
        </label>
      )}

      {/* Upload Progress */}
      {loading && (
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Uploading...</span>
            <span className="text-[9px] font-black text-orange-500">{progress}%</span>
          </div>
          <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Info text */}
      {imageUrls.length === 0 && (
        <p className="text-[9px] text-gray-400 font-bold text-center">
          First photo will be the cover image
        </p>
      )}
      {imageUrls.length > 0 && (
        <p className="text-[9px] text-gray-400 font-bold text-center">
          ✨ Drag images to reorder · First image is the cover
        </p>
      )}
    </div>
  );
};

export default ImageUpload;