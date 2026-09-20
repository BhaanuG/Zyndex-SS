import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { FolderOpen, Users, MessageSquare, TrendingUp, Activity } from 'lucide-react';
import AdminLayout from '@/app/components/AdminLayout';
import { useAuth } from '@/app/context/AuthContext';
import resourceService from '@/services/api/resourceService';
import userService from '@/services/api/userService';
import feedbackService from '@/services/api/feedbackService';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { getUrlSafeName, getUrlSafeEmail, user } = useAuth();
  const [stats, setStats] = useState([
    { title: 'Total Resources', value: '0', icon: FolderOpen, gradient: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-100', link: '' },
    { title: 'Total Users', value: '0', icon: Users, gradient: 'from-red-500 to-red-600', bgColor: 'bg-red-100', link: '' },
    { title: 'Feedback Count', value: '0', icon: MessageSquare, gradient: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-100', link: '' },
  ]);

  const adminName = getUrlSafeName();
  const adminEmail = getUrlSafeEmail();
  const baseUrl = `/Zyndex/Admin/${adminName}/${adminEmail}`;

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [resourceStats, usersResponse, feedbackStats] = await Promise.all([
          resourceService.getResourceStats(),
          userService.getAllUsers({ size: 100 }),
          feedbackService.getFeedbackStats(),
        ]);

        setStats([
          { title: 'Total Resources', value: String(resourceStats.totalResources || 0), icon: FolderOpen, gradient: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-100', link: `${baseUrl}/Resource-Management` },
          { title: 'Total Users', value: String(usersResponse.users?.length || usersResponse.totalElements || 0), icon: Users, gradient: 'from-red-500 to-red-600', bgColor: 'bg-red-100', link: `${baseUrl}/User-Access` },
          { title: 'Feedback Count', value: String(feedbackStats.total || 0), icon: MessageSquare, gradient: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-100', link: `${baseUrl}/Feedback-Review` },
        ]);
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      }
    }

    loadDashboard();
  }, [baseUrl]);

  return (
    <AdminLayout>
      <div className="space-y-8 min-h-screen">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <motion.div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-4" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Activity className="size-4" />
            Admin Panel
          </motion.div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
            Welcome {user?.name || 'Admin'}
          </h1>
          <p className="text-gray-600 text-lg">Live summary for resources, users, and feedback.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.title} onClick={() => navigate(stat.link)} className="group relative bg-white rounded-2xl shadow-lg p-8 cursor-pointer overflow-hidden border border-gray-100" initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 * index }} whileHover={{ y: -10 }}>
                <div className={`absolute top-0 right-0 w-40 h-40 ${stat.bgColor} rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity`} />
                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`size-16 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                      <Icon className="size-8 text-white" />
                    </div>
                    <div className="size-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                      <TrendingUp className="size-5 text-gray-600 group-hover:text-orange-600 transition-colors" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-gray-900 mb-2">{stat.value}</p>
                  <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
