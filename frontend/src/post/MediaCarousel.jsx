import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const MediaCarousel = ({ images = [], video = null, onMediaClick, enlargeOnClick = false }) => {
  const mediaList = [ ...(images || []).map(img => ({ type: 'image', url: img })), ...(video ? [{ type: 'video', url: video }] : []) ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false); 

  if (mediaList.length === 0) return null;
  const nextMedia = (e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % mediaList.length); };
  const prevMedia = (e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev === 0 ? mediaList.length - 1 : prev - 1)); };

  const handleWrapperClick = (e) => {
    e.stopPropagation();
    if (enlargeOnClick && mediaList[currentIndex].type === 'image') {
      setIsFullScreen(true);
    } else if (onMediaClick) {
      onMediaClick(e);
    }
  };

  return (
    <>
      <div className={`relative w-full aspect-square md:aspect-[4/5] bg-black rounded-xl overflow-hidden mb-4 group border border-gray-700/50 ${enlargeOnClick && mediaList[currentIndex].type === 'image' ? 'cursor-zoom-in' : 'cursor-pointer'}`} onClick={handleWrapperClick}>
        {mediaList[currentIndex].type === 'image' ? (
          <img src={mediaList[currentIndex].url} alt="media" className="w-full h-full object-cover group-hover:opacity-90 transition-opacity duration-300" />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-black group-hover:opacity-90 transition-opacity duration-300">
            <video src={mediaList[currentIndex].url} controls className="w-full h-full object-contain pointer-events-auto" />
          </div>
        )}
        {mediaList.length > 1 && (
          <>
            {currentIndex > 0 && <button onClick={prevMedia} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full z-10 hover:bg-black/70"><ChevronLeft className="w-5 h-5" /></button>}
            {currentIndex < mediaList.length - 1 && <button onClick={nextMedia} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full z-10 hover:bg-black/70"><ChevronRight className="w-5 h-5" /></button>}
            <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full z-10">{currentIndex + 1}/{mediaList.length}</div>
          </>
        )}
      </div>

      {isFullScreen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); setIsFullScreen(false); }}>
          <button className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 p-3 rounded-full transition-colors z-[101]">
            <X className="w-6 h-6" />
          </button>
          <img 
            src={mediaList[currentIndex].url} 
            alt="fullscreen" 
            className="max-w-full max-h-screen object-contain cursor-zoom-out" 
            onClick={(e) => { e.stopPropagation(); setIsFullScreen(false); }} 
          />
        </div>
      )}
    </>
  );
};

export default MediaCarousel;