import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Edit, Trash2, X, FileText, Plus, Upload as UploadIcon, File, AlertTriangle } from 'lucide-react';
import AdminLayout from '@/app/components/AdminLayout';
import resourceService from '@/services/api/resourceService';

const defaultCategories = [
  'AI',
  'ML',
  'Computer Science',
  'Physics',
  'Chemistry',
  'Mathematics',
  'Economics',
  'History',
  'Literature',
  'Biology',
];

const emptyResource = {
  id: null,
  title: '',
  category: '',
  subject: '',
  resourceType: 'pdf',
  description: '',
  file: null,
  currentFileUrl: '',
  currentFileName: '',
};

export default function ResourceManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [resources, setResources] = useState([]);
  const [modalMessage, setModalMessage] = useState(null);
  const [categories, setCategories] = useState(defaultCategories);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formResource, setFormResource] = useState(emptyResource);
  const [createResource, setCreateResource] = useState({
    title: '',
    category: '',
    subject: '',
    resourceType: '',
    description: '',
    file: null,
  });
  const [createStatus, setCreateStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadResources = async (search = '') => {
    try {
      const response = await resourceService.getAllResources({ search, size: 100 });
      setResources(response.resources || []);
    } catch (error) {
      console.error('Failed to load resources:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await resourceService.getCategories();
      const dynamicCategories = (response || []).map((category) => category.name).filter(Boolean);
      setCategories(Array.from(new Set([...defaultCategories, ...dynamicCategories])));
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories(defaultCategories);
    }
  };

  useEffect(() => {
    loadResources();
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setCreateStatus('');
    setCreateResource({
      title: '',
      category: '',
      subject: '',
      resourceType: '',
      description: '',
      file: null,
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateStatus('');
    setUploading(false);
  };

  const openEditModal = (resource) => {
    setFormResource({
      id: resource.id,
      title: resource.title,
      category: resource.category,
      subject: resource.subject,
      resourceType:
        resource.resourceType === 'guide' || resource.type === 'guide'
          ? 'pdf'
          : resource.resourceType === 'paper' || resource.type === 'paper'
            ? 'article'
            : resource.resourceType || resource.type || 'pdf',
      description: resource.description,
      file: null,
      currentFileUrl: resource.fileUrl || '',
      currentFileName: resource.fileName || '',
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setFormResource(emptyResource);
  };

  const handleDelete = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      await resourceService.deleteResource(resourceId);
      await loadResources(searchTerm);
    } catch (error) {
      console.error('Failed to delete resource:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setUploading(true);
    setCreateStatus('');

    try {
      const payload = new FormData();
      payload.append('title', createResource.title);
      payload.append('category', createResource.category);
      payload.append('subject', createResource.subject);
      payload.append('resourceType', createResource.resourceType);
      payload.append('description', createResource.description);
      payload.append('file', createResource.file);

      await resourceService.uploadResource(payload);
      setCreateStatus('Resource uploaded successfully.');
      await loadResources(searchTerm);
      await loadCategories();
      closeCreateModal();
    } catch (error) {
      setCreateStatus(error.message || 'Upload failed.');
      setUploading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = new FormData();
      payload.append('title', formResource.title);
      payload.append('category', formResource.category);
      payload.append('subject', formResource.subject);
      payload.append('resourceType', formResource.resourceType);
      payload.append('description', formResource.description);
      if (formResource.file) payload.append('file', formResource.file);
      await resourceService.updateResource(formResource.id, payload);
      closeEditModal();
      await loadResources(searchTerm);
      await loadCategories();
    } catch (error) {
      setModalMessage({
        title: 'Update Failed',
        text: error.message || 'Failed to update resource.',
        buttonText: 'OK'
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Resource Management</h1>
            <p className="text-gray-600 mt-1">Create, edit, and delete PDFs/articles from one place. Showing {resources.length} resources.</p>
          </div>
          <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors">
            <Plus className="size-5" />
            Add New Resource
          </button>
        </motion.div>

        <form onSubmit={(e) => { e.preventDefault(); loadResources(searchTerm); }} className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search resources..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg" />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-orange-600 text-white rounded-lg">Search</button>
        </form>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Title</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Category</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Author of Resource</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Type</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-16 text-gray-400">No resources found.</td></tr>
                ) : resources.map((resource) => (
                  <tr key={resource.id} className="border-b border-gray-200">
                    <td className="py-4 px-6">{resource.title}</td>
                    <td className="py-4 px-6">{resource.category}</td>
                    <td className="py-4 px-6">{resource.subject}</td>
                    <td className="py-4 px-6">{resource.type}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(resource)} className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"><Edit className="size-4" /></button>
                        <button onClick={() => handleDelete(resource.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeCreateModal} />
            <motion.div className="fixed inset-0 flex items-center justify-center z-50 p-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Add New Resource</h2>
                  <button onClick={closeCreateModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="size-5 text-gray-500" /></button>
                </div>

                <form onSubmit={handleCreate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input name="title" value={createResource.title} onChange={(e) => setCreateResource((prev) => ({ ...prev, title: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select name="category" value={createResource.category} onChange={(e) => setCreateResource((prev) => ({ ...prev, category: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required>
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Author of Resource</label>
                      <input name="subject" value={createResource.subject} onChange={(e) => setCreateResource((prev) => ({ ...prev, subject: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Resource Type</label>
                    <select name="resourceType" value={createResource.resourceType} onChange={(e) => setCreateResource((prev) => ({ ...prev, resourceType: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required>
                      <option value="">Select a type</option>
                      <option value="pdf">PDF</option>
                      <option value="article">Article</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea name="description" value={createResource.description} onChange={(e) => setCreateResource((prev) => ({ ...prev, description: e.target.value }))} rows={5} className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
                    <label className="flex items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-orange-500 transition-colors">
                      <UploadIcon className="size-6 text-orange-600" />
                      <span>{createResource.file ? createResource.file.name : 'Choose a file to upload'}</span>
                      <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setCreateResource((prev) => ({ ...prev, file: e.target.files?.[0] || null }))} className="hidden" required />
                    </label>
                  </div>

                  {createStatus && <p className="text-sm text-orange-600">{createStatus}</p>}

                  <div className="flex items-center gap-3 pt-2">
                    <button type="button" onClick={closeCreateModal} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={uploading} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-60">
                      <File className="size-4" />
                      {uploading ? 'Uploading...' : 'Add Resource'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeEditModal} />
            <motion.div className="fixed inset-0 flex items-center justify-center z-50 p-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Edit Resource</h2>
                  <button onClick={closeEditModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="size-5 text-gray-500" /></button>
                </div>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <input value={formResource.title} onChange={(e) => setFormResource({ ...formResource, title: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Title" required />
                  <div className="grid md:grid-cols-2 gap-4">
                    <select value={formResource.category} onChange={(e) => setFormResource({ ...formResource, category: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" required>
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <input value={formResource.subject} onChange={(e) => setFormResource({ ...formResource, subject: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="Author of Resource" required />
                  </div>
                  <select value={formResource.resourceType} onChange={(e) => setFormResource({ ...formResource, resourceType: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg">
                    <option value="pdf">PDF</option>
                    <option value="article">Article</option>
                  </select>
                  <textarea value={formResource.description} onChange={(e) => setFormResource({ ...formResource, description: e.target.value })} rows={5} className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none" placeholder="Description" required />
                  {formResource.currentFileName && (
                    <div className="flex items-start gap-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-3">
                      <FileText className="size-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Current resource file</p>
                        <p>{formResource.currentFileName}</p>
                        {formResource.currentFileUrl && (
                          <p className="text-xs text-blue-600 mt-1 break-all">{formResource.currentFileUrl}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setFormResource({ ...formResource, file: e.target.files?.[0] || null })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                  {formResource.file && (
                    <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      Selected file: {formResource.file.name}
                    </p>
                  )}
                  <div className="flex items-center gap-3 pt-4">
                    <button type="button" onClick={closeEditModal} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700">Update</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reusable Centered Custom Modal Message */}
      <AnimatePresence>
        {modalMessage && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalMessage(null)}
            />
            <motion.div
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="size-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{modalMessage.title || 'Notification'}</h3>
                <p className="text-sm text-slate-500">{modalMessage.text}</p>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (modalMessage.action) modalMessage.action();
                      setModalMessage(null);
                    }}
                    className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-xl text-xs hover:opacity-95 shadow-md"
                  >
                    {modalMessage.buttonText || 'OK'}
                  </button>
                  {modalMessage.cancelText && (
                    <button
                      type="button"
                      onClick={() => setModalMessage(null)}
                      className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50"
                    >
                      {modalMessage.cancelText}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
