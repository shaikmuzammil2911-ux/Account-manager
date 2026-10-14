import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Toast({ message, type = 'info' }) {
  if (!message) return null;

  return (
    <div className="toast-container">
      <div className={`toast ${type}`}>
        {type === 'success' && <CheckCircle2 size={16} />}
        {type === 'error' && <AlertCircle size={16} />}
        {type === 'info' && <Info size={16} />}
        <span>{message}</span>
      </div>
    </div>
  );
}
