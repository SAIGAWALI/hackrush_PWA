const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true }, // Firebase ID
  email: { type: String, required: true },
  name: { type: String },
  karma: { type: Number, default: 10 }, // Start with 10 points
  listings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  createdAt: { type: Date, default: Date.now }
});