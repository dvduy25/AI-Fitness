import React from 'react';
// Import các icon
import { Bell, Heart, MessageCircle, Share2, Bookmark, Activity, UserPlus, Trash2 } from 'lucide-react';

export default function NotificationSidebar({
  unreadCount,
  realNotifications,
  handleNotificationClick,
  handleDeleteNotification
}) {
  return (
    <div className="hidden xl:block w-80 shrink-0 sticky top-24 space-y-6 z-10">
      <div className="bg-gray-800/80 backdrop-blur-md border border-gray-700/50 rounded-3xl p-6 shadow-xl">
        <h3 className="text-white text-lg font-bold mb-5 flex items-center gap-2 border-b border-gray-700/50 pb-4">
          <Bell className="w-5 h-5 text-yellow-400" /> Thông báo mới
          {unreadCount > 0 && <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
        </h3>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          {realNotifications.length > 0 ? (
            realNotifications.map(noti => {
              let icon = <Bell className="w-4 h-4 text-gray-400" />;
              let text = "đã gửi thông báo cho bạn.";
              switch (noti.type) {
                case 'like': icon = <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />; text = "đã thích bài viết của bạn."; break;
                case 'comment': icon = <MessageCircle className="w-4 h-4 text-blue-400" />; text = "đã bình luận về bài viết của bạn."; break;
                case 'share_post': icon = <Share2 className="w-4 h-4 text-emerald-400" />; text = "đã chia sẻ một bài viết với bạn."; break;
                case 'save_plan': icon = <Bookmark className="w-4 h-4 text-yellow-400 fill-yellow-400" />; text = "đã lưu lịch của bạn về kho."; break;
                case 'new_post': icon = <Activity className="w-4 h-4 text-purple-400" />; text = "vừa đăng một bài viết mới."; break;
                case 'follow': icon = <UserPlus className="w-4 h-4 text-blue-500" />; text = "đã bắt đầu theo dõi bạn."; break;
                default: break;
              }

              return (
                <div
                  key={noti._id}
                  onClick={() => handleNotificationClick(noti)}
                  className={`relative flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all shadow-sm group/noti ${!noti.isRead
                      ? 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                      : 'bg-gray-900/60 border-gray-700/40 hover:bg-gray-800'
                    }`}
                >
                  <div className="mt-0.5 bg-gray-800 p-2 rounded-full shrink-0 shadow-inner">{icon}</div>
                  <div className="flex-1 pr-6">
                    <p className={`text-sm leading-snug ${!noti.isRead ? 'text-white' : 'text-gray-300'}`}>
                      <span className="font-bold text-emerald-400">{noti.senderId?.name || "Người dùng ẩn danh"}</span> {text}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1.5 font-medium">{new Date(noti.createdAt).toLocaleString('vi-VN')}</p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteNotification(e, noti._id)}
                    className="absolute top-3 right-3 text-gray-500 hover:text-red-500 bg-gray-800/80 p-1.5 rounded-full opacity-0 group-hover/noti:opacity-100 transition-opacity z-10"
                    title="Xóa thông báo"
                  ><Trash2 className="w-3.5 h-3.5" /></button>
                  {!noti.isRead && <div className="absolute top-1/2 -translate-y-1/2 right-4 w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] group-hover/noti:opacity-0 transition-opacity"></div>}
                </div>
              );
            })
          ) : (
            <div className="text-center py-6">
              <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Chưa có thông báo nào.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}