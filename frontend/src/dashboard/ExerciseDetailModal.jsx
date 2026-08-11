import React from 'react';
import { X, Dumbbell, Video, Info } from 'lucide-react';

export default function ExerciseDetailModal({ exercise, onClose }) {
  if (!exercise) return null;

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    let videoId = '';
    if (url.includes('youtube.com/watch')) {
      videoId = new URL(url).searchParams.get('v');
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-gray-900 w-full max-w-2xl rounded-2xl md:rounded-3xl border border-gray-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 md:p-5 border-b border-gray-800 bg-gray-900/50 shrink-0">
          <h3 className="font-black text-white text-base md:text-xl flex items-center gap-2 truncate">
            <Dumbbell className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="truncate">{exercise.name}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-1.5 md:p-2 rounded-full transition-colors shrink-0 ml-2">
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar">
          <div className="w-full aspect-video bg-black rounded-xl overflow-hidden mb-5 border border-gray-800 flex items-center justify-center relative shadow-inner">
            {exercise.videoUrl ? (
              exercise.videoUrl.includes('youtube') || exercise.videoUrl.includes('youtu.be') ? (
                <iframe className="w-full h-full" src={getYouTubeEmbedUrl(exercise.videoUrl)} frameBorder="0" allowFullScreen title={exercise.name}></iframe>
              ) : (
                <video className="w-full h-full object-contain" controls autoPlay src={exercise.videoUrl.startsWith('http') ? exercise.videoUrl : `${import.meta.env.VITE_API_URL || ""}${exercise.videoUrl}`}></video>
              )
            ) : (
              <div className="text-gray-600 flex flex-col items-center">
                <Video size={36} className="mb-2 opacity-30"/>
                <span className="text-sm font-medium">Chưa có video minh họa</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-gray-800/80 p-3 md:p-4 rounded-xl border border-gray-700">
              <p className="text-gray-400 text-[10px] md:text-xs font-bold uppercase mb-1 tracking-wider">Nhóm cơ</p>
              <p className="text-sm md:text-base text-blue-400 font-bold">{exercise.muscleGroup}</p>
            </div>
            <div className="bg-gray-800/80 p-3 md:p-4 rounded-xl border border-gray-700">
              <p className="text-gray-400 text-[10px] md:text-xs font-bold uppercase mb-1 tracking-wider">Dụng cụ</p>
              <p className="text-sm md:text-base text-purple-400 font-bold">{exercise.equipmentRequired || 'Bodyweight'}</p>
            </div>
          </div>

          <div className="bg-gray-950 p-4 md:p-5 rounded-2xl border border-gray-800">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Info className="w-4 h-4" /> Hướng dẫn chi tiết
            </h4>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{exercise.description || 'Chưa có hướng dẫn chi tiết.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}