const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { 
    type: String, 
    enum: ['Electronics', 'Books', 'Cycles', 'Hostel Gear', 'Other'], 
    required: true 
  },
  // Specific to IITGN Logistics
  hostel: { 
    type: String, 
    enum: ['Aiyana', 'Beauki', 'Chimair', 'Duari', 'Eeksha', 'Firayal'], 
    required: true 
  },
  seller: { type: String, required: true }, // We'll link this to @iitgn emails later
  image: { type: String }, // URL for the image
  status: { type: String, default: 'Available', enum: ['Available', 'Reserved', 'Sold'] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Item', ItemSchema);