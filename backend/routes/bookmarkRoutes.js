const express = require('express');
const router = express.Router();
const Bookmark = require('../models/Bookmark');
const { processArticle } = require('../services/aiSummarizer');

// POST /api/bookmarks - Create & summarize
router.post('/bookmarks', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required.' });

    console.log(`Processing URL: ${url}`);
    const articleData = await processArticle(url);
    
    const newBookmark = await Bookmark.create({ url, ...articleData });
    res.status(201).json(newBookmark);
  } catch (error) {
    // LOG DETAILED ERROR TO TERMINAL
    console.error('POST /bookmarks Error:', error);
    res.status(500).json({ error: error.message || 'Server processing error.' });
  }
});

// GET /api/bookmarks - Fetch all
router.get('/bookmarks', async (req, res) => {
  try {
    const { tag, search } = req.query;
    let query = {};

    if (tag) query.tags = tag;
    if (search) query.$text = { $search: search };

    const bookmarks = await Bookmark.find(query).sort({ createdAt: -1 });
    res.json(bookmarks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve bookmarks.' });
  }
});

// PATCH /api/bookmarks/:id - Toggle read status
router.patch('/bookmarks/:id', async (req, res) => {
  try {
    const bookmark = await Bookmark.findById(req.params.id);
    if (!bookmark) return res.status(404).json({ error: 'Bookmark not found' });

    bookmark.isRead = !bookmark.isRead;
    await bookmark.save();
    res.json(bookmark);
  } catch (error) {
    res.status(500).json({ error: 'Update failed.' });
  }
});

// DELETE /api/bookmarks/:id - Delete bookmark
router.delete('/bookmarks/:id', async (req, res) => {
  try {
    await Bookmark.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bookmark deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed.' });
  }
});

// REQUIRED: Export the router instance
module.exports = router;