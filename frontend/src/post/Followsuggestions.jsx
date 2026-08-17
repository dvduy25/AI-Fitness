import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { UserPlus, Check, BadgeCheck, Users, ChevronLeft, ChevronRight } from 'lucide-react';

export default function FollowSuggestions({ token, onFollow, onViewProfile }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followedIds, setFollowedIds] = useState([]); // hiệu ứng "Đã theo dõi" trước khi card biến mất
  const scrollRef = React.useRef(null);

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

  useEffect(() => { fetchSuggestions(); }, []);

  const handleFollowClick = async (userId) => {
    setFollowedIds(prev => [...prev, userId]);
    await onFollow(userId);
    // Đợi 1 nhịp ngắn để người dùng thấy trạng thái "Đã theo dõi" trước khi card biến mất
    setTimeout(() => {
      setSuggestions(prev => prev.filter(u => u._id !== userId));
      setFollowedIds(prev => prev.filter(id => id !== userId));
    }, 600);
  };

  const scrollBy = (amount) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  if (!loading && suggestions.length === 0) return null;

  return (
    <div className="bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-5 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3.5">
        <h3 className="text-white text-[15px] font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" /> Gợi ý theo dõi
        </h3>
        {suggestions.length > 2 && (
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scrollBy(-180)}
              className="p-1.5 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              title="Cuộn trái"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scrollBy(180)}
              className="p-1.5 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              title="Cuộn phải"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-800 border-t-emerald-400"></div></div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto custom-scrollbar pb-1 -mx-1 px-1 snap-x snap-mandatory"
        >
          {suggestions.map(user => {
            const isBadge = user.isVerified || user.role === 'trainer';
            const justFollowed = followedIds.includes(user._id);
            return (
              <div
                key={user._id}
                className="shrink-0 w-[132px] snap-start bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl p-3.5 flex flex-col items-center text-center transition-colors"
              >
                <img
                  onClick={() => onViewProfile(user._id, { name: user.name, isVerified: user.isVerified, avatar: user.avatar, role: user.role })}
                  src={user.avatar || "https://ui-avatars.com/api/?name=U"}
                  className={`w-14 h-14 rounded-full object-cover cursor-pointer mb-2 ${user.role === 'trainer' ? 'ring-2 ring-sky-400/70 ring-offset-2 ring-offset-gray-900' : 'ring-1 ring-white/10'}`}
                  alt="avatar"
                />
                <p
                  onClick={() => onViewProfile(user._id, { name: user.name, isVerified: user.isVerified, avatar: user.avatar, role: user.role })}
                  className="text-[13px] font-semibold text-gray-100 flex items-center justify-center gap-1 truncate w-full cursor-pointer hover:text-emerald-400 transition-colors"
                  title={user.name}
                >
                  <span className="truncate">{user.name}</span>
                  {isBadge && <BadgeCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                </p>

                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug min-h-[28px] flex items-center justify-center">
                  {user.role === 'trainer' ? (
                    <span className="text-sky-400/80 font-medium">Personal Trainer</span>
                  ) : user.mutualCount > 0 ? (
                    <span>{user.mutualCount} bạn chung theo dõi</span>
                  ) : (
                    <span>{user.followersCount || 0} người theo dõi</span>
                  )}
                </p>

                <button
                  onClick={() => handleFollowClick(user._id)}
                  disabled={justFollowed}
                  className={`w-full mt-2 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl transition-all ${
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}