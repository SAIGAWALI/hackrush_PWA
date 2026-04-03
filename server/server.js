const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const Item = require('./models/Item'); // Import the model

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route for Checkpoint 1
app.get('/', (req, res) => {
  res.send('Bazaar@IITGN Server is Running!');
});

// Database Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bazaar_iitgn';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('Database connection error:', err));

  // Test Route: Add a dummy item
app.post('/api/test-item', async (req, res) => {
  try {
    const newItem = new Item({
      title: "Hero Cycle",
      description: "Good condition, 2 years old",
      price: 1500,
      category: "Cycles",
      hostel: "Aiyana",
      seller: "sai@iitgn.ac.in"
    });
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route to get all items
app.get('/api/items', async (req, res) => {
  const items = await Item.find();
  res.json(items);
});