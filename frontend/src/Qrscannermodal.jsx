// 📄 src/components/QRScannerModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, ScanLine, AlertTriangle, Loader2 } from 'lucide-react';

const SCANNER_ELEMENT_ID = "qr-scanner-region";

/**
 * Modal quét mã QR bằng camera thiết bị.
 * Khi quét thành công và payload hợp lệ (type === "USER_PROFILE"),
 * gọi onScanSuccess(userId) rồi tự đóng modal.
 *
 * Props:
 * - onClose: () => void
 * - onScanSuccess: (userId: string, payload: object) => void
 */
export default function QRScannerModal({ onClose, onScanSuccess }) {
  const scannerRef = useRef(null);
  const hasHandledRef = useRef(false); // chặn xử lý trùng nhiều lần khi camera bắt liên tục
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const html5QrCode = new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = html5QrCode;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    const handleDecodedText = (decodedText) => {
      if (hasHandledRef.current) return; // đã xử lý 1 lần rồi thì bỏ qua các frame sau

      let payload;
      try {
        payload = JSON.parse(decodedText);
      } catch (e) {
        setError("Mã QR không hợp lệ hoặc không phải mã của hệ thống AI Fitness.");
        return;
      }

      if (payload?.type !== "USER_PROFILE" || !payload?.userId) {
        setError("Đây không phải là mã QR hồ sơ người dùng hợp lệ.");
        return;
      }

      hasHandledRef.current = true;
      setError(null);

      // Dừng camera trước khi điều hướng để tránh giữ quyền camera không cần thiết
      html5QrCode.stop().catch(() => {}).finally(() => {
        if (isMounted) onScanSuccess(payload.userId, payload);
      });
    };

    const handleDecodeFailure = () => {
      // Gọi liên tục mỗi frame không đọc được QR — không cần làm gì, đây là hành vi bình thường
    };

    html5QrCode
      .start({ facingMode: "environment" }, config, handleDecodedText, handleDecodeFailure)
      .then(() => {
        if (isMounted) setIsStarting(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsStarting(false);
        setError(
          "Không thể truy cập camera. Vui lòng cấp quyền camera cho trình duyệt và thử lại."
        );
        console.error("Lỗi khởi động camera QR:", err);
      });

    return () => {
      isMounted = false;
      // Dọn dẹp camera khi unmount, tránh rò rỉ và giữ đèn camera sáng
      if (html5QrCode.isScanning) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {});
      } else {
        html5QrCode.clear().catch(() => {});
      }
    };
  }, [onScanSuccess]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-blue-400" /> Quét mã QR
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-black min-h-[280px] flex items-center justify-center">
          {isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-10">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
              <p className="text-xs text-gray-400">Đang khởi động camera...</p>
            </div>
          )}
          {/* html5-qrcode tự render <video> vào đây */}
          <div id={SCANNER_ELEMENT_ID} className="w-full" />
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/30 text-red-400 border border-red-800/50 rounded-xl text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <p className="text-xs text-gray-500 mt-4 text-center leading-relaxed">
          Đưa mã QR hồ sơ của bạn bè vào giữa khung hình để quét.
        </p>
      </div>
    </div>
  );
}