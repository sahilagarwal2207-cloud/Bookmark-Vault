const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    title: { type: String, required: true },
    domain: { type: String, required: true },
    summary: [{ type: String }],
    tags: [{ type: String }],
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

bookmarkSchema.index({ title: 'text', summary: 'text' });

module.exports = mongoose.model('Bookmark', bookmarkSchema);