import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { UserPlus, Check, BadgeCheck, Users, Search, UserCheck2, X } from 'lucide-react';

export default function FollowSuggestions({ token, onFollow, onViewProfile }) {
  const [activeTab, setActiveTab] = useState('suggested'); // 'suggested' | 'followback'
  const [suggestions, setSuggestions] = useState([]);
  const [followBackList, setFollowBackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followedIds, setFollowedIds] = useState([]); // hiệu ứng "Đã theo dõi" trước khi biến mất

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/posts/suggested-users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setSuggestions(res.data.users);
    } catch (error) {
      console.error("Lỗi tải gợi ý follow", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowBack = async () => {
    try {
      const res = await api.get('/users/me/not-following-back', { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setFollowBackList(res.data.users);
    } catch (error) {
      console.error("Lỗi tải danh sách theo dõi lại", error);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    fetchFollowBack();
  }, []);

  // Tìm kiếm user toàn hệ thống, debounce 350ms để tránh spam API
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(searchTerm.trim())}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) setSearchResults(res.data.users);
      } catch (error) {
        console.error("Lỗi tìm kiếm user", error);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm, token]);

  const handleFollowClick = async (userId) => {
    setFollowedIds(prev => [...prev, userId]);
    await onFollow(userId);
    setTimeout(() => {
      setSuggestions(prev => prev.filter(u => u._id !== userId));
      setFollowBackList(prev => prev.filter(u => u._id !== userId));
      setSearchResults(prev => prev.map(u => u._id === userId ? { ...u, isFollowing: true } : u));
      setFollowedIds(prev => prev.filter(id => id !== userId));
    }, 600);
  };

  const renderUserRow = (user) => {
    const isBadge = user.isVerified || user.role === 'trainer';
    const justFollowed = followedIds.includes(user._id);
    const alreadyFollowing = !!user.isFollowing;

    return (
      <div
        key={user._id}
        className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all"
      >
        <img
          onClick={() => onViewProfile(user._id, { name: user.name, isVerified: user.isVerified, avatar: user.avatar, role: user.role })}
          src={user.avatar || "https://ui-avatars.com/api/?name=U"}
          className={`w-11 h-11 rounded-full object-cover cursor-pointer shrink-0 ${user.role === 'trainer' ? 'ring-2 ring-sky-400/70 ring-offset-2 ring-offset-gray-900' : 'ring-1 ring-white/10'}`}
          alt="avatar"
        />
        <div className="flex-1 min-w-0">
          <p
            onClick={() => onViewProfile(user._id, { name: user.name, isVerified: user.isVerified, avatar: user.avatar, role: user.role })}
            className="text-[13.5px] font-semibold text-gray-100 flex items-center gap-1 truncate cursor-pointer hover:text-emerald-400 transition-colors"
            title={user.name}
          >
            <span className="truncate">{user.name}</span>
            {isBadge && <BadgeCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
          </p>
          <p className="text-[11px] text-gray-500 truncate">
            {user.role === 'trainer' ? (
              <span className="text-sky-400/80 font-medium">Personal Trainer</span>
            ) : user.mutualCount > 0 ? (
              `${user.mutualCount} bạn chung theo dõi`
            ) : (
              `${user.followersCount || 0} người theo dõi`
            )}
          </p>
        </div>

        {alreadyFollowing ? (
          <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-gray-500 px-2.5 py-1.5">
            <UserCheck2 className="w-3.5 h-3.5" /> Đang theo dõi
          </span>
        ) : (
          <button
            onClick={() => handleFollowClick(user._id)}
            disabled={justFollowed}
            className={`shrink-0 flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all ${
              justFollowed
                ? 'bg-emerald-500/15 text-emerald-400 cursor-default'
                : 'bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white'
            }`}
          >
            {justFollowed ? (
              <><Check className="w-3.5 h-3.5" /> Đã theo dõi</>
            ) : (
              <><UserPlus className="w-3.5 h-3.5" /> Theo dõi</>
            )}
          </button>
        )}
      </div>
    );
  };

  const showingSearch = searchTerm.trim().length > 0;
  const listToShow = showingSearch ? searchResults : (activeTab === 'suggested' ? suggestions : followBackList);
  const nothingToShowAtAll = !loading && !showingSearch && suggestions.length === 0 && followBackList.length === 0;

  if (nothingToShowAtAll) return null;

  return (
    <div className="bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-xl shadow-black/20">
      <h3 className="text-white text-[15px] font-bold flex items-center gap-2 mb-3.5">
        <Users className="w-4 h-4 text-emerald-400" /> Khám phá người dùng
      </h3>

      {/* Ô tìm kiếm user toàn hệ thống */}
      <div className="relative mb-3.5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm người dùng..."
          className="w-full bg-black/20 border border-white/5 rounded-xl pl-9 pr-8 py-2.5 text-[13px] text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tab chuyển đổi Gợi ý / Theo dõi lại — ẩn khi đang tìm kiếm */}
      {!showingSearch && (
        <div className="flex gap-1.5 p-1 bg-black/20 rounded-xl mb-3.5">
          <button
            onClick={() => setActiveTab('suggested')}
            className={`flex-1 text-[12px] font-semibold py-1.5 rounded-lg transition-all ${
              activeTab === 'suggested' ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Gợi ý
          </button>
          <button
            onClick={() => setActiveTab('followback')}
            className={`flex-1 text-[12px] font-semibold py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'followback' ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Theo dõi lại
            {followBackList.length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {followBackList.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Danh sách — có thanh trượt, hiện khoảng 5 người rồi cuộn */}
      {(loading && !showingSearch) || searching ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-800 border-t-emerald-400"></div>
        </div>
      ) : listToShow.length > 0 ? (
        <div className="space-y-0.5 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
          {listToShow.map(renderUserRow)}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-[13px] text-gray-500">
            {showingSearch
              ? "Không tìm thấy người dùng nào."
              : activeTab === 'followback'
                ? "Mọi người theo dõi bạn đều đã được bạn theo dõi lại!"
                : "Chưa có gợi ý nào."}
          </p>
        </div>
      )}
    </div>
  );
}