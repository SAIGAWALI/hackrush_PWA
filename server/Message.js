const mongoose = require('mongoose');

// ── Individual chat message ───────────────────────────────────────────
const MessageSchema = new mongoose.Schema({
  roomId:      { type: String, required: true, index: true },
  author:      { type: String, required: true },   // email
  text:        { type: String, required: true },
  // type: 'text' | 'offer' | 'offer_accepted' | 'offer_rejected' | 'image' | 'video' | 'file'
  type:        { type: String, default: 'text' },
  offerAmount: { type: Number },
  fileData:    { type: String },  // Base64 encoded file data (image, video, or other file)
  mimeType:    { type: String },  // MIME type of the file (e.g., image/jpeg, video/mp4, application/pdf)
  createdAt:   { type: Date, default: Date.now },
  read:        { type: Boolean, default: false }
});

// ── Conversation thread (one per buyer-item pair) ─────────────────────
const ConversationSchema = new mongoose.Schema({
  roomId:         { type: String, required: true, unique: true },
  itemId:         { type: String, required: true },
  itemTitle:      { type: String },
  itemImage:      { type: String },
  itemPrice:      { type: Number },
  sellerEmail:    { type: String, required: true },
  buyerEmail:     { type: String, required: true },
  lastMessage:    { type: String, default: '' },
  lastMessageAt:  { type: Date, default: Date.now },
  unreadBuyer:    { type: Number, default: 0 },
  unreadSeller:   { type: Number, default: 0 },
  // Offer state machine
  offerStatus:    { type: String, default: 'none' }, // none | pending | accepted | rejected
  offerAmount:    { type: Number, default: 0 },
  offerBy:        { type: String, default: '' }       // buyerEmail who made the offer
});

// ── Flag / moderation report ──────────────────────────────────────────
const FlagSchema = new mongoose.Schema({
  reporterEmail: { type: String, required: true },
  targetType:    { type: String, required: true }, // 'item' | 'user'
  targetId:      { type: String, required: true },
  reason:        { type: String, required: true },
  status:        { type: String, default: 'pending' }, // pending | reviewed | resolved | dismissed
  createdAt:     { type: Date, default: Date.now }
});

// ── Seller Reviews (ratings from buyers) ─────────────────────────────
const ReviewSchema = new mongoose.Schema({
  buyerEmail:    { type: String, required: true, index: true },
  sellerEmail:   { type: String, required: true, index: true },
  itemId:        { type: String, required: true, index: true },
  rating:        { type: Number, enum: [-1, 0, 1], required: true },  // -1 negative, 0 neutral, +1 positive
  comment:       { type: String },
  createdAt:     { type: Date, default: Date.now, unique: { sparse: true, partialFilterExpression: { buyerEmail: 1, sellerEmail: 1, itemId: 1 } } }
});

// Create compound index to ensure one review per buyer-seller-item
ReviewSchema.index({ buyerEmail: 1, sellerEmail: 1, itemId: 1 }, { unique: true });

// ── Purchase history (record of completed transactions) ────────────────
const PurchaseSchema = new mongoose.Schema({
  buyerEmail:    { type: String, required: true, index: true },
  sellerEmail:   { type: String, required: true },
  itemId:        { type: String, required: true },
  itemTitle:     { type: String },
  itemImage:     { type: String },
  price:         { type: Number, required: true },
  offerAmount:   { type: Number, required: true },
  roomId:        { type: String, required: true },
  purchasedAt:   { type: Date, default: Date.now }
});

module.exports = {
  Message:      mongoose.model('Message',      MessageSchema),
  Conversation: mongoose.model('Conversation', ConversationSchema),
  Review:       mongoose.model('Review',       ReviewSchema),
  Flag:         mongoose.model('Flag',         FlagSchema),
  Purchase:     mongoose.model('Purchase',     PurchaseSchema)
};