import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Download, FileText, Calendar, Tag, Star, Send, User, ExternalLink, Heart } from 'lucide-react';
import { useParams } from 'react-router';
import UserLayout from '@/app/components/UserLayout';
import { useAuth } from '@/app/context/AuthContext';
import resourceService from '@/services/api/resourceService';
import feedbackService from '@/services/api/feedbackService';
import userService from '@/services/api/userService';

export default function ResourceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [resource, setResource] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [message, setMessage] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [previewToken, setPreviewToken] = useState('');
  const [isOfflineCached, setIsOfflineCached] = useState(false);
  const [offlineBlobUrl, setOfflineBlobUrl] = useState('');
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8080/api` : 'http://localhost:8080/api');
  const backendBaseUrl = apiBaseUrl.replace(/\/api$/, '');

  useEffect(() => {
    async function loadResource() {
      try {
        const [response, favoriteResponse, tokenResponse] = await Promise.all([
          resourceService.getResourceById(id),
          userService.getFavorites({ size: 100 }),
          resourceService.getPreviewToken(id).catch(() => ({ token: '' })),
        ]);
        setResource(response);
        setIsFavorite((favoriteResponse.resources || []).some((item) => item.id === Number(id)));
        setPreviewToken(tokenResponse.token);
        await resourceService.trackResourceAccess(id);
      } catch (error) {
        console.error('Failed to load resource:', error);
        setResource(null);
      }
    }

    loadResource();
  }, [id]);

  useEffect(() => {
    async function checkOffline() {
      const list = JSON.parse(localStorage.getItem('offline_list') || '[]');
      const isCached = list.some(item => String(item.id) === String(id));
      setIsOfflineCached(isCached);
      if (isCached) {
        try {
          const cache = await caches.open('offline-resources');
          const cachedResponse = await cache.match(`/offline/resource/${id}`);
          if (cachedResponse) {
            const blob = await cachedResponse.blob();
            const blobUrl = URL.createObjectURL(blob);
            setOfflineBlobUrl(blobUrl);
          }
        } catch (err) {
          console.error('Failed to read offline cache', err);
        }
      }
    }
    checkOffline();
  }, [id]);

  useEffect(() => {
    async function checkSubscription() {
      if (user && user.subscriptionExpiresAt) {
        const expired = new Date(user.subscriptionExpiresAt) < new Date();
        if (expired) {
          try {
            const cache = await caches.open('offline-resources');
            const keys = await cache.keys();
            for (let key of keys) {
              await cache.delete(key);
            }
            localStorage.removeItem('offline_list');
            setIsOfflineCached(false);
            setOfflineBlobUrl('');
            alert('Your subscription plan has expired. Offline downloaded resources have been locked.');
          } catch (err) {
            console.error('Failed to clear expired cache', err);
          }
        }
      }
    }
    checkSubscription();
  }, [user]);

  useEffect(() => {
    const startTime = Date.now();
    return () => {
      const endTime = Date.now();
      const durationSeconds = Math.round((endTime - startTime) / 1000);
      if (durationSeconds > 0) {
        resourceService.trackReadingDuration(id, durationSeconds).catch((err) => {
          console.warn('Failed to log reading duration:', err);
        });
      }
    };
  }, [id]);

  const triggerBrowserDownload = ({ href, filename, newTab = false }) => {
    const link = document.createElement('a');
    link.href = href;
    if (filename) {
      link.download = filename;
    }
    if (newTab) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.remove(), 0);
  };

  const handleDownload = async () => {
    try {
      setMessage('');
      const response = await resourceService.downloadResource(id);

      let blob = null;
      if (response instanceof Blob) {
        blob = response;
      } else if (response?.downloadUrl) {
        const res = await fetch(response.downloadUrl);
        blob = await res.blob();
      }

      if (blob) {
        const cache = await caches.open('offline-resources');
        await cache.put(`/offline/resource/${id}`, new Response(blob));

        const list = JSON.parse(localStorage.getItem('offline_list') || '[]');
        if (!list.some(item => String(item.id) === String(id))) {
          list.push({
            id: id,
            title: resource.title,
            category: resource.category,
            type: resource.type,
            savedAt: Date.now()
          });
          localStorage.setItem('offline_list', JSON.stringify(list));
        }

        setIsOfflineCached(true);
        const blobUrl = URL.createObjectURL(blob);
        setOfflineBlobUrl(blobUrl);

        setMessage('Resource successfully saved in browser for offline reading!');
        return;
      }

      setMessage('This resource does not have a downloadable file yet.');
    } catch (error) {
      setMessage(error.message || 'Download failed.');
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();

    try {
      await feedbackService.rateResource(id, rating, feedback);

      setMessage('Feedback submitted successfully.');
      setRating(0);
      setFeedback('');
    } catch (error) {
      setMessage(error.message || 'Failed to submit feedback.');
    }
  };

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await userService.removeFromFavorites(id);
        setIsFavorite(false);
      } else {
        await userService.addToFavorites(id);
        setIsFavorite(true);
      }
    } catch (error) {
      setMessage(error.message || 'Failed to update favourites.');
    }
  };

  const previewUrl = offlineBlobUrl || (resource?.fileUrl
    ? (/^https?:\/\//i.test(resource.fileUrl) ? resource.fileUrl : `${apiBaseUrl}/resources/${id}/file?token=${previewToken}`)
    : '');
  const previewUrlWithVersion = previewUrl
    ? (offlineBlobUrl ? offlineBlobUrl : `${previewUrl}${previewUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(resource?.updatedAt || resource?.createdAt || '')}`)
    : '';

  const isPdfPreview = /\.pdf($|\?)/i.test(resource?.fileUrl || '') || /\.pdf($|\?)/i.test(resource?.fileName || '') || !!offlineBlobUrl;

  return (
    <UserLayout>
      <div className="py-8 px-6">
        <div className="max-w-4xl mx-auto">
          {!resource ? (
            <motion.div className="bg-white rounded-xl shadow-md p-16 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <FileText className="size-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Resource not found</p>
              <p className="text-sm">The resource you're looking for doesn't exist.</p>
            </motion.div>
          ) : (
            <>
              <motion.div className="bg-white rounded-xl shadow-md p-8 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-start justify-between mb-6 gap-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">{resource.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                      <div className="flex items-center gap-2"><Tag className="size-4" /><span>{resource.category}</span></div>
                      <div className="flex items-center gap-2"><User className="size-4" /><span>Author of Resource: {resource.author || resource.subject}</span></div>
                      <div className="flex items-center gap-2"><FileText className="size-4" /><span>{resource.type}</span></div>
                      <div className="flex items-center gap-2"><Calendar className="size-4" /><span>{new Date(resource.createdAt).toLocaleDateString()}</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={toggleFavorite} className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${isFavorite ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
                      <Heart className={`size-5 ${isFavorite ? 'fill-current' : ''}`} />
                      {isFavorite ? 'Favourite' : 'Add Favourite'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                        isOfflineCached
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-orange-600 text-white hover:bg-orange-700'
                      }`}
                    >
                      <Download className="size-5" />
                      {isOfflineCached ? 'Available Offline' : 'Download Offline'}
                    </button>
                  </div>
                </div>

                <div className="prose max-w-none">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
                  <p className="text-gray-700">{resource.description}</p>
                  {resource.fileUrl?.includes('example.com') && (
                    <p className="mt-4 text-sm text-amber-700">
                      This is seeded demo metadata from the database. Upload a real PDF or article file from the admin panel to replace it with actual downloadable content.
                    </p>
                  )}
                  {!resource.hasDownload && (
                    <p className="mt-4 text-sm text-amber-700">
                      This resource currently has description data only. Upload or attach a file from the admin panel to make it downloadable.
                    </p>
                  )}
                </div>
              </motion.div>

              <motion.div className="bg-white rounded-xl shadow-md p-8 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                  <h2 className="text-xl font-semibold text-gray-900">Preview Resource</h2>
                  {previewUrl && (
                    <a
                      href={previewUrlWithVersion}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 border border-orange-200 text-orange-700 rounded-lg font-medium hover:bg-orange-50 transition-colors"
                    >
                      <ExternalLink className="size-4" />
                      Open Full Preview
                    </a>
                  )}
                </div>

                {previewUrl && isPdfPreview ? (
                  <iframe
                    src={previewUrlWithVersion}
                    title={`${resource.title} preview`}
                    className="w-full h-[720px] border border-gray-200 rounded-xl"
                  />
                ) : previewUrl ? (
                  <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                    <p className="text-gray-700 mb-3">
                      Preview is available in a new tab for this resource.
                    </p>
                    <a
                      href={previewUrlWithVersion}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                    >
                      <ExternalLink className="size-4" />
                      Open Preview
                    </a>
                  </div>
                ) : (
                  <div className="border border-amber-200 rounded-xl p-6 bg-amber-50">
                    <p className="text-amber-800">
                      No preview file is attached yet. Upload a PDF or article file from the admin panel to preview it here.
                    </p>
                  </div>
                )}
              </motion.div>

              <motion.div className="bg-white rounded-xl shadow-md p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Leave Feedback</h2>
                <form onSubmit={handleSubmitFeedback} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Rate this resource</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoveredRating(star)} onMouseLeave={() => setHoveredRating(0)} className="focus:outline-none">
                          <Star className={`size-8 transition-colors ${star <= (hoveredRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Your feedback</label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Share your thoughts about this resource..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    />
                  </div>

                  {message && <p className="text-sm text-orange-600">{message}</p>}

                  <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors">
                    <Send className="size-4" />
                    Submit Feedback
                  </button>
                </form>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </UserLayout>
  );
}
