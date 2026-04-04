const ItemCard = ({ item }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-40 bg-gray-100 flex items-center justify-center relative">
        <span className="absolute top-2 right-2 bg-white/80 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold text-orange-600">
          {item.category}
        </span>
        <span className="text-4xl text-gray-300">📷</span>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-gray-800 text-sm truncate">{item.title}</h3>
        <p className="text-orange-600 font-bold text-lg">₹{item.price}</p>
        <div className="flex items-center mt-2 text-xs text-gray-500">
          <span className="mr-1">📍</span> {item.hostel}
        </div>
      </div>
    </div>
  );
};

export default ItemCard;