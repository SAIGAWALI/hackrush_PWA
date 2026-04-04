const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  uid:      { type: String, required: true, unique: true }, // Firebase UID
  email:    { type: String, required: true },
  name:     { type: String },
  karma:    { type: Number, default: 0 },    // Starts at 0, no cap: +1/sale, +0.5/5★ review
  role:     { type: String, default: 'user' }, // 'user' | 'admin'
  flagged:  { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }, // Account disabled by admin

  listings:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  bookmarks: [{ type: String }], // Array of Item IDs

  // Buyer purchase history — populated when seller accepts an offer
  purchases: [{
    itemId:      { type: String },
    itemTitle:   { type: String },
    itemImage:   { type: String },
    price:       { type: Number },
    sellerEmail: { type: String },
    purchasedAt: { type: Date, default: Date.now }
  }],

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);