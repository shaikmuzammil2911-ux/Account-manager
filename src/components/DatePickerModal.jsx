import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Check } from 'lucide-react';
import { formatDate, parseDate, FULL_MONTH_NAMES } from '../utils/dateUtils';

export default function DatePickerModal({
  isOpen,
  initialDate,
  initialStartDate,
  initialEndDate,
  onSelectDate,
  onSelectRange,
  onClearDate,
  onClose
}) {
  if (!isOpen) return null;

  const [mode, setMode] = useState(initialStartDate && initialEndDate ? 'range' : 'single');
  const baseDate = parseDate(initialDate || new Date());

  const [currentMonth, setCurrentMonth] = useState(baseDate.getMonth());
  const [currentYear, setCurrentYear] = useState(baseDate.getFullYear());

  const [singleDate, setSingleDate] = useState(initialDate || formatDate(new Date()));
  const [rangeStart, setRangeStart] = useState(initialStartDate || null);
  const [rangeEnd, setRangeEnd] = useState(initialEndDate || null);

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

  const handleDayClick = (dayNum) => {
    const clickedDate = new Date(currentYear, currentMonth, dayNum);
    const clickedStr = formatDate(clickedDate);

    if (mode === 'single') {
      setSingleDate(clickedStr);
    } else {
      // Range selection logic
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(clickedStr);
        setRangeEnd(null);
      } else {
        const startT = parseDate(rangeStart).getTime();
        const clickedT = clickedDate.getTime();
        if (clickedT < startT) {
          setRangeStart(clickedStr);
          setRangeEnd(rangeStart);
        } else {
          setRangeEnd(clickedStr);
        }
      }
    }
  };

  const handleApply = () => {
    if (mode === 'single') {
      if (onSelectDate) onSelectDate(singleDate);
    } else {
      if (rangeStart && rangeEnd && onSelectRange) {
        onSelectRange(rangeStart, rangeEnd);
      } else if (rangeStart && onSelectDate) {
        onSelectDate(rangeStart);
      }
    }
    onClose();
  };

  const handleResetToday = () => {
    const todayStr = formatDate(new Date());
    if (onSelectDate) onSelectDate(todayStr);
    onClose();
  };

  const today = new Date();
  const isCurrentMonthToday = today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '360px', width: '92%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarIcon size={18} color="#2563eb" />
            <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              {mode === 'single' ? 'Select Date' : 'Select Date Range'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px', background: '#f1f5f9', padding: '3px', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => setMode('single')}
            style={{
              padding: '6px',
              fontSize: '12.5px',
              fontWeight: 800,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: mode === 'single' ? '#ffffff' : 'transparent',
              color: mode === 'single' ? '#2563eb' : '#64748b',
              boxShadow: mode === 'single' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Single Date
          </button>
          <button
            type="button"
            onClick={() => setMode('range')}
            style={{
              padding: '6px',
              fontSize: '12.5px',
              fontWeight: 800,
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: mode === 'range' ? '#ffffff' : 'transparent',
              color: mode === 'range' ? '#2563eb' : '#64748b',
              boxShadow: mode === 'range' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Date Range
          </button>
        </div>

        {/* Selected Display Banner */}
        <div style={{ background: '#eff6ff', padding: '8px 12px', borderRadius: '8px', marginBottom: '10px', fontSize: '12.5px', color: '#1e40af', fontWeight: 800, textAlign: 'center' }}>
          {mode === 'single' ? (
            <span>Selected: <strong>{singleDate}</strong></span>
          ) : (
            <span>
              {rangeStart ? rangeStart : 'Start Date'} → {rangeEnd ? rangeEnd : 'End Date'}
            </span>
          )}
        </div>

        {/* Month Year Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{ border: 'none', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}
          >
            <ChevronLeft size={16} />
          </button>

          <span style={{ fontWeight: 800, fontSize: '14.5px', color: '#1e293b' }}>
            {FULL_MONTH_NAMES[currentMonth]} {currentYear}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            style={{ border: 'none', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid" style={{ marginTop: '8px' }}>
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
            const thisDate = new Date(currentYear, currentMonth, dayNum);
            const thisStr = formatDate(thisDate);

            let isSelected = false;
            let isInRange = false;

            if (mode === 'single') {
              isSelected = singleDate === thisStr;
            } else {
              if (rangeStart === thisStr || rangeEnd === thisStr) isSelected = true;
              if (rangeStart && rangeEnd) {
                const curT = thisDate.getTime();
                const sT = parseDate(rangeStart).getTime();
                const eT = parseDate(rangeEnd).getTime();
                if (curT > sT && curT < eT) isInRange = true;
              }
            }

            const isToday = isCurrentMonthToday && today.getDate() === dayNum;

            return (
              <button
                key={`day-${dayNum}`}
                type="button"
                className={`calendar-date-cell ${isSelected ? 'selected' : ''} ${isInRange ? 'in-range' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => handleDayClick(dayNum)}
                style={{
                  background: isSelected ? '#2563eb' : (isInRange ? '#dbeafe' : 'transparent'),
                  color: isSelected ? '#ffffff' : (isInRange ? '#1e40af' : '#1e293b'),
                  fontWeight: isSelected || isToday ? 900 : 600,
                  borderRadius: isSelected ? '8px' : (isInRange ? '0' : '6px')
                }}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="glossy-btn glossy-btn-gray"
            style={{ flex: 1, padding: '9px 6px', fontSize: '12.5px', fontWeight: 800 }}
            onClick={handleResetToday}
          >
            Today
          </button>
          {onClearDate && (
            <button
              type="button"
              className="glossy-btn"
              style={{ flex: 1, padding: '9px 6px', fontSize: '12.5px', fontWeight: 800, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca' }}
              onClick={() => {
                onClearDate();
                onClose();
              }}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            className="glossy-btn glossy-btn-blue"
            style={{ flex: 1.2, padding: '9px 6px', fontSize: '12.5px', fontWeight: 900 }}
            onClick={handleApply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
