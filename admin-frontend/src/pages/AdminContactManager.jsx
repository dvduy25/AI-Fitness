import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, MessageSquare, CheckCircle2, Clock, X, Send, User } from 'lucide-react';

const AdminContactManager = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'resolved'
  const [searchTerm, setSearchTerm] = useState('');

  // Trạng thái Modal Phản hồi
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lấy dữ liệu từ Backend
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/contact/admin/all');
      if (res.data.success) {
        setContacts(res.data.data);
      }
    } catch (error) {
      console.error('Lỗi lấy danh sách liên hệ:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // Lọc dữ liệu theo Tab và Từ khóa
  const filteredContacts = contacts.filter(contact => {
    const matchesTab = activeTab === 'pending' ? contact.status !== 'resolved' : contact.status === 'resolved';
    const matchesSearch = contact.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (contact.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Mở Modal phản hồi
  const openReplyModal = (contact) => {
    setSelectedContact(contact);
    setReplyContent(contact.adminReply || '');
    setIsReplyModalOpen(true);
  };

  // Gửi phản hồi
  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;
    
    setIsSubmitting(true);
    try {
      await api.put(`/contact/admin/${selectedContact._id}/reply`, { adminReply: replyContent });
      
      setIsReplyModalOpen(false);
      setReplyContent('');
      fetchContacts(); // Tải lại danh sách
    } catch (error) {
      console.error('Lỗi gửi phản hồi:', error);
      alert('Có lỗi xảy ra khi gửi phản hồi!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getContactTypeBadge = (type) => {
    switch (type) {
      case 'bug': return <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold border border-red-200">🐞 Báo lỗi</span>;
      case 'feedback': return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold border border-yellow-200">💡 Góp ý</span>;
      default: return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200">🛟 Trợ giúp</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Hỗ trợ & Liên hệ</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và phản hồi các yêu cầu từ người dùng</p>
        </div>
      </div>

      {/* Thanh công cụ: Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200 w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'pending' ? 'bg-white text-blue-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Clock size={16} /> Chờ xử lý
          </button>
          <button 
            onClick={() => setActiveTab('resolved')}
            className={`flex-1 sm:flex-none flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'resolved' ? 'bg-white text-emerald-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <CheckCircle2 size={16} /> Đã giải quyết
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tiêu đề hoặc email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Danh sách yêu cầu */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Đang tải dữ liệu...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <CheckCircle2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Không có yêu cầu nào</h3>
            <p className="text-gray-500 text-sm">Tuyệt vời! Tất cả yêu cầu đã được xử lý.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredContacts.map(contact => (
              <div key={contact._id} className="p-5 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getContactTypeBadge(contact.type)}
                      <span className="text-sm font-bold text-gray-900">{contact.title}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{contact.content}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <User size={14} /> 
                        <span className="font-medium">{contact.user?.name || 'Người dùng ẩn danh'}</span>
                        <span className="text-gray-400">({contact.user?.email || 'N/A'})</span>
                      </div>
                      <span>•</span>
                      <span>{new Date(contact.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center sm:items-start shrink-0">
                    <button 
                      onClick={() => openReplyModal(contact)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border ${activeTab === 'pending' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    >
                      <MessageSquare size={16} /> 
                      {activeTab === 'pending' ? 'Phản hồi ngay' : 'Xem phản hồi'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Phản hồi */}
      {isReplyModalOpen && selectedContact && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-black text-gray-900">Chi tiết yêu cầu</h2>
              <button onClick={() => setIsReplyModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 mb-6">
              {/* Nội dung từ User */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                    {selectedContact.user?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{selectedContact.user?.name || 'User'}</div>
                    <div className="text-xs text-gray-500">{selectedContact.user?.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {getContactTypeBadge(selectedContact.type)}
                  <h4 className="font-bold text-gray-900">{selectedContact.title}</h4>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-xl border border-gray-100">
                  {selectedContact.content}
                </p>
              </div>

              {/* Form phản hồi của Admin */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Phản hồi của Admin</label>
                <textarea
                  rows={5}
                  placeholder="Nhập nội dung phản hồi cho người dùng..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 shrink-0">
              <button 
                onClick={() => setIsReplyModalOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={handleReplySubmit}
                disabled={!replyContent.trim() || isSubmitting}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 transition-all flex items-center gap-2 shadow-sm"
              >
                {isSubmitting ? 'Đang gửi...' : <><Send size={18} /> Gửi phản hồi</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContactManager;