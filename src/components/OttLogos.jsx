import React from 'react';

/**
 * High-definition vector icons matching image copy 13.png exactly
 */
export default function OttLogo({ brandId, name = '', size = 56, style = {} }) {
  const normalized = (brandId || name || '').toLowerCase().replace(/[\s\-_+]/g, '');

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: `${Math.round(size * 0.28)}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    userSelect: 'none',
    boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
    flexShrink: 0,
    ...style
  };

  // 1. Netflix
  if (normalized.includes('netflix')) {
    return (
      <div style={{ ...containerStyle, background: '#000000' }}>
        <svg viewBox="0 0 100 100" width="70%" height="70%">
          <path d="M22 15h14v70H22z" fill="#b81d24" />
          <path d="M64 15h14v70H64z" fill="#b81d24" />
          <path d="M22 15h14l42 70H64z" fill="#e50914" />
        </svg>
      </div>
    );
  }

  // 2. Prime Video
  if (normalized.includes('prime') || normalized.includes('amazon')) {
    return (
      <div style={{ ...containerStyle, background: '#000511' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '85%' }}>
          <div style={{ color: '#ffffff', fontWeight: 900, fontSize: `${size * 0.22}px`, letterSpacing: '-0.3px', lineHeight: 1.0, textAlign: 'center' }}>
            prime<br />video
          </div>
          <svg viewBox="0 0 100 24" width="75%" style={{ marginTop: '2px' }}>
            <path d="M8 8 C 35 22, 65 22, 92 8" fill="none" stroke="#00a8e1" strokeWidth="6" strokeLinecap="round" />
            <polygon points="90,3 96,10 88,14" fill="#00a8e1" />
          </svg>
        </div>
      </div>
    );
  }

  // 3. Disney+ Hotstar
  if (normalized.includes('disney') || normalized.includes('hotstar')) {
    return (
      <div style={{ ...containerStyle, background: 'radial-gradient(circle at 50% 30%, #03215c 0%, #020b24 100%)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#ffffff', fontWeight: 900, fontSize: `${size * 0.28}px`, fontFamily: 'sans-serif', letterSpacing: '-0.5px' }}>
            Disney<span style={{ color: '#00b5e2', fontSize: `${size * 0.3}px` }}>+</span>
          </div>
          <div style={{ color: '#ffffff', fontSize: `${size * 0.16}px`, fontWeight: 700, letterSpacing: '0.8px', marginTop: '-2px' }}>
            hotstar
          </div>
        </div>
      </div>
    );
  }

  // 4. ZEE5
  if (normalized.includes('zee')) {
    return (
      <div style={{ ...containerStyle, background: '#000000' }}>
        <div style={{
          width: '75%',
          height: '75%',
          borderRadius: '50%',
          border: '4px solid transparent',
          backgroundImage: 'linear-gradient(#000,#000), conic-gradient(#ff007f, #9b51e0, #00b4d8, #06d6a0, #ffd166, #ff007f)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'content-box, border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ color: '#ffffff', fontWeight: 900, fontSize: `${size * 0.19}px`, letterSpacing: '0.5px' }}>
            ZEE<span style={{ fontSize: `${size * 0.22}px` }}>5</span>
          </div>
        </div>
      </div>
    );
  }

  // 5. Voot
  if (normalized.includes('voot')) {
    return (
      <div style={{ ...containerStyle, background: '#6200ea' }}>
        <span style={{ color: '#ffffff', fontWeight: 900, fontSize: `${size * 0.38}px`, letterSpacing: '-0.5px' }}>
          voot
        </span>
      </div>
    );
  }

  // 6. Sony LIV
  if (normalized.includes('sonyliv') || (normalized.includes('sony') && normalized.includes('liv'))) {
    return (
      <div style={{ ...containerStyle, background: '#000000' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#ffffff', fontSize: `${size * 0.16}px`, fontWeight: 900, letterSpacing: '2px' }}>
            SONY
          </span>
          <span style={{
            fontSize: `${size * 0.4}px`,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-1px',
            lineHeight: 1
          }}>
            liv
          </span>
        </div>
      </div>
    );
  }

  // 7. JioCinema
  if (normalized.includes('jiocinema') || normalized.includes('jio')) {
    return (
      <div style={{ ...containerStyle, background: 'linear-gradient(135deg, #c026d3 0%, #e11d48 50%, #f97316 100%)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 24 24" width="40%" height="40%" fill="#ffffff">
            <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v12h16V6H4zm3 2l8 4-8 4V8z" />
          </svg>
          <span style={{ color: '#ffffff', fontWeight: 800, fontSize: `${size * 0.16}px`, marginTop: '2px' }}>
            JioCinema
          </span>
        </div>
      </div>
    );
  }

  // 8. ALTBalaji
  if (normalized.includes('altbalaji') || normalized.includes('alt')) {
    return (
      <div style={{ ...containerStyle, background: '#000000' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <polygon style={{ fill: '#ef4444' }} />
            <svg viewBox="0 0 24 24" width={`${size * 0.4}px`} height={`${size * 0.4}px`}>
              <path d="M3 4l18 8-18 8z" fill="#f97316" />
              <path d="M3 4l9 8-9 8z" fill="#ef4444" />
            </svg>
            <span style={{ color: '#ffffff', fontWeight: 900, fontSize: `${size * 0.28}px`, marginLeft: '2px' }}>
              ALT
            </span>
          </div>
          <span style={{ color: '#ffffff', fontSize: `${size * 0.13}px`, fontWeight: 800, letterSpacing: '1px' }}>
            BALAJI
          </span>
        </div>
      </div>
    );
  }

  // 9. Airtel Xstream
  if (normalized.includes('airtel') || normalized.includes('xstream')) {
    return (
      <div style={{ ...containerStyle, background: '#ffffff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#dc2626', fontWeight: 800, fontSize: `${size * 0.17}px` }}>
            airtel
          </span>
          <span style={{ color: '#0f172a', fontWeight: 900, fontSize: `${size * 0.24}px`, letterSpacing: '-0.3px', marginTop: '-2px' }}>
            <span style={{ color: '#dc2626' }}>X</span>stream
          </span>
        </div>
      </div>
    );
  }

  // 10. Hungama Play / Legend Cinema
  if (normalized.includes('hungama') || normalized.includes('legend')) {
    return (
      <div style={{ ...containerStyle, background: '#111111' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 32 32" width={`${size * 0.42}px`} height={`${size * 0.42}px`}>
            <polygon points="16,2 30,28 2,28" fill="none" stroke="#d97706" strokeWidth="2.5" />
            <polygon points="16,8 26,26 6,26" fill="#f59e0b" opacity="0.8" />
            <polygon points="16,14 22,25 10,25" fill="#fef08a" />
          </svg>
          <span style={{ color: '#f59e0b', fontWeight: 900, fontSize: `${size * 0.13}px`, letterSpacing: '0.8px', marginTop: '2px' }}>
            LEGEND
          </span>
          <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: `${size * 0.11}px` }}>
            CINEMA
          </span>
        </div>
      </div>
    );
  }

  // 11. EPIC ON
  if (normalized.includes('epic')) {
    return (
      <div style={{ ...containerStyle, background: '#0a192f' }}>
        <div style={{
          border: '1.5px solid #f97316',
          borderRadius: '6px',
          padding: '2px 6px',
          background: 'rgba(249, 115, 22, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '3px'
        }}>
          <span style={{ color: '#ffffff', fontWeight: 900, fontSize: `${size * 0.22}px`, letterSpacing: '0.5px' }}>
            EPIC
          </span>
          <span style={{ color: '#f97316', fontWeight: 900, fontSize: `${size * 0.22}px` }}>
            ON
          </span>
        </div>
      </div>
    );
  }

  // 12. ShemarooMe
  if (normalized.includes('shemaroo')) {
    return (
      <div style={{ ...containerStyle, background: '#ffffff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{
            fontSize: `${size * 0.23}px`,
            fontWeight: 900,
            background: 'linear-gradient(90deg, #ec4899, #f97316, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.3px'
          }}>
            shemaroo
          </span>
        </div>
      </div>
    );
  }

  // 13. Sun NXT
  if (normalized.includes('sunnxt') || (normalized.includes('sun') && normalized.includes('nxt'))) {
    return (
      <div style={{ ...containerStyle, background: 'linear-gradient(135deg, #b91c1c 0%, #4c0519 60%, #1e1b4b 100%)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#ffffff', fontWeight: 900, fontSize: `${size * 0.2}px`, letterSpacing: '1px' }}>
            SUN
          </span>
          <span style={{ color: '#facc15', fontWeight: 900, fontSize: `${size * 0.32}px`, letterSpacing: '0.5px', marginTop: '-4px' }}>
            NXT
          </span>
        </div>
      </div>
    );
  }

  // 14. Hoichoi
  if (normalized.includes('hoichoi')) {
    return (
      <div style={{ ...containerStyle, background: '#0a0a0a' }}>
        <span style={{ color: '#e11d48', fontWeight: 900, fontSize: `${size * 0.26}px`, letterSpacing: '-0.3px' }}>
          ho!cho!
        </span>
      </div>
    );
  }

  // 15. Chaupal
  if (normalized.includes('chaupal')) {
    return (
      <div style={{ ...containerStyle, background: '#1e1b4b' }}>
        <span style={{ color: '#facc15', fontWeight: 900, fontSize: `${size * 0.25}px`, letterSpacing: '1px' }}>
          CHAUPAL
        </span>
      </div>
    );
  }

  // 16. Apple TV+
  if (normalized.includes('apple')) {
    return (
      <div style={{ ...containerStyle, background: '#000000' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <svg viewBox="0 0 170 170" width={`${size * 0.35}px`} height={`${size * 0.35}px`} fill="#ffffff">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.58-7.85-11.68-14.3-5.36-8.49-9.59-18.06-12.7-28.71-3.11-10.65-4.67-20.9-4.67-30.75 0-14.3 3.6-26.25 10.8-35.85 7.21-9.6 16.29-14.54 27.24-14.81 4.7 0 9.87 1.25 15.52 3.75 5.65 2.5 9.77 3.81 12.36 3.93 2.12-.12 6.47-1.49 13.06-4.11 6.59-2.62 12.18-3.74 16.77-3.37 12.43.62 22.48 5.48 30.15 14.59-10.78 6.53-16.05 15.6-15.82 27.2.23 9.17 3.76 16.89 10.6 23.16 6.84 6.28 15.01 9.85 24.51 10.72-2.3 6.94-5.25 14.07-8.84 21.41zM119.22 33.56c0-7.39 2.68-14.18 8.04-20.37 5.36-6.19 11.95-9.87 19.78-11.04.12 1.12.18 2.12.18 3 0 7.39-2.79 14.45-8.38 21.18-5.59 6.73-12.44 10.45-20.55 11.16-.25-1.37-.37-2.68-.37-3.93z" />
          </svg>
          <span style={{ color: '#ffffff', fontWeight: 900, fontSize: `${size * 0.28}px`, letterSpacing: '-0.5px' }}>
            tv+
          </span>
        </div>
      </div>
    );
  }

  // 17. Discovery+
  if (normalized.includes('discovery')) {
    return (
      <div style={{ ...containerStyle, background: '#020b24' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: `${size * 0.38}px`,
            height: `${size * 0.38}px`,
            borderRadius: '50%',
            background: 'conic-gradient(#ff007f, #f59e0b, #10b981, #06b6d4, #8b5cf6, #ff007f)',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#020b24' }} />
          </div>
          <span style={{ color: '#ffffff', fontSize: `${size * 0.14}px`, fontWeight: 800, marginTop: '2px' }}>
            discovery<span style={{ color: '#06b6d4' }}>+</span>
          </span>
        </div>
      </div>
    );
  }

  // 18. Hulu
  if (normalized.includes('hulu')) {
    return (
      <div style={{ ...containerStyle, background: '#000000' }}>
        <span style={{ color: '#1ce783', fontWeight: 900, fontSize: `${size * 0.38}px`, letterSpacing: '-1px' }}>
          hulu
        </span>
      </div>
    );
  }

  // Fallback / Other Brands (Spotify, YouTube, Aha, etc.)
  return (
    <div style={{ ...containerStyle, background: '#0f172a' }}>
      <span style={{ color: '#ffffff', fontWeight: 900, fontSize: `${size * 0.32}px` }}>
        {(name || brandId || 'O').slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}
