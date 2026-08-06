// components/ExerciseProgressTracker.jsx
import React, { useState, useEffect } from 'react';
import api from './services/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Dumbbell, TrendingUp, Award, Flame, Loader2 } from 'lucide-react';

export default function ExerciseProgressTracker() {
  const [exercisesList, setExercisesList] = useState([]);
  const [selectedExId, setSelectedExId] = useState('');
  const [progressData, setProgressData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Lấy danh sách bài tập để chọn Select Option
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const res = await api.get('/exercises'); // Giả định route lấy tất cả bài tập
        const list = res.data.data || res.data || [];
        setExercisesList(list);
        if (list.length > 0) setSelectedExId(list[0]._id);
      } catch (err) {
        console.error("Lỗi lấy danh sách bài tập:", err);
      }
    };
    fetchExercises();
  }, []);

  // Lấy dữ liệu tăng trưởng của bài tập đã chọn
  useEffect(() => {
    if (!selectedExId) return;

    const fetchProgress = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/workout-logs/exercise-progress/${selectedExId}`);
        setProgressData(res.data);
      } catch (err) {
        console.error("Lỗi lấy tiến độ bài tập:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [selectedExId]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg space-y-6">
      
      {/* HEADER & BỘ CHỌN BÀI TẬP */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-800">
        <div>
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-emerald-400" /> Tiến Độ Tăng Trưởng Mức Tạ
          </h3>
          <p className="text-xs text-gray-400 mt-1">Theo dõi sức mạnh tăng tiến (Progressive Overload) qua thời gian.</p>
        </div>

        {/* Dropdown Chọn Bài Tập */}
        <div className="w-full sm:w-64">
          <select
            value={selectedExId}
            onChange={(e) => setSelectedExId(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-emerald-400 font-bold text-sm focus:outline-none focus:border-emerald-500"
          >
            {exercisesList.map((ex) => (
              <option key={ex._id} value={ex._id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : progressData && progressData.timeline && progressData.timeline.length > 0 ? (
        <div>
          {/* CARDS THỐNG KÊ TỔNG QUAN */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Mức tạ cao nhất</span>
              <div className="text-xl font-black text-white flex items-baseline gap-1">
                {progressData.summary.allTimeHighestWeight} <span className="text-xs text-emerald-400 font-bold">kg</span>
              </div>
            </div>

            <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tăng thêm</span>
              <div className="text-xl font-black text-emerald-400 flex items-baseline gap-1">
                +{progressData.summary.weightGained} <span className="text-xs font-bold">kg</span>
              </div>
            </div>

            <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tỷ lệ tăng trưởng</span>
              <div className="text-xl font-black text-purple-400 flex items-baseline gap-1">
                +{progressData.summary.growthPercentage}%
              </div>
            </div>

            <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800">
              <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Số buổi đã ghi</span>
              <div className="text-xl font-black text-yellow-400">
                {progressData.summary.totalSessionsLogged} <span className="text-xs text-gray-400 font-medium">buổi</span>
              </div>
            </div>
          </div>

          {/* BIỂU ĐỒ TĂNG TIẾN MỨC TẠ & 1RM */}
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} domain={['dataMin - 5', 'dataMax + 10']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#374151', borderRadius: '12px', color: '#fff' }}
                  formatter={(val, name) => [
                    `${val} kg`,
                    name === 'maxWeight' ? 'Mức tạ Max' : 'Sức mạnh 1RM Ước tính',
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  name="Mức tạ Max (kg)"
                  dataKey="maxWeight"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4 }}
                />
                <Line
                  type="monotone"
                  name="1RM Ước tính (kg)"
                  dataKey="estimatedOneRepMax"
                  stroke="#6366f1"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-xl text-gray-500 text-sm">
          <Dumbbell className="w-10 h-10 mb-2 opacity-20 text-emerald-400" />
          Chưa có dữ liệu tăng trưởng mức tạ cho bài tập này.
        </div>
      )}
    </div>
  );
}