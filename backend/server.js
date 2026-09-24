require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bookmarkRoutes = require('./routes/bookmarkRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', bookmarkRoutes);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bookmark_vault';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully to:', MONGO_URI);
    app.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Server listening on http://localhost:${process.env.PORT || 5000}`)
    );
  })
  .catch((err) => {
    console.error('❌ CRITICAL: MongoDB connection failed!');
    console.error(err.message);
  });