import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, UserPlus, Users, Sliders, ArrowLeft, Search, Check,
  AlertCircle, KeyRound, Edit2, Lock, Smartphone, Mail, User,
  Sparkles, RefreshCw, Upload, Eye, EyeOff, CheckCircle2, ChevronRight,
  Palette, Globe, Layers, Power, Save, Trash2
} from 'lucide-react';
import { api } from '../api/client';
import { AVAILABLE_FEATURES } from '../utils/featurePermissions';

export default function AdminPanelScreen({
  currentUser,
  onBack,
  showToast,
  onBrandingUpdated,
  brands = [],
  onOpenBrandManager
}) {
  // Main Module navigation: 'create-user' | 'users-list' | 'feature-controls'
  const [activeModule, setActiveModule] = useState('users-list');

  // Sub-tab for Module 3: 'permissions' | 'branding' | 'catalogue'
  const [module3SubTab, setModule3SubTab] = useState('permissions');

  // Data states
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected user for Feature Controls
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userPermissions, setUserPermissions] = useState({});
  const [isLoadingPerms, setIsLoadingPerms] = useState(false);
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  // Module 1: Create User Form state
  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    mobileNumber: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Module 2: Edit User & Reset Password Modal states
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ fullName: '', mobileNumber: '', accountStatus: 'active' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showAdminResetPassword, setShowAdminResetPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Module 3: Branding & Site Settings state
  const [siteSettings, setSiteSettings] = useState({
    businessName: 'OTT SELLERS',
    subtitle: 'Management System',
    logoUrl: '',
    primaryColor: '#2563eb',
    accentColor: '#0284c7',
    headerBg: '#0f172a',
    headingsText: 'Multi-Brand OTT Subscriptions'
  });
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Load initial data
  useEffect(() => {
    loadUsers();
    loadSiteSettings();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const userList = await api.getUsers();
      setUsers(userList || []);
      if (userList && userList.length > 0 && !selectedUserId) {
        // Select first non-admin user or first user
        const target = userList.find(u => u.role !== 'admin') || userList[0];
        setSelectedUserId(target.id);
        loadPermissionsForUser(target.id);
      }
    } catch (err) {
      showToast('Failed to load users: ' + err.message, 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const loadSiteSettings = async () => {
    try {
      const settings = await api.getSiteSettings();
      if (settings) {
        setSiteSettings(settings);
      }
    } catch (err) {
      console.warn('Failed to load site settings', err);
    }
  };

  const loadPermissionsForUser = async (userId) => {
    if (!userId) return;
    try {
      setIsLoadingPerms(true);
      const perms = await api.getUserPermissions(userId);
      setUserPermissions(perms || {});
    } catch (err) {
      showToast('Failed to load permissions: ' + err.message, 'error');
    } finally {
      setIsLoadingPerms(false);
    }
  };

  // Handle User Selection in Feature Controls
  const handleSelectUserForPerms = (userId) => {
    setSelectedUserId(userId);
    loadPermissionsForUser(userId);
  };

  // Toggle Feature Permission
  const handleToggleFeature = async (featureKey) => {
    if (!selectedUserId) return;
    const targetUser = users.find(u => u.id === selectedUserId);
    if (targetUser?.role === 'admin') {
      showToast('Super Admin always has full access to all features', 'info');
      return;
    }

    const currentVal = Boolean(userPermissions[featureKey]);
    const newVal = !currentVal;
    const updatedPerms = { ...userPermissions, [featureKey]: newVal };
    setUserPermissions(updatedPerms);

    try {
      setIsSavingPerms(true);
      await api.updateUserPermissions(selectedUserId, { [featureKey]: newVal });
      showToast(`Feature "${featureKey}" set to ${newVal ? 'ON' : 'OFF'} for ${targetUser?.fullName || 'user'}`, 'success');
    } catch (err) {
      showToast('Failed to save permission: ' + err.message, 'error');
      // Revert on error
      setUserPermissions(userPermissions);
    } finally {
      setIsSavingPerms(false);
    }
  };

  // Module 1: Handle Create New User Submit
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    const { fullName, mobileNumber, email, password } = newUserForm;

    if (!fullName.trim()) {
      showToast('Please enter the user\'s Full Name', 'error');
      return;
    }
    if (!mobileNumber.trim()) {
      showToast('Please enter a valid Mobile Number', 'error');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast('Please enter a valid Email Address', 'error');
      return;
    }
    if (!password || password.length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setIsCreatingUser(true);
      const created = await api.createUser({
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim(),
        password,
        role: 'user'
      });

      showToast(`User "${created.fullName}" created successfully!`, 'success');
      setNewUserForm({
        fullName: '',
        mobileNumber: '',
        email: '',
        password: '',
        role: 'user'
      });
      await loadUsers();
      // Switch to Users List to view the newly created user
      setActiveModule('users-list');
    } catch (err) {
      showToast(err.message || 'Failed to create user', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Module 2: Edit User Profile Submit
  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setIsSavingEdit(true);
      await api.updateUser(editingUser.id, editFormData);
      showToast(`Profile updated for ${editFormData.fullName}`, 'success');
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      showToast(err.message || 'Failed to update user', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Module 2: Reset User Password Submit
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    if (!newAdminPassword || newAdminPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    try {
      setIsResettingPassword(true);
      await api.resetUserPassword(resetPasswordUser.id, newAdminPassword);
      showToast(`Password updated successfully for ${resetPasswordUser.email}`, 'success');
      setResetPasswordUser(null);
      setNewAdminPassword('');
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Module 2: Toggle Active / Suspended
  const handleToggleUserStatus = async (user) => {
    if (user.role === 'admin') {
      showToast('Super Admin account cannot be suspended', 'info');
      return;
    }
    const newStatus = user.accountStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.updateUser(user.id, { accountStatus: newStatus });
      showToast(`User ${user.fullName} is now ${newStatus.toUpperCase()}`, 'success');
      await loadUsers();
    } catch (err) {
      showToast('Failed to change status: ' + err.message, 'error');
    }
  };

  // Module 3: Cloudinary Logo Upload
  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WebP)', 'error');
      return;
    }

    try {
      setIsUploadingLogo(true);
      showToast('Uploading logo to Cloudinary...', 'info');
      const res = await api.uploadLogoToCloudinary(file);
      if (res && res.url) {
        setSiteSettings(prev => ({ ...prev, logoUrl: res.url }));
        showToast('Logo uploaded to Cloudinary successfully!', 'success');
      }
    } catch (err) {
      showToast('Cloudinary upload error: ' + err.message, 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Module 3: Save Site Branding Settings
  const handleSaveBranding = async (e) => {
    e?.preventDefault();
    try {
      setIsSavingSettings(true);
      const updated = await api.updateSiteSettings(siteSettings);
      showToast('Website branding settings saved successfully!', 'success');
      if (onBrandingUpdated) {
        onBrandingUpdated(updated);
      }
    } catch (err) {
      showToast('Failed to save settings: ' + err.message, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Filtered users for search
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.mobileNumber || '').includes(q)
    );
  });

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      paddingBottom: '80px',
      color: '#0f172a'
    }}>
      {/* Admin Panel Sticky Header */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          {/* Left Title + Back */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#334155'
              }}
              title="Return to Main Website"
            >
              <ArrowLeft size={18} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '9px',
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(30, 64, 175, 0.3)'
              }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h1 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                  Admin Panel
                </h1>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0, fontWeight: 600 }}>
                  Multi-User & Supabase Administration
                </p>
              </div>
            </div>
          </div>

          {/* Quick Back button label for desktop */}
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Main Website</span>
            <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>

        {/* 3 Main Module Navigation Tabs */}
        <div style={{
          maxWidth: '1200px',
          margin: '12px auto 0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '12px'
        }}>
          {/* Module 1: Create User */}
          <button
            type="button"
            onClick={() => setActiveModule('create-user')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '10px 8px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: activeModule === 'create-user' ? '#ffffff' : 'transparent',
              color: activeModule === 'create-user' ? '#1d4ed8' : '#64748b',
              fontWeight: activeModule === 'create-user' ? 800 : 600,
              fontSize: '13px',
              boxShadow: activeModule === 'create-user' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <UserPlus size={16} />
            <span>1. Create User</span>
          </button>

          {/* Module 2: Users List */}
          <button
            type="button"
            onClick={() => setActiveModule('users-list')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '10px 8px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: activeModule === 'users-list' ? '#ffffff' : 'transparent',
              color: activeModule === 'users-list' ? '#1d4ed8' : '#64748b',
              fontWeight: activeModule === 'users-list' ? 800 : 600,
              fontSize: '13px',
              boxShadow: activeModule === 'users-list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Users size={16} />
            <span>2. Users List</span>
          </button>

          {/* Module 3: Feature Controls & Website Config */}
          <button
            type="button"
            onClick={() => setActiveModule('feature-controls')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '10px 8px',
              borderRadius: '9px',
              border: 'none',
              backgroundColor: activeModule === 'feature-controls' ? '#ffffff' : 'transparent',
              color: activeModule === 'feature-controls' ? '#1d4ed8' : '#64748b',
              fontWeight: activeModule === 'feature-controls' ? 800 : 600,
              fontSize: '13px',
              boxShadow: activeModule === 'feature-controls' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Sliders size={16} />
            <span>3. Feature Controls</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 16px' }}>

        {/* ========================================================================= */}
        {/* MODULE 1: CREATE NEW USER                                                */}
        {/* ========================================================================= */}
        {activeModule === 'create-user' && (
          <div style={{
            maxWidth: '620px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '28px 24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <UserPlus size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Register New User
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Create a business user account with auto-assigned role and permissions.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateUserSubmit}>
              {/* Full Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={newUserForm.fullName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px 12px 11px 40px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Smartphone size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={newUserForm.mobileNumber}
                    onChange={(e) => setNewUserForm({ ...newUserForm, mobileNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px 12px 11px 40px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Email Address <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px 12px 11px 40px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type={showNewUserPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px 42px 11px 40px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '12px',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: '#64748b'
                    }}
                  >
                    {showNewUserPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  The user will be assigned the default role of <strong>user</strong> and can log in immediately.
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isCreatingUser}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '10px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: isCreatingUser ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                }}
              >
                {isCreatingUser ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Registering User in Supabase & Local DB...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>Create User & Save Account</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODULE 2: USERS LIST & ACCOUNT MANAGEMENT                                */}
        {/* ========================================================================= */}
        {activeModule === 'users-list' && (
          <div>
            {/* Header & Search */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '16px 20px',
              marginBottom: '16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Registered Users ({users.length})
                </h2>
                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Manage accounts, status, and reset passwords securely.
                </p>
              </div>

              {/* Search input */}
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                <input
                  type="text"
                  placeholder="Search by name, email, or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Users List Cards / Table */}
            {isLoadingUsers ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#ffffff', borderRadius: '12px' }}>
                <RefreshCw size={24} className="animate-spin" color="#2563eb" style={{ margin: '0 auto 10px auto' }} />
                <p style={{ color: '#64748b', fontSize: '14px' }}>Loading registered users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <Users size={32} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
                <p style={{ color: '#334155', fontWeight: 700, margin: '0 0 4px 0' }}>No users found</p>
                <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Try clearing your search query or create a new user.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                {filteredUsers.map((u) => {
                  const isSuspended = u.accountStatus === 'suspended';
                  const isAdmin = u.role === 'admin';

                  return (
                    <div
                      key={u.id}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '14px',
                        border: isSuspended ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                        padding: '16px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '14px',
                        position: 'relative'
                      }}
                    >
                      {/* Top Info */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            backgroundColor: isAdmin ? '#eff6ff' : '#f1f5f9',
                            color: isAdmin ? '#1d4ed8' : '#475569'
                          }}>
                            {isAdmin ? '👑 Super Admin' : '👤 Business User'}
                          </span>

                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            backgroundColor: isSuspended ? '#fee2e2' : '#f0fdf4',
                            color: isSuspended ? '#b91c1c' : '#15803d'
                          }}>
                            {isSuspended ? 'Suspended' : 'Active'}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                          {u.fullName || u.name}
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569', marginBottom: '4px' }}>
                          <Mail size={14} color="#94a3b8" />
                          <span>{u.email}</span>
                        </div>

                        {u.mobileNumber && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569', marginBottom: '4px' }}>
                            <Smartphone size={14} color="#94a3b8" />
                            <span>{u.mobileNumber}</span>
                          </div>
                        )}

                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                          Registered: {u.createdAt || 'N/A'} {u.updatedAt ? `· Updated: ${u.updatedAt}` : ''}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isAdmin ? '1fr 1fr' : '1fr 1fr 1fr',
                        gap: '6px',
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '12px'
                      }}>
                        {/* Edit Profile */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(u);
                            setEditFormData({
                              fullName: u.fullName || u.name,
                              mobileNumber: u.mobileNumber || '',
                              accountStatus: u.accountStatus || 'active'
                            });
                          }}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '7px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        {/* Reset Password */}
                        <button
                          type="button"
                          onClick={() => {
                            setResetPasswordUser(u);
                            setNewAdminPassword('');
                          }}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '7px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <KeyRound size={13} />
                          <span>Password</span>
                        </button>

                        {/* Toggle Status (User only) */}
                        {!isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: '7px',
                              border: isSuspended ? '1px solid #bbf7d0' : '1px solid #fecaca',
                              backgroundColor: isSuspended ? '#f0fdf4' : '#fef2f2',
                              color: isSuspended ? '#16a34a' : '#dc2626',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <Power size={13} />
                            <span>{isSuspended ? 'Activate' : 'Suspend'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODULE 3: USER FEATURE CONTROLS & WEBSITE CONFIGURATION                   */}
        {/* ========================================================================= */}
        {activeModule === 'feature-controls' && (
          <div>
            {/* Sub-Tabs for Module 3 */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              backgroundColor: '#ffffff',
              padding: '6px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              overflowX: 'auto'
            }}>
              <button
                type="button"
                onClick={() => setModule3SubTab('permissions')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: module3SubTab === 'permissions' ? '#eff6ff' : 'transparent',
                  color: module3SubTab === 'permissions' ? '#1d4ed8' : '#475569',
                  fontWeight: 800,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Sliders size={16} />
                <span>A. User Feature Permissions</span>
              </button>

              <button
                type="button"
                onClick={() => setModule3SubTab('branding')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: module3SubTab === 'branding' ? '#eff6ff' : 'transparent',
                  color: module3SubTab === 'branding' ? '#1d4ed8' : '#475569',
                  fontWeight: 800,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Palette size={16} />
                <span>B. Website Branding & Colors</span>
              </button>

              <button
                type="button"
                onClick={() => setModule3SubTab('catalogue')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: module3SubTab === 'catalogue' ? '#eff6ff' : 'transparent',
                  color: module3SubTab === 'catalogue' ? '#1d4ed8' : '#475569',
                  fontWeight: 800,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Layers size={16} />
                <span>C. Content & Brands Catalogue</span>
              </button>
            </div>

            {/* SUB-TAB A: USER FEATURE PERMISSIONS */}
            {module3SubTab === 'permissions' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                {/* User Selector Dropdown */}
                <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                    Select User to Configure Permissions:
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => handleSelectUserForPerms(e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '420px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #2563eb',
                      fontSize: '14px',
                      fontWeight: 700,
                      backgroundColor: '#f8fafc',
                      color: '#0f172a',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.name} ({u.email}) {u.role === 'admin' ? '[SUPER ADMIN]' : ''}
                      </option>
                    ))}
                  </select>

                  {selectedUser && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Configuring: <strong>{selectedUser.fullName || selectedUser.name}</strong> ({selectedUser.email})
                      </span>
                      {selectedUser.role === 'admin' && (
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#1d4ed8', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>
                          Super Admin has all features enabled permanently
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Features Grid */}
                {isLoadingPerms ? (
                  <div style={{ textAlign: 'center', padding: '30px' }}>
                    <RefreshCw size={22} className="animate-spin" color="#2563eb" style={{ margin: '0 auto 8px auto' }} />
                    <p style={{ color: '#64748b', fontSize: '13px' }}>Loading permissions...</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                    {AVAILABLE_FEATURES.map((feature) => {
                      const isEnabled = selectedUser?.role === 'admin' ? true : Boolean(userPermissions[feature.key]);

                      return (
                        <div
                          key={feature.key}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '12px',
                            border: isEnabled ? '1.5px solid #bfdbfe' : '1px solid #e2e8f0',
                            backgroundColor: isEnabled ? '#f8faff' : '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                                {feature.label}
                              </span>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#e2e8f0',
                                color: '#475569'
                              }}>
                                {feature.category}
                              </span>
                            </div>
                            <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0, lineHeight: 1.3 }}>
                              {feature.desc}
                            </p>
                          </div>

                          {/* ON / OFF Toggle Switch */}
                          <button
                            type="button"
                            disabled={selectedUser?.role === 'admin' || isSavingPerms}
                            onClick={() => handleToggleFeature(feature.key)}
                            style={{
                              width: '56px',
                              height: '28px',
                              borderRadius: '14px',
                              backgroundColor: isEnabled ? '#16a34a' : '#cbd5e1',
                              border: 'none',
                              cursor: selectedUser?.role === 'admin' ? 'not-allowed' : 'pointer',
                              position: 'relative',
                              transition: 'background-color 0.2s',
                              flexShrink: 0
                            }}
                          >
                            <span
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: '#ffffff',
                                position: 'absolute',
                                top: '3px',
                                left: isEnabled ? '31px' : '3px',
                                transition: 'left 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                              }}
                            >
                              {isEnabled ? <Check size={12} color="#16a34a" strokeWidth={3} /> : null}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB B: WEBSITE BRANDING & COLORS */}
            {module3SubTab === 'branding' && (
              <div style={{
                maxWidth: '720px',
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0' }}>
                  Website Branding & Theme Settings
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>
                  Stored in database & Supabase. Automatically reflects in the user's Main Website without redeployment.
                </p>

                <form onSubmit={handleSaveBranding}>
                  {/* Business Name */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Website / Business Name
                    </label>
                    <input
                      type="text"
                      required
                      value={siteSettings.businessName}
                      onChange={(e) => setSiteSettings({ ...siteSettings, businessName: e.target.value })}
                      placeholder="OTT SELLERS"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Subtitle */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Business Subtitle
                    </label>
                    <input
                      type="text"
                      value={siteSettings.subtitle}
                      onChange={(e) => setSiteSettings({ ...siteSettings, subtitle: e.target.value })}
                      placeholder="Management System"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Logo Upload via Cloudinary */}
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Website Logo (Cloudinary Upload)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      {siteSettings.logoUrl ? (
                        <img
                          src={siteSettings.logoUrl}
                          alt="Logo Preview"
                          style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '10px',
                            objectFit: 'contain',
                            border: '1px solid #cbd5e1',
                            padding: '4px',
                            backgroundColor: '#ffffff'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '10px',
                          border: '2px dashed #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8'
                        }}>
                          <Globe size={24} />
                        </div>
                      )}

                      <div>
                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '9px 14px',
                          borderRadius: '8px',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: isUploadingLogo ? 'wait' : 'pointer',
                          border: '1px solid #bfdbfe'
                        }}>
                          {isUploadingLogo ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>Uploading to Cloudinary...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={14} />
                              <span>Upload New Logo</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingLogo}
                            onChange={handleLogoFileChange}
                            style={{ display: 'none' }}
                          />
                        </label>
                        <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                          Uploads directly to Cloudinary (cloud: f7nm8ylt / preset: ml_default)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Colors */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Primary Brand Color
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="color"
                          value={siteSettings.primaryColor}
                          onChange={(e) => setSiteSettings({ ...siteSettings, primaryColor: e.target.value })}
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        />
                        <input
                          type="text"
                          value={siteSettings.primaryColor}
                          onChange={(e) => setSiteSettings({ ...siteSettings, primaryColor: e.target.value })}
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            fontWeight: 700
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Accent Color
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="color"
                          value={siteSettings.accentColor}
                          onChange={(e) => setSiteSettings({ ...siteSettings, accentColor: e.target.value })}
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        />
                        <input
                          type="text"
                          value={siteSettings.accentColor}
                          onChange={(e) => setSiteSettings({ ...siteSettings, accentColor: e.target.value })}
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            fontWeight: 700
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Headings & Announcement Text */}
                  <div style={{ marginBottom: '22px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Homepage Heading / Announcement Text
                    </label>
                    <input
                      type="text"
                      value={siteSettings.headingsText}
                      onChange={(e) => setSiteSettings({ ...siteSettings, headingsText: e.target.value })}
                      placeholder="Multi-Brand OTT Subscriptions"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Save Button */}
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: isSavingSettings ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                    }}
                  >
                    {isSavingSettings ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Saving Settings...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Website Branding</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* SUB-TAB C: CONTENT & BRANDS CATALOGUE */}
            {module3SubTab === 'catalogue' && (
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
                      OTT Brands Catalogue ({brands.length})
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                      Manage streaming brands, pricing plans, and screen visibility settings.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenBrandManager) onOpenBrandManager();
                    }}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '9px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Layers size={16} />
                    <span>Open Full Brands Manager</span>
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {brands.map(b => (
                    <div
                      key={b.id}
                      style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: b.color || '#3b82f6'
                          }}
                        />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                            {b.displayName || b.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {b.screensCount || 5} Screens · PIN: {b.showScreenPin !== false ? 'ON' : 'OFF'} · Dev: {b.showDeviceName !== false ? 'ON' : 'OFF'}
                          </div>
                        </div>
                      </div>

                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb' }}>
                        ₹{b.prices?.['01 Month'] || 199}/mo
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: EDIT USER PROFILE                                                  */}
      {/* ========================================================================= */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
              Edit User Profile
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px 0' }}>
              Updating details for <strong>{editingUser.email}</strong>
            </p>

            <form onSubmit={handleSaveUserEdit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={editFormData.mobileNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, mobileNumber: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {editingUser.role !== 'admin' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Account Status
                  </label>
                  <select
                    value={editFormData.accountStatus}
                    onChange={(e) => setEditFormData({ ...editFormData, accountStatus: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="active">Active (Access Allowed)</option>
                    <option value="suspended">Suspended (Access Blocked)</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: isSavingEdit ? 'wait' : 'pointer'
                  }}
                >
                  {isSavingEdit ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET USER PASSWORD                                                */}
      {/* ========================================================================= */}
      {resetPasswordUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 100
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0' }}>
              Set New Password
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px 0' }}>
              Update password securely for <strong>{resetPasswordUser.email}</strong>
            </p>

            <form onSubmit={handleResetPasswordSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showAdminResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter at least 6 characters"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminResetPassword(!showAdminResetPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '10px',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: '#64748b'
                    }}
                  >
                    {showAdminResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: isResettingPassword ? 'wait' : 'pointer'
                  }}
                >
                  {isResettingPassword ? 'Updating...' : 'Set Active Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
