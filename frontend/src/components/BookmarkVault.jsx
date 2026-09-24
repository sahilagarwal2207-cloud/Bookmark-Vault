import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api/bookmarks';

export default function BookmarkVault() {
  const [bookmarks, setBookmarks] = useState([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [layout, setLayout] = useState('grid');
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchBookmarks = async () => {
      try {
        let endpoint = `${API_URL}?`;
        if (selectedTag !== 'all') endpoint += `tag=${encodeURIComponent(selectedTag)}&`;
        if (searchTerm) endpoint += `search=${encodeURIComponent(searchTerm)}`;

        const res = await fetch(endpoint);
        const data = await res.json();

        if (isMounted) {
          if (res.ok && Array.isArray(data)) {
            setBookmarks(data);
          } else {
            setBookmarks([]);
          }
        }
      } catch (err) {
        console.error('Fetch error:', err);
        if (isMounted) setBookmarks([]);
      }
    };

    fetchBookmarks();

    return () => {
      isMounted = false;
    };
  }, [selectedTag, searchTerm]);

  // Toast notification helper
  const showToastMessage = (message, icon = 'auto_awesome') => {
    setToast({ message, icon });
    setTimeout(() => setToast(null), 3500);
  };

  // Submit URL to backend API
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to summarize URL');

      setBookmarks((prev) => [data, ...prev]);
      setUrl('');
      showToastMessage('Article summarized via Gemini 1.5 Flash!', 'bolt');
    } catch (err) {
      setError(err.message);
      showToastMessage(err.message, 'warning');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Read Status
  const toggleRead = async (id) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'PATCH' });
      const updated = await res.json();

      setBookmarks((prev) => prev.map((b) => (b._id === id ? updated : b)));
      showToastMessage(updated.isRead ? 'Marked as read' : 'Marked as unread', 'bookmark');
    } catch (err) {
      console.error('Toggle read failed:', err);
    }
  };

  // Delete Bookmark
  const deleteBookmark = async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      setBookmarks((prev) => prev.filter((b) => b._id !== id));
      showToastMessage('Bookmark deleted from vault', 'delete');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Safe Clipboard paste helper (err is now logged to eliminate ESLint warning)
  const handlePasteHelper = async () => {
    try {
      if (navigator?.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setUrl(text);
          showToastMessage('Pasted URL from clipboard', 'content_paste');
        }
      } else {
        showToastMessage('Clipboard not supported in this browser', 'warning');
      }
    } catch (err) {
      console.error('Clipboard paste failed:', err);
      showToastMessage('Clipboard access denied', 'warning');
    }
  };

  // Safely extract unique tags
  const allUniqueTags = Array.from(
    new Set(bookmarks.flatMap((b) => (Array.isArray(b.tags) ? b.tags : [])))
  );

  // Safe Filter & Sort Logic
  const filteredBookmarks = bookmarks
    .filter((b) => {
      const summaryText = Array.isArray(b.summary)
        ? b.summary.join(' ')
        : typeof b.summary === 'string'
        ? b.summary
        : '';
      const text = `${b.title || ''} ${b.domain || ''} ${summaryText}`.toLowerCase();
      const matchesSearch = !searchTerm || text.includes(searchTerm.toLowerCase());
      const matchesTag =
        selectedTag === 'all' || (Array.isArray(b.tags) && b.tags.includes(selectedTag));
      return matchesSearch && matchesTag;
    })
    .sort((a, b) => {
      if (sortOrder === 'unread') return (a.isRead ? 1 : 0) - (b.isRead ? 1 : 0);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  const totalCount = bookmarks.length;
  const unreadCount = bookmarks.filter((b) => !b.isRead).length;

  return (
    <div className="w-full max-w-[1600px] mx-auto px-6 pt-6 min-h-screen font-sans text-slate-800">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-xl border border-indigo-200">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <span className="material-symbols-outlined text-[18px]">{toast.icon}</span>
          </div>
          <div>
            <p className="font-semibold text-[13px] text-slate-900 leading-tight">{toast.message}</p>
            <p className="text-[11px] text-slate-500">Connected to Gemini 1.5 API</p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative w-full pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
            <span>Neural Knowledge Store</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-indigo-600">Gemini 1.5 Flash</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 bg-clip-text text-transparent">
              Bookmark Vault
            </span>
          </h1>
          <p className="text-slate-500 max-w-xl">
            Autonomous URL summarization, metadata extraction, and persistent knowledge storage.
          </p>
        </div>

        {/* Telemetry Stats */}
        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Stored</span>
            <span className="text-xl font-bold text-slate-900">{totalCount}</span>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unread</span>
            <span className="text-xl font-bold text-purple-600">{unreadCount}</span>
          </div>
        </div>
      </div>

      {/* URL Ingestion Form */}
      <div className="relative w-full rounded-2xl bg-white p-4 shadow-md border border-slate-200 mb-8">
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-3 items-stretch">
          <div className="relative flex-1 flex items-center">
            <span className="material-symbols-outlined absolute left-4 text-slate-400 text-[20px]">link</span>
            <input
              type="url"
              className="w-full h-12 pl-12 pr-28 rounded-xl bg-slate-50 text-slate-800 placeholder:text-slate-400 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Paste article URL (e.g. https://dev.to/...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={handlePasteHelper}
              className="absolute right-2 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-200 shadow-sm flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">content_paste</span>
              Paste
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`h-12 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
              loading ? 'opacity-70 cursor-not-allowed' : 'hover:brightness-105'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>
              {loading ? 'sync' : 'auto_awesome'}
            </span>
            <span>{loading ? 'Summarizing...' : 'Save & Summarize'}</span>
          </button>
        </form>

        {loading && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin"></div>
              <span className="text-xs font-medium text-indigo-600 animate-pulse">
                Extracting article DOM and synthesizing takeaways with Gemini AI...
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 text-xs border border-slate-200 focus:outline-none focus:border-indigo-500 shadow-sm"
              placeholder="Search summaries, titles, or domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              className="h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="unread">Unread First</option>
            </select>

            <div className="flex p-1 rounded-lg bg-slate-100 border border-slate-200">
              <button
                onClick={() => setLayout('grid')}
                className={`p-1 rounded ${layout === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button
                onClick={() => setLayout('list')}
                className={`p-1 rounded ${layout === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
              >
                <span className="material-symbols-outlined text-[18px]">view_list</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Tag Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-semibold text-slate-400 mr-1">Tags:</span>
          <button
            onClick={() => setSelectedTag('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedTag === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {allUniqueTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                selectedTag === tag
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Display */}
      {filteredBookmarks.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 my-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3">
            <span className="material-symbols-outlined text-[32px]">bookmark_add</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No bookmarks found</h3>
          <p className="text-xs text-slate-500 max-w-md">
            Paste an article URL in the bar above to generate your first AI summary!
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-6 ${
            layout === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
          }`}
        >
          {filteredBookmarks.map((b, index) => (
            <article
              key={b._id || index}
              className={`rounded-2xl bg-white p-5 shadow-sm border transition-all flex flex-col justify-between ${
                b.isRead ? 'border-slate-200 opacity-80' : 'border-indigo-100 hover:border-indigo-400 hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-600 font-bold">
                    {b.domain || 'web'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'Saved'}
                  </span>
                </div>

                <a href={b.url} target="_blank" rel="noreferrer" className="block group mb-3">
                  <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-start justify-between gap-2">
                    <span>{b.title || 'Untitled Article'}</span>
                    <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-indigo-600">
                      north_east
                    </span>
                  </h2>
                </a>

                <div className="p-3.5 rounded-xl bg-slate-50 mb-4 space-y-2 border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-indigo-600 text-[15px]">auto_awesome</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                      AI Takeaways
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {Array.isArray(b.summary) ? (
                      b.summary.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-indigo-500 text-[14px] shrink-0 mt-0.5">
                            check_circle
                          </span>
                          <span>{point}</span>
                        </li>
                      ))
                    ) : (
                      <li className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-indigo-500 text-[14px] shrink-0 mt-0.5">
                          check_circle
                        </span>
                        <span>{typeof b.summary === 'string' ? b.summary : 'No summary provided.'}</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {Array.isArray(b.tags) &&
                    b.tags.map((tag) => (
                      <span
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium cursor-pointer hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        #{tag}
                      </span>
                    ))}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => toggleRead(b._id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                      b.isRead
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {b.isRead ? 'check' : 'bookmark_border'}
                    </span>
                    <span>{b.isRead ? 'Read' : 'Mark as Read'}</span>
                  </button>

                  <button
                    onClick={() => deleteBookmark(b._id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    title="Delete bookmark"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}