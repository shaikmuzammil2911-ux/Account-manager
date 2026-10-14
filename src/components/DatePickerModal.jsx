import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatDate, parseDate, FULL_MONTH_NAMES } from '../utils/dateUtils';

export default function DatePickerModal({ isOpen, initialDate, onSelect, onClose }) {
  if (!isOpen) return null;

  const activeDate = parseDate(initialDate);
  const [currentMonth, setCurrentMonth] = useState(activeDate.getMonth());
  const [currentYear, setCurrentYear] = useState(activeDate.getFullYear());
  const [selectedDay, setSelectedDay] = useState(activeDate.getDate());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleDateClick = (day) => {
    setSelectedDay(day);
    const chosen = new Date(currentYear, currentMonth, day);
    onSelect(formatDate(chosen));
    onClose();
  };

  const today = new Date();
  const isCurrentMonthToday = today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Select Date</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Month Year Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{ border: 'none', background: '#f8fafc', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
          >
            <ChevronLeft size={16} />
          </button>

          <span style={{ fontWeight: 800, fontSize: '15px', color: '#1e293b' }}>
            {FULL_MONTH_NAMES[currentMonth]} {currentYear}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            style={{ border: 'none', background: '#f8fafc', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}

          {/* Blank cells for offset */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="calendar-date-cell empty" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isSelected = selectedDay === dayNum &&
              activeDate.getMonth() === currentMonth &&
              activeDate.getFullYear() === currentYear;
            const isToday = isCurrentMonthToday && today.getDate() === dayNum;

            return (
              <button
                key={`day-${dayNum}`}
                type="button"
                className={`calendar-date-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => handleDateClick(dayNum)}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          <button
            type="button"
            className="glossy-btn glossy-btn-gray"
            style={{ flex: 1, padding: '8px', fontSize: '13px' }}
            onClick={() => handleDateClick(today.getDate())}
          >
            Today
          </button>
          <button
            type="button"
            className="glossy-btn glossy-btn-blue"
            style={{ flex: 1, padding: '8px', fontSize: '13px' }}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
