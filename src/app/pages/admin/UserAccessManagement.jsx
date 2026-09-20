import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, Edit, Trash2, X, User, Mail, Lock, Hash, KeyRound, Eye, EyeOff } from 'lucide-react';
import AdminLayout from '@/app/components/AdminLayout';
import userService from '@/services/api/userService';
import { sendAccountCreatedEmail } from '@/services/email/accountEmail';

const emptyUser = { id: null, name: '', email: '', password: '', registrationNo: '', role: 'user' };
const emptyResetState = { id: null, name: '', password: '', confirmPassword: '' };

export default function UserAccessManagement() {
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [formUser, setFormUser] = useState(emptyUser);
  const [resetUser, setResetUser] = useState(emptyResetState);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  const getTimeLeft = (expiryDate) => {
    if (!expiryDate || expiryDate === '') return 'N/A';
    const ms = new Date(expiryDate) - new Date();
    if (ms <= 0) return 'Expired';
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return `${days} day${days > 1 ? 's' : ''} left`;
  };

  const loadUsers = async (search = '') => {
    try {
      const response = await userService.getAllUsers({ search, size: 100 });
      setUsers(response.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setFormUser(emptyUser);
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setIsEditing(true);
    setFormUser({ ...emptyUser, ...user });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormUser(emptyUser);
  };

  const openResetModal = (user) => {
    setResetUser({
      id: user.id,
      name: user.name,
      password: '',
      confirmPassword: '',
    });
    setShowResetModal(true);
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetUser(emptyResetState);
    setShowResetPassword(false);
    setShowResetConfirmPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (isEditing) {
        await userService.updateUser(formUser.id, {
          name: formUser.name,
          email: formUser.email,
          role: formUser.role,
          password: formUser.password || undefined,
        });

        closeModal();
        await loadUsers(searchTerm);
        alert('User updated successfully.');
        return;
      }

      const createdUser = {
        name: formUser.name.trim(),
        email: formUser.email.trim(),
        role: formUser.role,
      };

      await userService.createUser({
        name: createdUser.name,
        email: createdUser.email,
        password: formUser.password,
        registrationNo: formUser.registrationNo,
        role: createdUser.role,
      });

      let confirmationEmailSent = true;
      let confirmationEmailError = '';

      try {
        await sendAccountCreatedEmail({
          name: createdUser.name,
          email: createdUser.email,
          role: createdUser.role,
          createdByAdmin: true,
        });
      } catch (mailError) {
        confirmationEmailSent = false;
        confirmationEmailError = mailError?.text || mailError?.message || 'Confirmation email could not be sent.';
        console.error('Admin user confirmation email failed:', mailError);
      }

      closeModal();
      await loadUsers(searchTerm);
      alert(
        confirmationEmailSent
          ? `User created successfully. A confirmation email has been sent to ${createdUser.email}.`
          : `User created successfully, but the confirmation email could not be sent. ${confirmationEmailError}`
      );
    } catch (error) {
      alert(error.message || 'Failed to save user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await userService.deleteUser(userId);
      await loadUsers(searchTerm);
    } catch (error) {
      alert(error.message || 'Failed to delete user.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (resetUser.password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    if (resetUser.password !== resetUser.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    try {
      const currentUser = users.find((user) => user.id === resetUser.id);
      if (!currentUser) {
        throw new Error('User not found.');
      }

      await userService.updateUser(resetUser.id, {
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        password: resetUser.password,
      });

      closeResetModal();
      alert(`Password reset successfully for ${currentUser.name}.`);
    } catch (error) {
      alert(error.message || 'Failed to reset password.');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">User Access Management</h1>
            <p className="text-gray-600 mt-1">Create, read, update, and delete users. Showing {users.length} users.</p>
          </div>
          <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors">
            <Plus className="size-5" />
            Add User
          </button>
        </motion.div>

        <form onSubmit={(e) => { e.preventDefault(); loadUsers(searchTerm); }} className="bg-white rounded-xl shadow-md p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search users by name or email..." className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg" />
          </div>
        </form>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Name</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Email</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Role</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Subscription Plan</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Time Left</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Joined</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-16 text-gray-400">No users found.</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-200">
                    <td className="py-4 px-6 font-medium text-gray-900">{user.name}</td>
                    <td className="py-4 px-6">{user.email}</td>
                    <td className="py-4 px-6 capitalize">{user.role}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        !user.subscriptionPlan || user.subscriptionPlan === 'FREE'
                          ? 'bg-gray-100 text-gray-700'
                          : user.subscriptionPlan.includes('BASIC')
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700 border border-orange-200'
                      }`}>
                        {(user.subscriptionPlan || 'FREE').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold">
                      <span className={getTimeLeft(user.subscriptionExpiresAt) === 'Expired' ? 'text-red-600' : 'text-gray-700'}>
                        {getTimeLeft(user.subscriptionExpiresAt)}
                      </span>
                    </td>
                    <td className="py-4 px-6">{new Date(user.dateJoined).toLocaleDateString()}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(user)} className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"><Edit className="size-4" /></button>
                        <button onClick={() => openResetModal(user)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Reset Password"><KeyRound className="size-4" /></button>
                        <button onClick={() => handleDeleteUser(user.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"><Trash2 className="size-4" /></button>
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
        {showModal && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} />
            <motion.div className="fixed inset-0 flex items-center justify-center z-50 p-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">{isEditing ? 'Edit User' : 'Add New User'}</h2>
                  <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="size-5 text-gray-500" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" /><input type="text" value={formUser.name} onChange={(e) => setFormUser({ ...formUser, name: e.target.value })} placeholder="Full name" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg" required /></div>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" /><input type="email" value={formUser.email} onChange={(e) => setFormUser({ ...formUser, email: e.target.value })} placeholder="user@email.com" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg" required /></div>
                  <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" /><input type="password" value={formUser.password} onChange={(e) => setFormUser({ ...formUser, password: e.target.value })} placeholder={isEditing ? "New password (leave blank to keep current)" : "Password"} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg" required={!isEditing} /></div>
                  {!isEditing && <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" /><input type="text" value={formUser.registrationNo} onChange={(e) => setFormUser({ ...formUser, registrationNo: e.target.value })} placeholder="Registration number" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg" /></div>}
                  <select value={formUser.role} onChange={(e) => setFormUser({ ...formUser, role: e.target.value })} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  {isEditing && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Existing passwords cannot be viewed. Enter a new password here only if you want to reset it.
                    </p>
                  )}
                  <div className="flex items-center gap-3 pt-4">
                    <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed">
                      {isSaving ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update' : 'Create')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResetModal && (
          <>
            <motion.div className="fixed inset-0 bg-black/50 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeResetModal} />
            <motion.div className="fixed inset-0 flex items-center justify-center z-50 p-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Reset Password</h2>
                    <p className="text-sm text-gray-600 mt-1">{resetUser.name}</p>
                  </div>
                  <button onClick={closeResetModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="size-5 text-gray-500" /></button>
                </div>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      value={resetUser.password}
                      onChange={(e) => setResetUser({ ...resetUser, password: e.target.value })}
                      placeholder="New password"
                      className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg"
                      required
                    />
                    <button type="button" onClick={() => setShowResetPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600">
                      {showResetPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <input
                      type={showResetConfirmPassword ? 'text' : 'password'}
                      value={resetUser.confirmPassword}
                      onChange={(e) => setResetUser({ ...resetUser, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg"
                      required
                    />
                    <button type="button" onClick={() => setShowResetConfirmPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600">
                      {showResetConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    This will replace the user's current password immediately.
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <button type="button" onClick={closeResetModal} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Reset Password</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}



