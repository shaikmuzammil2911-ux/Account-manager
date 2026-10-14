import React from 'react';
import { Home, Calendar } from 'lucide-react';

export default function BottomNav({ activeTab, onSelectTab }) {
  return (
    <nav className="bottom-nav">
      <button
        type="button"
        className={`nav-tab home-tab ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onSelectTab('home')}
        id="nav-home-tab"
      >
        <Home size={20} />
        <span>Home</span>
      </button>

      <button
        type="button"
        className={`nav-tab expiry-tab ${activeTab === 'expiry' ? 'active' : ''}`}
        onClick={() => onSelectTab('expiry')}
        id="nav-expiry-tab"
      >
        <Calendar size={20} />
        <span>Expiry</span>
      </button>
    </nav>
  );
}
