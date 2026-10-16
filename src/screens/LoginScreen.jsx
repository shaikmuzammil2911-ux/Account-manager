import React, { useState } from 'react';
import { Mail, Lock, KeyRound, Eye, EyeOff, ArrowRight, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';
import { api } from '../api/client';

export default function LoginScreen({ onLoginSuccess, showToast }) {
  const [mode, setMode] = useState('login'); // 'login' | 'forgot_email' | 'forgot_otp' | 'success'

  // Login form state
  const [email, setEmail] = useState('Fixyourmobiles10@gmail.com');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password form state
  const [resetEmail, setResetEmail] = useState('Fixyourmobiles10@gmail.com');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showToast('Please enter both Email and Password', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.login(email.trim(), password);
      showToast(`Welcome back, ${res.user?.name || 'Admin'}!`, 'success');
      onLoginSuccess(res.user);
    } catch (err) {
      showToast(err.message || 'Invalid credentials. Try again or reset password.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.forgotPassword(resetEmail.trim());
      if (res.devOtp) {
        setDevOtpHint(res.devOtp);
      }
      showToast(res.message || 'OTP sent to your email!', 'success');
      setMode('forgot_otp');
    } catch (err) {
      showToast(err.message || 'Failed to send OTP email', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      showToast('Please enter the 6-digit OTP', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    try {
      setIsLoading(true);
      await api.resetPassword(resetEmail.trim(), newPassword, otp.trim());
      showToast('Password reset successfully!', 'success');
      setEmail(resetEmail.trim());
      setPassword(newPassword);
      setMode('success');
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'linear-gradient(135deg, #090d16 0%, #0f172a 100%)'
    }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)'
        }}>
          <ShieldCheck size={32} color="#ffffff" />
        </div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 900,
          color: '#ffffff',
          margin: '0 0 6px',
          letterSpacing: '-0.3px'
        }}>
          OTT SELLERS
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#94a3b8',
          margin: 0,
          fontWeight: 600
        }}>
          Management System &bull; Secure Portal
        </p>
      </div>

      {/* Main Glassmorphic Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '28px 22px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                Sign In
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                Enter your credentials to manage OTT accounts
              </p>
            </div>

            {/* Email Field */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Email / Mail ID
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setMode('forgot_email');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#2563eb',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Forgot Password?
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 40px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="glossy-btn glossy-btn-blue"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: 800,
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>{isLoading ? 'Signing In...' : 'Login'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {mode === 'forgot_email' && (
          <form onSubmit={handleSendOtp}>
            <button
              type="button"
              onClick={() => setMode('login')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: '16px',
                padding: 0
              }}
            >
              <ArrowLeft size={16} /> Back to Login
            </button>

            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                Reset Password
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                Enter your email. An OTP code will be sent via SMTP using Fixyourmobiles10@gmail.com.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Your Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Fixyourmobiles10@gmail.com"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="glossy-btn glossy-btn-orange"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: 800,
                borderRadius: '14px'
              }}
            >
              {isLoading ? 'Sending OTP...' : 'Send OTP via Email'}
            </button>
          </form>
        )}

        {mode === 'forgot_otp' && (
          <form onSubmit={handleResetPassword}>
            <button
              type="button"
              onClick={() => setMode('forgot_email')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: '16px',
                padding: 0
              }}
            >
              <ArrowLeft size={16} /> Back
            </button>

            <div style={{ marginBottom: '18px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                Enter OTP & New Password
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                We sent a 6-digit verification code to <strong>{resetEmail}</strong>
              </p>
              {devOtpHint && (
                <div style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  background: '#eff6ff',
                  border: '1px dashed #3b82f6',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#1d4ed8',
                  fontWeight: 700
                }}>
                  Verification OTP Code: <span style={{ fontSize: '16px', letterSpacing: '2px' }}>{devOtpHint}</span>
                </div>
              )}
            </div>

            {/* OTP Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                6-Digit OTP Code
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                  <KeyRound size={18} />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '20px',
                    letterSpacing: '4px',
                    fontWeight: 800,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* New Password */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                  <Lock size={18} />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 40px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                  <Lock size={18} />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="glossy-btn glossy-btn-green"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: 800,
                borderRadius: '14px'
              }}
            >
              {isLoading ? 'Resetting...' : 'Set New Password'}
            </button>
          </form>
        )}

        {mode === 'success' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={40} />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Password Reset Successful!
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
              Your password has been updated. You can now login using your email and new password.
            </p>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="glossy-btn glossy-btn-blue"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: 800,
                borderRadius: '14px'
              }}
            >
              Login Now
            </button>
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '24px', color: '#64748b', fontSize: '13px' }}>
        Fixyourmobiles10@gmail.com &bull; Accounts Manager
      </div>
    </div>
  );
}
