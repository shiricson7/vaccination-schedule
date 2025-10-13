'use client';

import React, { useState } from 'react';
import { Calendar, Plus, Trash2, Printer } from 'lucide-react';

export default function VaccinationScheduleApp() {
  const [schedules, setSchedules] = useState<{date: string; vaccines: string[]}[]>([]);
  const [currentDate, setCurrentDate] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const vaccineOptions = [
    'BCG(피내용)',
    'B형간염',
    'DTaP(디프테리아/파상풍/백일해)',
    'IPV(폴리오)',
    'PCV(폐렴구균)',
    'MMR(홍역/유행성이하선염/풍진)',
    '수두',
    '일본뇌염(사백신)',
    '일본뇌염(생백신)',
    'A형간염',
    'Hib(b형헤모필루스인플루엔자)',
    'Td(파상풍/디프테리아)',
    'Tdap(파상풍/디프테리아/백일해)',
    'HPV(인유두종바이러스)',
    '인플루엔자'
  ];

  const addSchedule = () => {
    if (!currentDate) {
      alert('날짜를 선택해주세요.');
      return;
    }
    
    const existingSchedule = schedules.find(s => s.date === currentDate);
    if (existingSchedule) {
      alert('이미 추가된 날짜입니다.');
      return;
    }

    setSchedules([...schedules, { date: currentDate, vaccines: [] }]);
    setCurrentDate('');
  };

  const removeSchedule = (date: string) => {
    setSchedules(schedules.filter(s => s.date !== date));
  };

  const toggleVaccine = (date: string, vaccine: string) => {
    setSchedules(schedules.map(schedule => {
      if (schedule.date === date) {
        const vaccines = schedule.vaccines.includes(vaccine)
          ? schedule.vaccines.filter(v => v !== vaccine)
          : [...schedule.vaccines, vaccine];
        return { ...schedule, vaccines };
      }
      return schedule;
    }));
  };

  const handlePrint = () => {
    setShowPrintPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const sortedSchedules = [...schedules].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (showPrintPreview) {
    return (
      <div className="print-only">
        <style>{`
          @media print {
            @page {
              size: 800mm 800mm;
              margin: 20mm;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
        `}</style>
        <div style={{ 
          width: '760mm', 
          height: '760mm', 
          padding: '40mm',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: 'white'
        }}>
          <h1 style={{ 
            textAlign: 'center', 
            fontSize: '48pt', 
            marginBottom: '60px',
            borderBottom: '4px solid #333',
            paddingBottom: '30px'
          }}>
            신익순 소아과 예방접종 안내
          </h1>
          
          {sortedSchedules.map((schedule, idx) => (
            schedule.vaccines.length > 0 && (
              <div key={idx} style={{ marginBottom: '50px' }}>
                <h2 style={{ 
                  fontSize: '36pt', 
                  marginBottom: '20px',
                  color: '#2563eb'
                }}>
                  {schedule.date} 이후 예방접종
                </h2>
                <ul style={{ 
                  fontSize: '30pt', 
                  lineHeight: '2',
                  marginLeft: '40px'
                }}>
                  {schedule.vaccines.map((vaccine, vIdx) => (
                    <li key={vIdx}>{vaccine}</li>
                  ))}
                </ul>
              </div>
            )
          ))}
          
          <button 
            onClick={() => setShowPrintPreview(false)}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              padding: '15px 30px',
              fontSize: '18pt',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
            className="no-print"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-600">
          예방접종 스케줄 관리
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            날짜 추가
          </h2>
          <div className="flex gap-3">
            <input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addSchedule}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              추가
            </button>
          </div>
        </div>

        {sortedSchedules.map((schedule, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-md p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {schedule.date}
              </h3>
              <button
                onClick={() => removeSchedule(schedule.date)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {vaccineOptions.map((vaccine, vIdx) => (
                <button
                  key={vIdx}
                  onClick={() => toggleVaccine(schedule.date, vaccine)}
                  className={`p-3 rounded-lg border-2 transition-all text-sm ${
                    schedule.vaccines.includes(vaccine)
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {vaccine}
                </button>
              ))}
            </div>
            
            {schedule.vaccines.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">선택된 예방접종:</p>
                <div className="flex flex-wrap gap-2">
                  {schedule.vaccines.map((vaccine, vIdx) => (
                    <span
                      key={vIdx}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {vaccine}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {schedules.length > 0 && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handlePrint}
              className="px-8 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 text-lg font-semibold shadow-lg"
            >
              <Printer className="w-6 h-6" />
              출력하기 (80x80cm)
            </button>
          </div>
        )}

        {schedules.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            날짜를 추가하여 예방접종 스케줄을 만들어보세요.
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}