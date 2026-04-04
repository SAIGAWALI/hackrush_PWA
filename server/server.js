const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();

// CORS Configuration - Whitelist allowed origins
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Environment Configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sai.gawali@iitgn.ac.in';
const PORT = process.env.PORT || 5000;

// ── Database ──────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas Connected'))
  .catch(err => console.error('❌ DB Error:', err));

// ── Models ────────────────────────────────────────────────────────────
const User = require('./User');
const { Message, Conversation, Review, Flag, Purchase } = require('./Message');

const ItemSchema = new mongoose.Schema({
  title:       String,
  price:       Number,
  category:    String,
  hostel:      String,
  seller:      String,
  images:      [String],
  image:       String,
  description: String,
  status:      { type: String, default: 'available' }, // available | reserved | sold
  buyerEmail:  { type: String, default: '' },
  urgent:      { type: Boolean, default: false },
  tags:        [String],
  flagCount:   { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now }
});
const Item = mongoose.model('Item', ItemSchema);

// =========================================
// USER ROUTES
// =========================================

// Sync / create user on login
app.post('/api/users/sync', async (req, res) => {
  const { uid, email, name } = req.body;
  try {
    // Validate @iitgn.ac.in email domain
    if (!email || !email.endsWith('@iitgn.ac.in')) {
      return res.status(403).json({ error: 'Access Restricted: Only @iitgn.ac.in emails allowed' });
    }
    
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ uid, email, name, karma: 0, bookmarks: [], purchases: [] });
      await user.save();
    }
    // Check if account is disabled
    if (user.disabled) {
      return res.status(403).json({ error: 'This account has been disabled by admin', disabled: true });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get karma (reads from User document directly — no cap, no formula)
app.get('/api/users/karma', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const user = await User.findOne({ email });
    res.json({ email, karma: user?.karma ?? 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle bookmark
app.post('/api/users/bookmark', async (req, res) => {
  const { email, itemId } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const idx = user.bookmarks.indexOf(itemId);
    if (idx === -1) user.bookmarks.push(itemId);
    else user.bookmarks.splice(idx, 1);
    await user.save();
    res.json(user.bookmarks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get buyer purchase history
app.get('/api/users/purchases', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const purchases = await Purchase.find({ buyerEmail: email }).sort({ purchasedAt: -1 });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================
// ITEM ROUTES
// =========================================

app.get('/api/items', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== 'All') filter.category = req.query.category;
    if (req.query.seller)  filter.seller  = req.query.seller;
    if (req.query.hostel)  filter.hostel  = req.query.hostel;
    if (req.query.urgent === 'true') filter.urgent = true;
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
    }
    // urgent items sort to top, then newest first
    const items = await Item.find(filter).sort({ urgent: -1, createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ID' });
    const item = await Item.findById(id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    const newItem = new Item(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit item — seller only, not allowed after sold
app.patch('/api/items/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.status === 'sold') return res.status(403).json({ error: 'Cannot edit a sold item' });

    const allowed = ['title', 'price', 'description', 'images', 'image', 'hostel', 'category', 'urgent', 'tags'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    });
    // Keep image in sync with images[0]
    if (req.body.images?.length) item.image = req.body.images[0];
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual "mark as sold" from profile (no buyer — seller just closing it)
app.patch('/api/items/:id/sold', async (req, res) => {
  try {
    const { buyerEmail } = req.body;
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { status: 'sold', buyerEmail: buyerEmail || '' },
      { returnDocument: 'after' }
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });

    // Karma +1 for seller (no cap)
    await User.findOneAndUpdate(
      { email: item.seller },
      { $inc: { karma: 1 } },
      { returnDocument: 'after' }
    );

    // If we know the buyer, add to their purchase history
    if (buyerEmail) {
      await User.findOneAndUpdate(
        { email: buyerEmail },
        { $push: { purchases: {
          itemId:      item._id.toString(),
          itemTitle:   item.title,
          itemImage:   item.images?.[0] || item.image || '',
          price:       item.price,
          sellerEmail: item.seller,
          purchasedAt: new Date()
        }}}
      );
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// Delete — blocked if sold
app.delete('/api/items/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    if (item.status === 'sold') return res.status(403).json({ error: 'Cannot delete a sold item' });
    await Item.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Flag an item
app.post('/api/items/:id/flag', async (req, res) => {
  const { reporterEmail, reason } = req.body;
  try {
      await Item.findByIdAndUpdate(
        req.params.id,
        { $inc: { flagCount: 1 } },
        { returnDocument: 'after' }
      );
    const flag = new Flag({ reporterEmail, targetType: 'item', targetId: req.params.id, reason });
    await flag.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================
// REVIEW ROUTES
// =========================================

app.post('/api/reviews', async (req, res) => {
  const { buyerEmail, sellerEmail, itemId, rating, comment } = req.body;

  try {
    // Validate rating is one of -1, 0, +1
    if (![1, 0, -1].includes(rating)) {
      return res.status(400).json({ error: 'Rating must be +1, 0, or -1' });
    }

    // Check if item was purchased (status should be 'sold')
    const item = await Item.findById(itemId);
    if (!item || item.status !== 'sold') {
      return res.status(403).json({ error: 'Can only review after a completed transaction' });
    }

    // Check if buyer already reviewed this item
    const existing = await Review.findOne({ buyerEmail, sellerEmail, itemId });
    if (existing) {
      return res.status(409).json({ error: 'You have already rated this seller for this item' });
    }

    // Create review
    const review = new Review({
      buyerEmail,
      sellerEmail,
      itemId,
      rating,
      comment
    });
    await review.save();

    // Update seller karma by the rating value
    const updatedSeller = await User.findOneAndUpdate(
      { email: sellerEmail },
      { $inc: { karma: rating } },  // +1, 0, or -1
      { returnDocument: 'after' }
    );

    res.json({ review, updatedKarma: updatedSeller?.karma });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reviews/:email', async (req, res) => {
  try {
    const reviews = await Review.find({ sellerEmail: req.params.email }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================
// FLAG / REPORT ROUTES
// =========================================

app.post('/api/flags', async (req, res) => {
  const { reporterEmail, targetType, targetId, reason } = req.body;

  try {
    // Validate inputs
    if (!reporterEmail || !targetType || !targetId || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['item', 'user'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }

    if (reason.trim().length < 10) {
      return res.status(400).json({ error: 'Reason must be at least 10 characters' });
    }

    if (reason.length > 500) {
      return res.status(400).json({ error: 'Reason must be 500 characters or less' });
    }

    // Create flag/report
    const flag = new Flag({
      reporterEmail,
      targetType,    // 'item' or 'user'
      targetId,      // item._id or seller email
      reason,
      status: 'pending'  // pending | reviewed | resolved | dismissed
    });
    await flag.save();

    // Increment flag count on item if reporting an item
    if (targetType === 'item') {
      await Item.findByIdAndUpdate(targetId, { $inc: { flagCount: 1 } });
    }

    res.json({ success: true, flagId: flag._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all flags (admin only)
app.get('/api/flags', async (req, res) => {
  try {
    // Verify admin access
    const adminEmail = req.query.email;
    if (adminEmail !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const flags = await Flag.find().sort({ createdAt: -1 });
    res.json(flags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update flag status (admin only)
app.patch('/api/flags/:id', async (req, res) => {
  const { status } = req.body;
  
  try {
    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const flag = await Flag.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: 'after' }
    );

    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }

    res.json({ success: true, flag });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================
// ADMIN ROUTES
// =========================================

// Get all users with stats (admin only)
app.get('/api/users/all', async (req, res) => {
  try {
    // Verify admin access
    const adminEmail = req.query.adminEmail;
    if (adminEmail !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const users = await User.find({}, 'email karma disabled').lean();
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const listings = await Item.countDocuments({ seller: user.email });
        return {
          email: user.email,
          karma: user.karma || 0,
          listings: listings,
          disabled: user.disabled || false
        };
      })
    );
    res.json(usersWithStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin member actions (delete account, reduce karma, remove products)
app.post('/api/admin/action-member', async (req, res) => {
  const { memberEmail, action, value } = req.body;

  try {
    // Verify admin access
    const requestorEmail = req.body.requestorEmail;
    if (requestorEmail !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!['disable_account', 'enable_account', 'reduce_karma', 'remove_all_products'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Find the target user
    const user = await User.findOne({ email: memberEmail });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let result = {};

    if (action === 'disable_account') {
      // Mark account as disabled (can be re-enabled later)
      user.disabled = true;
      await user.save();
      result = { success: true, message: `Account ${memberEmail} has been disabled` };
    }

    else if (action === 'enable_account') {
      // Enable a disabled account
      user.disabled = false;
      await user.save();
      result = { success: true, message: `Account ${memberEmail} has been enabled` };
    }

    else if (action === 'reduce_karma') {
      const reduction = value || 5;
      user.karma = Math.max(0, user.karma - reduction);
      await user.save();
      result = { success: true, message: `Karma reduced by ${reduction}. New karma: ${user.karma}` };
    }

    else if (action === 'remove_all_products') {
      const deleted = await Item.deleteMany({ seller: memberEmail });
      result = { success: true, message: `${deleted.deletedCount} products removed` };
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================
// CONVERSATION ROUTES
// =========================================

app.get('/api/conversations', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const convos = await Conversation.find({
      $or: [{ sellerEmail: email }, { buyerEmail: email }]
    }).sort({ lastMessageAt: -1 });
    res.json(convos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single conversation by roomId (used to hydrate offer state in Chat)
app.get('/api/conversations/by-room/:roomId', async (req, res) => {
  try {
    const convo = await Conversation.findOne({ roomId: req.params.roomId });
    if (!convo) return res.status(404).json({ error: 'Not found' });
    res.json(convo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unread badge count
app.get('/api/conversations/unread-count', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.json({ count: 0 });
  try {
    const convos = await Conversation.find({ $or: [{ sellerEmail: email }, { buyerEmail: email }] });
    let total = 0;
    for (const c of convos) total += (c.sellerEmail === email) ? c.unreadSeller : c.unreadBuyer;
    res.json({ count: total });
  } catch { res.json({ count: 0 }); }
});

// Init or fetch conversation
app.post('/api/conversations/init', async (req, res) => {
  const { roomId, itemId, sellerEmail, buyerEmail } = req.body;
  try {
    let convo = await Conversation.findOne({ roomId });
    if (!convo) {
      const item = mongoose.Types.ObjectId.isValid(itemId) ? await Item.findById(itemId) : null;
      convo = new Conversation({
        roomId, itemId,
        itemTitle: item?.title || 'Item',
        itemImage: item?.images?.[0] || item?.image || '',
        itemPrice: item?.price || 0,
        sellerEmail, buyerEmail
      });
      await convo.save();
    }
    res.json(convo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Message history
app.get('/api/messages/:roomId', async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.roomId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark conversation as read
app.post('/api/conversations/:roomId/read', async (req, res) => {
  const { email } = req.body;
  try {
    const convo = await Conversation.findOne({ roomId: req.params.roomId });
    if (convo) {
      if (convo.sellerEmail === email) convo.unreadSeller = 0;
      else if (convo.buyerEmail === email) convo.unreadBuyer = 0;
      await convo.save();
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================
// SOCKET.IO
// =========================================
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ['http://localhost:5173', 'http://localhost:3000'], methods: ['GET', 'POST'] },
  maxHttpBufferSize: 5 * 1024 * 1024  // 5MB for large image base64 strings
});

const onlineUsers = {}; // email → socket.id

io.on('connection', (socket) => {

  socket.on('register', (email) => {
    onlineUsers[email] = socket.id;
    socket.userEmail = email;
  });

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    socket.currentRoom = roomId;
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    socket.currentRoom = null;
  });

  // ── Regular text & file messages (text, image, video, file) ────────
  socket.on('send_message', async (data) => {
    try {
      // Handle text, image, video, and other file types
      const msgData = {
        roomId: data.roomId,
        author: data.author,
        type: data.type || 'text'
      };

      if (data.type === 'image' || data.type === 'video' || data.type === 'file') {
        // File message (image, video, or other)
        msgData.fileData = data.fileData; // Base64 encoded file
        msgData.mimeType = data.mimeType;
        msgData.text = data.text || 'File shared'; // Use filename or default
      } else {
        // Text message
        msgData.text = data.text;
      }

      const msg = new Message(msgData);
      await msg.save();

      const convo = await Conversation.findOne({ roomId: data.roomId });
      let otherEmail = null;
      if (convo) {
        convo.lastMessage = msgData.text;
        convo.lastMessageAt = new Date();
        if (data.author === convo.sellerEmail) { convo.unreadBuyer  += 1; otherEmail = convo.buyerEmail;  }
        else                                   { convo.unreadSeller += 1; otherEmail = convo.sellerEmail; }
        await convo.save();
      }

      // Emit message with file data if present
      const emitData = {
        _id: msg._id,
        roomId: data.roomId,
        author: data.author,
        text: msgData.text,
        type: msgData.type,
        createdAt: msg.createdAt
      };

      if (data.type === 'image' || data.type === 'video' || data.type === 'file') {
        emitData.fileData = data.fileData;
        emitData.mimeType = data.mimeType;
      }

      io.to(data.roomId).emit('receive_message', emitData);

      if (otherEmail && onlineUsers[otherEmail]) {
        io.to(onlineUsers[otherEmail]).emit('inbox_update', {
          roomId: data.roomId, fromEmail: data.author, text: msgData.text,
          itemTitle: convo?.itemTitle, itemImage: convo?.itemImage
        });
      }
    } catch (err) { console.error('send_message error:', err.message); }
  });

  // ── Buyer sends formal offer ──────────────────────────────────────
  socket.on('send_offer', async (data) => {
    // data: { roomId, buyerEmail, offerAmount }
    try {
      const convo = await Conversation.findOne({ roomId: data.roomId });
      if (!convo) return;
      if (convo.offerStatus === 'accepted') return; // already done

      // Only the buyer can send an offer
      if (data.buyerEmail !== convo.buyerEmail) return;

      convo.offerStatus   = 'pending';
      convo.offerAmount   = data.offerAmount;
      convo.offerBy       = data.buyerEmail;
      convo.lastMessage   = `💰 Offer: ₹${data.offerAmount}`;
      convo.lastMessageAt = new Date();
      convo.unreadSeller += 1;
      await convo.save();

      const msg = new Message({
        roomId: data.roomId, author: data.buyerEmail,
        text: `💰 Offer: ₹${data.offerAmount}`,
        type: 'offer', offerAmount: data.offerAmount
      });
      await msg.save();

      io.to(data.roomId).emit('receive_message', {
        _id: msg._id, roomId: data.roomId, author: data.buyerEmail,
        text: msg.text, type: 'offer', offerAmount: data.offerAmount, createdAt: msg.createdAt
      });
      io.to(data.roomId).emit('offer_update', {
        offerStatus: 'pending', offerAmount: data.offerAmount, offerBy: data.buyerEmail
      });

      // Notify seller even if offline
      if (onlineUsers[convo.sellerEmail]) {
        io.to(onlineUsers[convo.sellerEmail]).emit('inbox_update', {
          roomId: data.roomId, fromEmail: data.buyerEmail,
          text: `💰 Offer: ₹${data.offerAmount}`,
          itemTitle: convo.itemTitle, itemImage: convo.itemImage
        });
      }
    } catch (err) { console.error('send_offer error:', err.message); }
  });

  // ── Seller accepts offer ──────────────────────────────────────────
  socket.on('accept_offer', async (data) => {
    // data: { roomId, sellerEmail }
    try {
      const convo = await Conversation.findOne({ roomId: data.roomId });
      if (!convo) return;
      if (convo.sellerEmail !== data.sellerEmail) return; // only seller
      if (convo.offerStatus !== 'pending') return;

      // ── CHECK IF ITEM ALREADY SOLD (prevent race condition) ──
      const item = await Item.findById(convo.itemId);
      if (item?.status === 'sold') {
        // Item was already sold by another conversation, auto-reject this one
        convo.offerStatus = 'auto_rejected';
        await convo.save();

        const msg = new Message({
          roomId: data.roomId,
          author: 'system',
          text: `❌ Product was sold to another buyer.`,
          type: 'offer_rejected'
        });
        await msg.save();

        io.to(data.roomId).emit('receive_message', {
          _id: msg._id, roomId: data.roomId, author: 'system',
          text: msg.text, type: 'offer_rejected', createdAt: msg.createdAt
        });
        io.to(data.roomId).emit('offer_update', {
          offerStatus: 'auto_rejected', reason: 'product_already_sold'
        });
        return; // Exit early
      }

      convo.offerStatus = 'accepted';
      await convo.save();

      // Mark item sold with atomic update (use returnDocument instead of new)
      const updatedItem = await Item.findByIdAndUpdate(
        convo.itemId,
        { status: 'sold', buyerEmail: convo.buyerEmail },
        { returnDocument: 'after' }
      );

      // Seller karma +1 (no cap)
      await User.findOneAndUpdate(
        { email: data.sellerEmail },
        { $inc: { karma: 1 } },
        { returnDocument: 'after' }
      );

      // Create Purchase record
      const purchase = new Purchase({
        buyerEmail:   convo.buyerEmail,
        sellerEmail:  data.sellerEmail,
        itemId:       updatedItem?._id?.toString() || convo.itemId,
        itemTitle:    convo.itemTitle,
        itemImage:    convo.itemImage,
        price:        updatedItem?.price || 0,
        offerAmount:  convo.offerAmount,
        roomId:       data.roomId
      });
      await purchase.save();

      // Add to buyer's purchase history (keep for now as fallback)
      if (updatedItem) {
        await User.findOneAndUpdate(
          { email: convo.buyerEmail },
          { $push: { purchases: {
            itemId:      updatedItem._id.toString(),
            itemTitle:   updatedItem.title,
            itemImage:   updatedItem.images?.[0] || updatedItem.image || '',
            price:       convo.offerAmount || updatedItem.price,
            sellerEmail: data.sellerEmail,
            purchasedAt: new Date()
          }}},
          { returnDocument: 'after' }
        );
      }

      const msg = new Message({
        roomId: data.roomId, author: data.sellerEmail,
        text: `✅ Offer accepted! Deal at ₹${convo.offerAmount}`,
        type: 'offer_accepted'
      });
      await msg.save();

      io.to(data.roomId).emit('receive_message', {
        _id: msg._id, roomId: data.roomId, author: data.sellerEmail,
        text: msg.text, type: 'offer_accepted', createdAt: msg.createdAt
      });
      io.to(data.roomId).emit('offer_update', {
        offerStatus: 'accepted', offerAmount: convo.offerAmount
      });
      io.to(data.roomId).emit('item_sold', { itemId: convo.itemId });

      // Notify buyer
      if (onlineUsers[convo.buyerEmail]) {
        io.to(onlineUsers[convo.buyerEmail]).emit('inbox_update', {
          roomId: data.roomId, fromEmail: data.sellerEmail,
          text: `✅ Your offer of ₹${convo.offerAmount} was accepted!`,
          itemTitle: convo.itemTitle, itemImage: convo.itemImage
        });
      }

      // ── AUTO-REJECT all OTHER pending offers for this product ─────────
      const otherConvos = await Conversation.find({
        itemId: convo.itemId,
        roomId: { $ne: data.roomId },
        offerStatus: 'pending'
      });

      for (const otherConvo of otherConvos) {
        otherConvo.offerStatus = 'auto_rejected';
        await otherConvo.save();

        // Create auto-rejection message
        const rejMsg = new Message({
          roomId: otherConvo.roomId,
          author: 'system',
          text: `❌ Product sold to another buyer. This product is no longer available.`,
          type: 'offer_rejected'
        });
        await rejMsg.save();

        // Notify all users in that conversation
        io.to(otherConvo.roomId).emit('receive_message', {
          _id: rejMsg._id,
          roomId: otherConvo.roomId,
          author: 'system',
          text: rejMsg.text,
          type: 'offer_rejected',
          createdAt: rejMsg.createdAt
        });
        io.to(otherConvo.roomId).emit('offer_update', {
          offerStatus: 'auto_rejected',
          reason: 'product_sold'
        });

        // Notify other buyer personally
        if (onlineUsers[otherConvo.buyerEmail]) {
          io.to(onlineUsers[otherConvo.buyerEmail]).emit('inbox_update', {
            roomId: otherConvo.roomId,
            fromEmail: 'system',
            text: `❌ Product sold to another buyer`,
            itemTitle: otherConvo.itemTitle,
            itemImage: otherConvo.itemImage
          });
        }
      }
    } catch (err) { console.error('accept_offer error:', err.message); }
  });

  // ── Seller rejects offer ──────────────────────────────────────────
  socket.on('reject_offer', async (data) => {
    // data: { roomId, sellerEmail }
    try {
      const convo = await Conversation.findOne({ roomId: data.roomId });
      if (!convo) return;
      if (convo.sellerEmail !== data.sellerEmail) return;

      convo.offerStatus = 'rejected';
      await convo.save();

      const msg = new Message({
        roomId: data.roomId, author: data.sellerEmail,
        text: `❌ Offer rejected. Feel free to make a new offer.`,
        type: 'offer_rejected'
      });
      await msg.save();

      io.to(data.roomId).emit('receive_message', {
        _id: msg._id, roomId: data.roomId, author: data.sellerEmail,
        text: msg.text, type: 'offer_rejected', createdAt: msg.createdAt
      });
      io.to(data.roomId).emit('offer_update', { offerStatus: 'rejected' });

      // Notify buyer
      if (onlineUsers[convo.buyerEmail]) {
        io.to(onlineUsers[convo.buyerEmail]).emit('inbox_update', {
          roomId: data.roomId, fromEmail: data.sellerEmail,
          text: `❌ Your offer was rejected. Try a new amount.`,
          itemTitle: convo.itemTitle
        });
      }
    } catch (err) { console.error('reject_offer error:', err.message); }
  });

  socket.on('typing',      ({ roomId, author }) => { socket.to(roomId).emit('typing', { author }); });
  socket.on('stop_typing', ({ roomId })         => { socket.to(roomId).emit('stop_typing'); });
  socket.on('disconnect',  ()                   => { if (socket.userEmail) delete onlineUsers[socket.userEmail]; });
});

server.listen(PORT, () => console.log(`🚀 Bazaar engine on port ${PORT}`));