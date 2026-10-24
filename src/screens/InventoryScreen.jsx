import React, { useState, useEffect } from 'react';
import {
  Check, Calendar, ArrowUpDown, Eye, EyeOff, Lock, Unlock,
  Save, Plus, Trash2, X, Search, ArrowLeft, Tv, Smartphone, Laptop, Sparkles, RefreshCw, Star,
  ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import { api, compareAccountOrders } from '../api/client';
import CopyButton from '../components/CopyButton';
import OttBrandsGrid from '../components/OttBrandsGrid';
import DatePickerModal from '../components/DatePickerModal';
import AccountStarDetailsModal from '../components/AccountStarDetailsModal';
import { getExpiryStatus } from '../utils/dateUtils';
import { exportInventoryToExcel } from '../utils/excelExport';

export default function InventoryScreen({
  brands = [],
  selectedBrand,
  onSelectBrand,
  onNavigateToSaleWithSlot,
  showToast
}) {
  // If no brand selected yet, start with selectedBrand or null (opens Brands list)
  const [currentBrand, setCurrentBrand] = useState(selectedBrand || null);
  const [items, setItems] = useState(() => {
    try {
      const cached = localStorage.getItem('accounts_manager_cached_inventory');
      if (cached && selectedBrand) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter(i => !i.isDeleted && (i.brandId === selectedBrand.id || selectedBrand.id === 'all'));
        }
      }
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [screenDateModal, setScreenDateModal] = useState(null); // { itemId, screenIndex, currentDate }
  const [userDetailsModal, setUserDetailsModal] = useState(null); // { name, number, sold, plan, activation, expiry, amount, device, refName, refNumber }
  const [starModalItem, setStarModalItem] = useState(null);

  const handleOpenSoldScreenDetails = async (item, screen, sIdx) => {
    try {
      const allSales = await api.getSales({ brandId: 'all' });
      const screenNum = sIdx + 1;
      let matched = (allSales || []).find(s => s.id === screen.saleId);
      if (!matched && screen.saleId) {
        matched = (allSales || []).find(s => s.id?.includes(screen.saleId) || screen.saleId?.includes(s.id));
      }
      if (!matched) {
        matched = (allSales || []).find(s =>
          (s.inventoryId === item.id || s.accountEmail?.toLowerCase() === item.email?.toLowerCase()) &&
          (parseInt(s.screenNumber?.toString().replace(/\D/g, '') || '0', 10) === screenNum || s.screenNumber === `Screen-${screenNum}` || s.screenNumber === `Screen ${screenNum}`)
        );
      }
      if (!matched) {
        matched = (allSales || []).find(s => s.accountEmail?.toLowerCase() === item.email?.toLowerCase());
      }

      let savedUser = null;
      try {
        savedUser = JSON.parse(localStorage.getItem('accounts_manager_user') || '{}');
      } catch (e) {}

      const myEmail = (savedUser?.email || '').trim().toLowerCase();
      const seller = (matched?.sellerName || matched?.sellerEmail || '').trim();
      const isOtherSeller = seller && seller.toLowerCase() !== myEmail && seller.toLowerCase() !== 'fixyourmobiles10@gmail.com';

      setUserDetailsModal({
        name: matched?.customerName || (screen.status === 'occupied' ? 'Customer' : '-'),
        number: matched?.customerNumber || '-',
        sold: isOtherSeller ? seller : (matched?.sellerName || ''),
        plan: matched?.validity || item.validity || '-',
        activation: matched?.activationDate || matched?.saleDate || '-',
        expiry: screen.expiryDate || matched?.expiryDate || '-',
        amount: matched?.amount ? `₹ ${matched.amount}` : '-',
        device: matched?.deviceName || '',
        refName: matched?.referenceName || '',
        refNumber: matched?.referenceNumber || ''
      });
    } catch (err) {
      setUserDetailsModal({
        name: screen.status === 'occupied' ? 'Customer' : '-',
        number: '-',
        sold: '',
        plan: item.validity || '-',
        activation: '-',
        expiry: screen.expiryDate || '-',
        amount: '-',
        device: '',
        refName: '',
        refNumber: ''
      });
    }
  };

  useEffect(() => {
    if (selectedBrand) {
      const fresh = (brands || []).find(b => b.id === selectedBrand.id);
      setCurrentBrand(fresh || selectedBrand);
    } else {
      setCurrentBrand(null);
    }
  }, [selectedBrand, brands]);

  // Top 4 Filter Controls (from image copy 10.png)
  const [filterSelectedOnly, setFilterSelectedOnly] = useState(false);
  const [filterEmptyOnly, setFilterEmptyOnly] = useState(false);
  const [selectedValidity, setSelectedValidity] = useState('all');
  const [sortOrder, setSortOrder] = useState('top'); // 'top' or 'bottom'
  const [searchQuery, setSearchQuery] = useState('');

  // Card editing state: item ID -> editable fields
  const [editingCards, setEditingCards] = useState({});
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [expandedAccounts, setExpandedAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem('accounts_manager_expanded_accounts_state');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  const handleToggleAccountExpand = (accountId) => {
    setExpandedAccounts(prev => {
      const current = prev[accountId] !== undefined ? prev[accountId] : true;
      const next = !current;
      const updated = { ...prev, [accountId]: next };
      try {
        localStorage.setItem('accounts_manager_expanded_accounts_state', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const getComputedAccountStatus = (account, editStatus) => {
    if (editStatus !== undefined && editStatus !== null) {
      return editStatus;
    }
    if (account?.manualStatus) {
      return account.manualStatus;
    }
    const expiryStr = account?.sellerDetails?.accountExpiryDate || account?.accountExpiryDate;
    if (expiryStr && String(expiryStr).trim()) {
      const parsed = parseDate(expiryStr) || new Date(expiryStr);
      if (parsed && !isNaN(parsed.getTime())) {
        const endOfDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 23, 59, 59, 999);
        return new Date().getTime() > endOfDay.getTime() ? 'Expired' : 'Active';
      }
    }
    return 'Active';
  };

  // Seller Details Modal State
  const [sellerModalItem, setSellerModalItem] = useState(null);
  const [sellerFormData, setSellerFormData] = useState({
    purchaseDate: '',
    accountExpiryDate: '',
    sellerName: '',
    sellerNumber: '',
    referenceDate: '',
    reference: '',
    link: '',
    card: '',
    expiry: '',
    cvv: '',
    amount: '',
    notes: ''
  });
  const [sellerSaving, setSellerSaving] = useState(false);
  const [sellerError, setSellerError] = useState('');

  const handleOpenSellerDetails = (item) => {
    setSellerModalItem(item);
    const existing = item.sellerDetails || {};
    setSellerFormData({
      purchaseDate: existing.purchaseDate || '',
      accountExpiryDate: existing.accountExpiryDate || item.accountExpiryDate || '',
      sellerName: existing.sellerName || '',
      sellerNumber: existing.sellerNumber || '',
      referenceDate: existing.referenceDate || '',
      reference: existing.reference || '',
      link: existing.link || '',
      card: existing.card || '',
      expiry: existing.expiry || '',
      cvv: '', // CVV is masked and never stored persistently for security
      amount: existing.amount || '',
      notes: existing.notes || ''
    });
    setSellerError('');
  };

  const handleSaveSellerDetails = async () => {
    if (!sellerModalItem) return;

    // Validation: Require at least one identifying field
    if (
      !sellerFormData.sellerName?.trim() &&
      !sellerFormData.purchaseDate &&
      !sellerFormData.accountExpiryDate &&
      !sellerFormData.sellerNumber?.trim() &&
      !sellerFormData.card?.trim() &&
      !sellerFormData.reference?.trim()
    ) {
      setSellerError('Please fill at least Seller Name, Purchase Date, Account Expiry Date, or Reference.');
      return;
    }

    try {
      setSellerSaving(true);
      setSellerError('');

      // Prepare payload - DO NOT store actual CVV values to ensure PCI-DSS security compliance
      const cleanSellerDetails = {
        purchaseDate: sellerFormData.purchaseDate || '',
        accountExpiryDate: sellerFormData.accountExpiryDate || '',
        sellerName: sellerFormData.sellerName?.trim() || '',
        sellerNumber: sellerFormData.sellerNumber?.trim() || '',
        referenceDate: sellerFormData.referenceDate || '',
        reference: sellerFormData.reference?.trim() || '',
        link: sellerFormData.link?.trim() || '',
        card: sellerFormData.card?.trim() || '',
        expiry: sellerFormData.expiry?.trim() || '',
        amount: sellerFormData.amount ? Number(sellerFormData.amount) || sellerFormData.amount : '',
        notes: sellerFormData.notes?.trim() || '',
        updatedAt: new Date().toISOString()
      };

      // Clear manual override so status is dynamically calculated from the new account expiry date
      await api.updateInventory(sellerModalItem.id, {
        sellerDetails: cleanSellerDetails,
        manualStatus: null
      });

      // Update state locally
      setItems(prev =>
        prev.map(it => (it.id === sellerModalItem.id ? { ...it, sellerDetails: cleanSellerDetails, manualStatus: null } : it))
      );

      showToast(`Seller details saved for Account #${sellerModalItem.recordNumber || ''}`, 'success');
      setSellerModalItem(null);
    } catch (err) {
      setSellerError(err.message || 'Failed to save seller details');
      showToast('Error saving seller details', 'error');
    } finally {
      setSellerSaving(false);
    }
  };

  const handleClearSellerDetails = async () => {
    if (!sellerModalItem) return;
    if (!window.confirm('Are you sure you want to remove seller details for this account?')) return;

    try {
      setSellerSaving(true);
      await api.updateInventory(sellerModalItem.id, {
        sellerDetails: null
      });

      setItems(prev =>
        prev.map(it => (it.id === sellerModalItem.id ? { ...it, sellerDetails: null } : it))
      );

      showToast(`Seller details removed for Account #${sellerModalItem.recordNumber || ''}`, 'info');
      setSellerModalItem(null);
    } catch (err) {
      setSellerError('Failed to clear details');
    } finally {
      setSellerSaving(false);
    }
  };

  // New account modal state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newValidity, setNewValidity] = useState('12 Months');
  const [newPlanVariant, setNewPlanVariant] = useState('General');
  const [newScreenCount, setNewScreenCount] = useState(5);
  const [newScreenPins, setNewScreenPins] = useState(['1111', '2222', '3333', '4444', '5555']);
  const [newDeviceNames, setNewDeviceNames] = useState(['', '', '', '', '']);
  const [newPassVisible, setNewPassVisible] = useState(false);

  const fetchInventory = async () => {
    if (!currentBrand) return;
    try {
      setLoading(true);
      const data = await api.getInventory({
        brandId: currentBrand.id,
        selectedOnly: filterSelectedOnly,
        emptyOnly: filterEmptyOnly,
        validity: selectedValidity,
        sortOrder
      });
      setItems(data || []);
      try {
        const cached = localStorage.getItem('accounts_manager_cached_inventory');
        let fullList = cached ? JSON.parse(cached) : [];
        if (Array.isArray(fullList)) {
          const map = new Map(fullList.map(i => [i.id, i]));
          (data || []).forEach(it => map.set(it.id, it));
          localStorage.setItem('accounts_manager_cached_inventory', JSON.stringify(Array.from(map.values())));
        }
      } catch (e) {}
    } catch (err) {
      showToast('Failed to load inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentBrand) {
      const brandScreens = parseInt(currentBrand.screensCount || '5', 10) || 5;
      setNewScreenCount(brandScreens);
      setNewScreenPins(Array.from({ length: brandScreens }, (_, i) => `${(i + 1) * 1111}`.slice(0, 4)));
      setNewDeviceNames(Array.from({ length: brandScreens }, () => ''));

      // Immediate pre-population from cached inventory if available
      try {
        const cached = localStorage.getItem('accounts_manager_cached_inventory');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const matched = parsed.filter(i => !i.isDeleted && (i.brandId === currentBrand.id || currentBrand.id === 'all'));
            if (matched.length > 0) {
              setItems(matched);
            }
          }
        }
      } catch (e) {}

      fetchInventory();
    }
  }, [currentBrand, filterSelectedOnly, filterEmptyOnly, selectedValidity, sortOrder]);

  const handleSyncFromSheet = async () => {
    try {
      setLoading(true);
      const res = await api.pullFromGoogleSheet();
      if (res?.success) {
        showToast(`Refreshed from Google Sheet (${res.updatedInvCount || 0} accounts checked)`, 'success');
        await fetchInventory();
      } else {
        showToast(res?.message || 'Sync failed', 'info');
      }
    } catch (e) {
      showToast('Failed to sync: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBrand = (brand) => {
    setCurrentBrand(brand);
    if (onSelectBrand) onSelectBrand(brand);
  };

  const handleToggleSelect = async (id, e) => {
    e?.stopPropagation();
    try {
      const updated = await api.toggleInventorySelect(id);
      setItems(prev => prev.map(item => item.id === id ? { ...item, isSelected: updated.isSelected } : item));
      showToast(updated.isSelected ? 'Account selected' : 'Account unselected', 'info');
    } catch (err) {
      showToast('Error updating selection', 'error');
    }
  };

  const handleToggleLock = async (item) => {
    const isCurrentlyEditing = !!editingCards[item.id];
    if (isCurrentlyEditing) {
      // If there are unsaved edits in progress, auto-save before locking so changes are NEVER lost
      const editState = editingCards[item.id];
      const hasRecordNumberChange = editState.recordNumber !== undefined &&
        String(parseInt(editState.recordNumber, 10) || '') !== String(parseInt(item.recordNumber || '0', 10) || '');
      const hasEmailChange = editState.email !== undefined && editState.email !== item.email;
      const hasPwChange = editState.password !== undefined && editState.password !== item.password;
      const hasValidityChange = editState.validity !== undefined && editState.validity !== item.validity;
      const hasPlanChange = editState.planVariant !== undefined && editState.planVariant !== item.planVariant;
      const hasPinChange = editState.pins && editState.pins.some((p, idx) => p !== (item.screens?.[idx]?.pin || '1234'));
      const hasDateChange = editState.dates && Object.keys(editState.dates).length > 0;
      const hasDeviceChange = editState.deviceTypes && Object.keys(editState.deviceTypes).length > 0;
      const hasDeviceNameChange = editState.deviceNames &&
        editState.deviceNames.some((d, idx) => String(d || '').trim() !== String(item.screens?.[idx]?.deviceName || '').trim());

      if (hasRecordNumberChange || hasEmailChange || hasPwChange || hasValidityChange || hasPlanChange || hasPinChange || hasDateChange || hasDeviceChange || hasDeviceNameChange) {
        await handleSaveCard(item);
        return;
      }

      setEditingCards(prev => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      showToast('Card locked', 'info');
    } else {
      setEditingCards(prev => ({
        ...prev,
        [item.id]: {
          recordNumber: item.recordNumber !== undefined && item.recordNumber !== null ? String(parseInt(item.recordNumber, 10) || 1) : '1',
          recordNumberError: null,
          email: item.email,
          password: item.password,
          validity: item.validity,
          planVariant: item.planVariant || 'General',
          pins: (item.screens || []).map(s => s.pin || '1234'),
          dates: (item.screens || []).map(s => s.expiryDate || ''),
          deviceTypes: (item.screens || []).map(s => s.deviceType || 'tv'),
          deviceNames: (item.screens || []).map(s => s.deviceName || '')
        }
      }));
      showToast('Card unlocked for editing (E Number, ID, Password, PINs, Dates, Devices, Validity, Plan)', 'info');
    }
  };

  const handleToggleDefaultExpanded = async (item) => {
    const nextVal = !item.defaultExpanded;
    try {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, defaultExpanded: nextVal } : i));
      setExpandedAccounts(prev => ({ ...prev, [item.id]: nextVal }));

      const res = await api.updateInventory(item.id, { defaultExpanded: nextVal });
      if (res) {
        setItems(prev => prev.map(i => i.id === item.id ? res : i));
      }
      showToast(`Account #${item.recordNumber}: Default expansion set to ${nextVal ? 'ON (Expanded)' : 'OFF (Compact)'}`, 'success');
    } catch (err) {
      showToast('Failed to update default expansion: ' + err.message, 'error');
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, defaultExpanded: !nextVal } : i));
    }
  };

  // Cycle plan variant on card (image copy 48.png)
  const handleCyclePlanVariant = async (item) => {
    let plans = ['General'];
    if (currentBrand?.pricingPlans && typeof currentBrand.pricingPlans === 'object') {
      const pList = Object.values(currentBrand.pricingPlans).filter(p => p.enabled).map(p => p.label || p.name);
      if (pList.length > 0) plans = pList;
    }
    if (plans.length === 1 && plans[0] === 'General') {
      plans = ['General', 'With Ads', 'Ads Free'];
    }

    const current = (editingCards[item.id]?.planVariant || item.planVariant || 'General');
    const currIdx = plans.indexOf(current);
    const nextPlan = plans[(currIdx + 1) % plans.length] || 'General';

    if (editingCards[item.id]) {
      setEditingCards(prev => ({
        ...prev,
        [item.id]: { ...prev[item.id], planVariant: nextPlan }
      }));
      showToast(`Plan changed to ${nextPlan} (Click Save to persist)`, 'info');
      return;
    }

    try {
      const result = await api.updateInventory(item.id, { planVariant: nextPlan });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, planVariant: nextPlan } : i));
      showToast(`Account plan set to ${nextPlan}`, 'info');
    } catch (err) {
      showToast('Error updating plan variant', 'error');
    }
  };

  const handleCycleValidity = async (item) => {
    if (!editingCards[item.id]) {
      showToast('Please click Edit (UnLock) first to change validity', 'info');
      return;
    }
    const plans = (currentBrand?.plans && currentBrand.plans.length > 0)
      ? currentBrand.plans
      : ['01 Month', '03 Months', '06 Months', '12 Months'];
    const currentVal = editingCards[item.id]?.validity || item.validity || plans[0];
    const curIdx = plans.indexOf(currentVal);
    const nextPlan = plans[(curIdx + 1) % plans.length];

    setEditingCards(prev => ({
      ...prev,
      [item.id]: { ...prev[item.id], validity: nextPlan }
    }));
    showToast(`Account validity changed to ${nextPlan} (Click Save to apply)`, 'info');
  };

  const handleCycleDeviceType = (itemId, sIdx, e) => {
    if (e) e.stopPropagation();
    if (!editingCards[itemId]) {
      showToast('Please click Edit (UnLock) first to change device type', 'info');
      return;
    }
    const types = ['tv', 'mobile', 'laptop'];
    const currentTypes = editingCards[itemId]?.deviceTypes || [];
    const curType = currentTypes[sIdx] || 'tv';
    const nextType = types[(types.indexOf(curType) + 1) % types.length];

    const newTypes = [...currentTypes];
    newTypes[sIdx] = nextType;

    setEditingCards(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        deviceTypes: newTypes
      }
    }));
    showToast(`Screen-${sIdx + 1} device changed to ${nextType.toUpperCase()} (Click Save to persist)`, 'info');
  };

  const handleSaveCard = async (item) => {
    const editState = editingCards[item.id];
    if (!editState) {
      showToast('Click Unlock first to edit', 'info');
      return;
    }

    // Validate E Number (Feature 1: Positive whole numbers only)
    const rawRecNum = editState.recordNumber !== undefined ? editState.recordNumber : item.recordNumber;
    const parsedRecNum = Number(rawRecNum);
    if (
      rawRecNum === undefined ||
      rawRecNum === null ||
      String(rawRecNum).trim() === '' ||
      isNaN(parsedRecNum) ||
      parsedRecNum <= 0 ||
      !Number.isInteger(parsedRecNum)
    ) {
      setEditingCards(prev => ({
        ...prev,
        [item.id]: {
          ...prev[item.id],
          recordNumberError: 'Positive integer only'
        }
      }));
      showToast('Invalid E Number: Positive whole numbers only (e.g. 1, 2, 10)', 'error');
      return;
    }
    const formattedRecordNumber = String(parsedRecNum).padStart(2, '0');

    try {
      const updatedScreens = (item.screens || []).map((screen, idx) => {
        const pin = editState.pins?.[idx] !== undefined ? editState.pins[idx] : screen.pin;
        const expiryDate = editState.dates?.[idx] !== undefined ? editState.dates[idx] : screen.expiryDate;
        const deviceType = editState.deviceTypes?.[idx] || screen.deviceType || 'tv';
        const deviceName = editState.deviceNames?.[idx] !== undefined
          ? String(editState.deviceNames[idx] || '').trim()
          : (screen.deviceName || '');
        const status = expiryDate && String(expiryDate).trim() ? 'occupied' : (expiryDate === '' ? 'empty' : screen.status);
        return {
          ...screen,
          pin,
          deviceType,
          deviceName,
          expiryDate: status === 'occupied' ? expiryDate : null,
          status
        };
      });

      const payload = {
        recordNumber: formattedRecordNumber,
        email: editState.email,
        password: editState.password,
        validity: editState.validity,
        planVariant: editState.planVariant || item.planVariant || 'General',
        passwordChangeRequired: false,
        manualStatus: editState.status !== undefined ? editState.status : (item.manualStatus || null),
        screens: updatedScreens
      };

      // Also atomically update linked sales for any screens whose device name was edited
      (item.screens || []).forEach((sc, sIdx) => {
        if (sc.saleId && editState.deviceNames?.[sIdx] !== undefined) {
          api.updateSale(sc.saleId, {
            deviceName: String(editState.deviceNames[sIdx] || '').trim()
          }).catch(() => {});
        }
      });

      const result = await api.updateInventory(item.id, payload);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...payload, ...result } : i));
      setEditingCards(prev => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      showToast(`Account #${formattedRecordNumber} saved successfully!`, 'success');
    } catch (err) {
      showToast('Failed to save changes: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const handleDeleteCard = async () => {
    if (!deleteConfirmItem) return;
    try {
      await api.deleteInventory(deleteConfirmItem.id);
      setItems(prev => prev.filter(i => i.id !== deleteConfirmItem.id));
      setDeleteConfirmItem(null);
      showToast('Account removed from database', 'success');
    } catch (err) {
      showToast('Failed to delete account', 'error');
    }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const cycleValidityFilter = () => {
    const options = ['all', '01 Month', '03 Months', '06 Months', '12 Months'];
    const curIdx = options.indexOf(selectedValidity);
    const nextIdx = (curIdx + 1) % options.length;
    setSelectedValidity(options[nextIdx]);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'top' ? 'bottom' : 'top');
  };

  const handleScreenCountChange = (count) => {
    const n = Math.max(1, count);
    setNewScreenCount(n);
    setNewScreenPins(Array.from({ length: n }, (_, i) => `${(i + 1) * 1111}`.slice(0, 4)));
    setNewDeviceNames(Array.from({ length: n }, () => ''));
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      showToast('Email and Password are required', 'error');
      return;
    }

    try {
      const screens = Array.from({ length: newScreenCount }, (_, i) => ({
        screenNumber: i + 1,
        name: `Screen-${String(i + 1).padStart(2, '0')}`,
        pin: newScreenPins[i] || '1234',
        deviceName: (newDeviceNames[i] || '').trim(),
        status: 'empty',
        expiryDate: null
      }));

      await api.createInventory({
        brandId: currentBrand.id,
        email: newEmail.trim(),
        password: newPassword.trim(),
        validity: newValidity,
        planVariant: newPlanVariant || 'General',
        screens
      });

      setNewEmail('');
      setNewPassword('');
      setShowAddAccountModal(false);
      fetchInventory();
      showToast('New account added to database!', 'success');
    } catch (err) {
      showToast('Failed to create account', 'error');
    }
  };

  // ========================================================
  // STEP 1: BRANDS SELECTION (3 Columns × Rows as specified)
  // ========================================================
  if (!currentBrand) {
    return (
      <OttBrandsGrid
        brands={brands}
        onSelectBrand={(brand) => {
          handleSelectBrand(brand);
        }}
        onBack={() => {
          if (brands && brands.length > 0) {
            handleSelectBrand(brands[0]);
          }
        }}
      />
    );
  }

  // ========================================================
  // STEP 2: ACCOUNTS DATABASE (Exact classic image copy 10.png & 44.png)
  // ========================================================
  const sortedItems = [...items].sort((a, b) => {
    if (filterEmptyOnly) {
      const screensA = a.screens || [];
      const screensB = b.screens || [];
      const totalA = screensA.length || (currentBrand?.screensCount || 5);
      const totalB = screensB.length || (currentBrand?.screensCount || 5);
      const emptyA = screensA.filter(s => s.status === 'empty').length;
      const emptyB = screensB.filter(s => s.status === 'empty').length;

      const isAllEmptyA = emptyA === totalA && totalA > 0;
      const isAllEmptyB = emptyB === totalB && totalB > 0;

      // 1. Complete all empty screens account on top!
      if (isAllEmptyA && !isAllEmptyB) return -1;
      if (!isAllEmptyA && isAllEmptyB) return 1;

      // 2. Then sort descending by empty screens count (4 empty, then 3 empty, etc.)
      if (emptyB !== emptyA) {
        return emptyB - emptyA;
      }
    }

    return compareAccountOrders(a, b, sortOrder);
  });

  const filteredItems = sortedItems.filter(i => {
    if (filterSelectedOnly && !i.isSelected) return false;
    if (selectedValidity !== 'all' && i.validity !== selectedValidity) return false;
    if (!searchQuery) return true;
    return i.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '12px' }}>
      {/* Top 4 Filter Controls Bar (Exact from image copy 10.png & 44.png) */}
      <div className="filter-bar-4">
        {/* 1. Selected Filter - Stylish Colorful Button (image copy 44.png) */}
        <button
          type="button"
          className={`filter-pill-btn ${filterSelectedOnly ? 'pill-selected-active' : 'pill-selected-inactive'}`}
          onClick={() => setFilterSelectedOnly(!filterSelectedOnly)}
          id="inventory-filter-selected"
        >
          <Check size={14} strokeWidth={filterSelectedOnly ? 3 : 2.5} />
          <span>Selected</span>
        </button>

        {/* 2. Empty Filter - Stylish Colorful Button (image copy 44.png) */}
        <button
          type="button"
          className={`filter-pill-btn ${filterEmptyOnly ? 'pill-empty-active' : 'pill-empty-inactive'}`}
          onClick={() => setFilterEmptyOnly(!filterEmptyOnly)}
          id="inventory-filter-empty"
        >
          <Check size={14} strokeWidth={filterEmptyOnly ? 3 : 2.5} />
          <span>Empty</span>
        </button>

        {/* 3. Validity Filter */}
        <button
          type="button"
          className="filter-pill-btn glossy-btn-green"
          onClick={cycleValidityFilter}
          id="inventory-filter-validity"
          title={`Filter: ${selectedValidity}`}
        >
          <Calendar size={14} />
          <span>{selectedValidity === 'all' ? 'Validity' : selectedValidity.replace(' Months', 'M').replace(' Month', 'M')}</span>
        </button>

        {/* 4. Top/Bottom Sort Toggle */}
        <button
          type="button"
          className="filter-pill-btn glossy-btn-purple"
          onClick={toggleSortOrder}
          id="inventory-filter-sort"
          title={`Sorting: ${sortOrder === 'top' ? 'Top to Bottom (01 first)' : 'Bottom to Top'}`}
        >
          <ArrowUpDown size={14} />
          <span>{sortOrder === 'top' ? 'Top' : 'Bottom'}</span>
        </button>
      </div>

      {/* Search & Add Account Button Row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${filteredItems.length} accounts by email...`}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: '12px',
              border: '1.5px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="glossy-btn glossy-btn-green"
            style={{ padding: '10px 12px', fontSize: '13px', whiteSpace: 'nowrap', borderRadius: '12px' }}
            onClick={handleSyncFromSheet}
            title="Refresh accounts directly from Google Sheet"
            id="inventory-sync-sheet-btn"
          >
            <RefreshCw size={15} /> Sync
          </button>
          <button
            type="button"
            className="glossy-btn glossy-btn-blue"
            style={{ padding: '10px 14px', fontSize: '13px', whiteSpace: 'nowrap', borderRadius: '12px' }}
            onClick={() => setShowAddAccountModal(true)}
            id="inventory-add-account-btn"
          >
            <Plus size={16} /> Add Account
          </button>
        </div>
      </div>

      {/* Inventory Cards List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          Loading {currentBrand.displayName} accounts...
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
            No accounts found for {currentBrand.displayName}.
          </p>
          <button
            type="button"
            className="glossy-btn glossy-btn-blue"
            style={{ padding: '8px 16px', fontSize: '13px' }}
            onClick={() => setShowAddAccountModal(true)}
          >
            <Plus size={14} /> Add First Account
          </button>
        </div>
      ) : (
        filteredItems.map(item => {
          const isEditing = !!editingCards[item.id];
          const editState = editingCards[item.id] || {};
          const isPassVisible = !!visiblePasswords[item.id];
          const freeCount = (item.screens || []).filter(s => s.status === 'empty').length;
          const totalScreens = item.screens?.length || (currentBrand?.screensCount || 5);

          const isExpanded = expandedAccounts[item.id] !== undefined
            ? expandedAccounts[item.id]
            : (Boolean(item.defaultExpanded) || isEditing);

          return (
            <div key={item.id} className="inventory-card" id={`inventory-card-${item.recordNumber}`}>
              {/* Top Row: Ribbon Tag (E Number), Plan Variant, Password Alert, Screen Count Summary, Validity Badge, Checkbox */}
              <div className="card-top-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* FEATURE 1: Editable E Number badge */}
                  {!isEditing ? (
                    <div
                      className="ribbon-badge"
                      style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: '#ffffff',
                        fontWeight: 900,
                        fontSize: '13.5px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        minWidth: '34px',
                        textAlign: 'center',
                        boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none'
                      }}
                      title="E Number (Click Edit (UnLock) to modify)"
                    >
                      {String(parseInt(item.recordNumber || '1', 10) || 1).padStart(2, '0')}
                    </div>
                  ) : (
                    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column' }}>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editState.recordNumber !== undefined ? editState.recordNumber : (parseInt(item.recordNumber || '1', 10) || 1)}
                        onChange={(e) => {
                          const val = e.target.value;
                          const num = Number(val);
                          const isInvalid = !val || isNaN(num) || num <= 0 || !Number.isInteger(num);
                          setEditingCards(prev => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              recordNumber: val,
                              recordNumberError: isInvalid ? 'Positive integer only' : null
                            }
                          }));
                        }}
                        style={{
                          width: '46px',
                          height: '28px',
                          background: '#ffffff',
                          color: '#dc2626',
                          border: editState.recordNumberError ? '2px solid #b91c1c' : '2px solid #ef4444',
                          borderRadius: '8px',
                          textAlign: 'center',
                          fontSize: '13.5px',
                          fontWeight: 900,
                          outline: 'none',
                          boxShadow: editState.recordNumberError ? '0 0 0 2px rgba(220, 38, 38, 0.3)' : '0 2px 6px rgba(239, 68, 68, 0.25)',
                          boxSizing: 'border-box'
                        }}
                        title="Edit E Number (Positive whole numbers only)"
                        id={`account-${item.id}-enumber-input`}
                      />
                      {editState.recordNumberError && (
                        <span style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          fontSize: '9px',
                          color: '#dc2626',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          background: '#fee2e2',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          zIndex: 10,
                          marginTop: '2px',
                          border: '1px solid #fca5a5'
                        }}>
                          {editState.recordNumberError}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Password Change Required Reminder Badge (Section 7) */}
                  {item.passwordChangeRequired && (
                    <div
                      style={{
                        background: '#fee2e2',
                        border: '1.5px solid #f87171',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 900,
                        color: '#b91c1c',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 1px 3px rgba(220, 38, 38, 0.15)'
                      }}
                      title="Expiry notification completed. Password change required."
                    >
                      <AlertTriangle size={12} color="#dc2626" strokeWidth={2.5} />
                      <span>Password Change Required</span>
                    </div>
                  )}

                  {/* Plan Variant Badge: Only show if special (not General) or if editing per user requirement */}
                  {(isEditing || (item.planVariant && item.planVariant !== 'General')) && (
                    <div
                      className="badge-plan-variant"
                      onClick={() => handleCyclePlanVariant(item)}
                      style={{
                        cursor: 'pointer',
                        userSelect: 'none',
                        padding: '3px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 800,
                        background: ((isEditing ? editState.planVariant : item.planVariant) || 'General') === 'General' ? '#f1f5f9' : '#eff6ff',
                        color: ((isEditing ? editState.planVariant : item.planVariant) || 'General') === 'General' ? '#475569' : '#1d4ed8',
                        border: '1.5px solid',
                        borderColor: ((isEditing ? editState.planVariant : item.planVariant) || 'General') === 'General' ? '#cbd5e1' : '#93c5fd',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease'
                      }}
                      title="Click to cycle plan variant (General, With Ads, Ads Free...)"
                    >
                      <Sparkles size={12} color={((isEditing ? editState.planVariant : item.planVariant) || 'General') === 'General' ? '#64748b' : '#2563eb'} />
                      <span>{(isEditing ? editState.planVariant : item.planVariant) || 'General'}</span>
                    </div>
                  )}
                </div>

                <div className="card-top-right">
                  {/* Account Status Badge (Active / Expired) - Replaces Default ON/OFF */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isEditing) return; // Read-only while locked
                        const currentStat = getComputedAccountStatus(item, editState.status);
                        const nextStat = currentStat === 'Active' ? 'Expired' : 'Active';
                        setEditingCards(prev => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], status: nextStat }
                        }));
                      }}
                      style={{
                        background: getComputedAccountStatus(item, editState.status) === 'Active' ? '#dcfce7' : '#fee2e2',
                        border: `1.5px solid ${getComputedAccountStatus(item, editState.status) === 'Active' ? '#86efac' : '#fca5a5'}`,
                        color: getComputedAccountStatus(item, editState.status) === 'Active' ? '#15803d' : '#b91c1c',
                        borderRadius: '8px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: isEditing ? 'pointer' : 'default',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease'
                      }}
                      title={isEditing ? `Click to switch status (Currently: ${getComputedAccountStatus(item, editState.status)})` : `Account Status: ${getComputedAccountStatus(item, editState.status)} (Unlock to edit)`}
                      id={`account-${item.recordNumber}-status-badge`}
                    >
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: getComputedAccountStatus(item, editState.status) === 'Active' ? '#16a34a' : '#dc2626'
                      }} />
                      <span>{getComputedAccountStatus(item, editState.status)}</span>
                    </button>

                    {isEditing && (editState.status !== undefined || item.manualStatus) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCards(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], status: null }
                          }));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '0 2px',
                          fontSize: '9.5px',
                          color: '#2563eb',
                          fontWeight: 700,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                        title="Clear manual override and restore automatic calculation from Seller Details account expiry date"
                      >
                        Use expiry date
                      </button>
                    )}
                  </div>

                  {/* Expand / Collapse Control Button (Section 9) */}
                  <button
                    type="button"
                    onClick={() => handleToggleAccountExpand(item.id)}
                    style={{
                      background: isExpanded ? '#eff6ff' : '#f8fafc',
                      border: isExpanded ? '1.5px solid #93c5fd' : '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '3px 8px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: isExpanded ? '#1d4ed8' : '#475569',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}
                    title={isExpanded ? 'Collapse screens' : 'Expand screens'}
                    id={`account-${item.recordNumber}-expand-toggle`}
                  >
                    <span>{totalScreens > 0 ? `${totalScreens - freeCount}/${totalScreens}` : 'Full'}</span>
                    {isExpanded ? <ChevronUp size={13} strokeWidth={2.5} /> : <ChevronDown size={13} strokeWidth={2.5} />}
                  </button>

                  <div
                    className="badge-navy-pill"
                    onClick={() => handleCycleValidity(item)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to cycle validity"
                  >
                    {isEditing ? (editState.validity || item.validity) : item.validity}
                  </div>

                  <div
                    className={`custom-checkbox ${item.isSelected ? 'checked' : ''}`}
                    onClick={(e) => handleToggleSelect(item.id, e)}
                    title="Select account"
                  >
                    {item.isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              </div>

              {/* ID Row with Copy button */}
              <div className="credential-row">
                <div className="credential-label-badge blue">
                  ID
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    className="credential-input"
                    value={isEditing ? editState.email : item.email}
                    readOnly={!isEditing}
                    onChange={(e) => {
                      setEditingCards(prev => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], email: e.target.value }
                      }));
                    }}
                    style={{ paddingRight: '40px', fontWeight: 700 }}
                  />
                  <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}>
                    <CopyButton text={item.email} />
                  </div>
                </div>
              </div>

              {/* Collapsible Details: Password, PINs, Screens Grid, and Action Buttons (Section 9) */}
              {(isExpanded || isEditing) && (
                <>
                  {/* Password Row with reveal toggle & Copy button */}
                  <div className="credential-row">
                <div className="credential-label-badge purple">
                  Password
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type={isPassVisible || isEditing ? 'text' : 'password'}
                    className="credential-input"
                    value={isEditing ? editState.password : item.password}
                    readOnly={!isEditing}
                    onChange={(e) => {
                      setEditingCards(prev => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], password: e.target.value }
                      }));
                    }}
                    style={{ paddingRight: '70px', fontWeight: 700 }}
                  />
                  <div style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(item.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
                      title="Reveal password"
                    >
                      {isPassVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <CopyButton text={item.password} />
                  </div>
                </div>
              </div>

              {/* Dynamic Screen Count & Grouping by 5 or Horizontal Scroll */}
              {(() => {
                const screensList = item.screens || [];
                const isGroupedBy5 = currentBrand?.groupScreensBy5 !== false;
                const groupSize = 5;

                // Group screens: if grouped by 5, slice into groups of 5; if OFF, single group with all screens
                const groups = isGroupedBy5
                  ? Array.from({ length: Math.ceil(screensList.length / groupSize) || 1 }, (_, gIdx) =>
                      screensList.slice(gIdx * groupSize, (gIdx + 1) * groupSize).map((screen, idx) => ({
                        screen,
                        globalIdx: gIdx * groupSize + idx
                      }))
                    )
                  : [screensList.map((screen, idx) => ({ screen, globalIdx: idx }))];

                const renderGroupContent = (groupScreens) => {
                  const gridStyle = isGroupedBy5
                    ? { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', alignItems: 'center' }
                    : { display: 'grid', gridTemplateColumns: `repeat(${screensList.length}, minmax(68px, 1fr))`, gap: '6px', alignItems: 'center', width: 'max-content', minWidth: '100%' };

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {/* 1. Screen PINs row (only when Screen PIN is ON) */}
                      {currentBrand?.showScreenPin !== false && (
                        <div style={gridStyle}>
                          {groupScreens.map(({ screen, globalIdx }) => {
                            const pinVal = isEditing ? (editState.pins?.[globalIdx] ?? screen.pin) : (screen.pin || '1234');
                            return (
                              <div
                                key={globalIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: '#e2e8f0',
                                  padding: '5px 2px',
                                  borderRadius: '8px',
                                  border: '1.5px solid #94a3b8',
                                  minHeight: '26px',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {isEditing ? (
                                  <input
                                    type="text"
                                    maxLength={6}
                                    value={pinVal}
                                    onChange={(e) => {
                                      const newPins = [...(editState.pins || screensList.map(s => s.pin || '1234'))];
                                      newPins[globalIdx] = e.target.value;
                                      setEditingCards(prev => ({
                                        ...prev,
                                        [item.id]: { ...prev[item.id], pins: newPins }
                                      }));
                                    }}
                                    style={{
                                      width: '100%',
                                      fontSize: '12px',
                                      textAlign: 'center',
                                      border: 'none',
                                      background: 'transparent',
                                      fontWeight: 800,
                                      outline: 'none',
                                      padding: 0
                                    }}
                                  />
                                ) : (
                                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.4px' }}>
                                    {pinVal}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 2. Screen Buttons row (Screen number/button) */}
                      <div style={gridStyle}>
                        {groupScreens.map(({ screen, globalIdx }) => {
                          const devType = isEditing
                            ? (editState.deviceTypes?.[globalIdx] || screen.deviceType || 'tv')
                            : (screen.deviceType || 'tv');

                          const currentExpDate = isEditing
                            ? (editState.dates?.[globalIdx] !== undefined ? editState.dates[globalIdx] : screen.expiryDate)
                            : screen.expiryDate;
                          const isEmpty = isEditing
                            ? (!currentExpDate || !String(currentExpDate).trim())
                            : (screen.status === 'empty' && !currentExpDate);

                          return (
                            <div
                              key={globalIdx}
                              onClick={(e) => {
                                if (isEditing) {
                                  handleCycleDeviceType(item.id, globalIdx, e);
                                  return;
                                }
                                if (isEmpty && onNavigateToSaleWithSlot) {
                                  const screenNumStr = String(globalIdx + 1).padStart(2, '0');
                                  onNavigateToSaleWithSlot({
                                    brandId: currentBrand?.id || item.brandId,
                                    brandName: currentBrand?.displayName || currentBrand?.name || item.brandName,
                                    inventoryId: item.id,
                                    accountId: item.id,
                                    email: item.email || '',
                                    accountEmail: item.email || '',
                                    password: item.password || '',
                                    accountPassword: item.password || '',
                                    screenNumber: screenNumStr,
                                    screenName: `Screen-${screenNumStr}`,
                                    pin: screen.pin !== undefined && screen.pin !== null ? String(screen.pin) : '',
                                    screenPin: screen.pin !== undefined && screen.pin !== null ? String(screen.pin) : '',
                                    deviceName: screen.deviceName || '',
                                    validity: item.validity || ''
                                  });
                                }
                              }}
                              style={{
                                background: '#ea580c',
                                color: '#ffffff',
                                borderRadius: '8px',
                                padding: '5px 2px',
                                textAlign: 'center',
                                boxShadow: '0 2px 4px rgba(234,88,12,0.25)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2px',
                                cursor: (isEditing || (isEmpty && onNavigateToSaleWithSlot)) ? 'pointer' : 'default',
                                userSelect: 'none',
                                lineHeight: 1,
                                boxSizing: 'border-box'
                              }}
                              title={isEditing ? `Click to cycle device icon (Current: ${devType.toUpperCase()})` : (isEmpty && onNavigateToSaleWithSlot ? `Screen-${String(globalIdx + 1).padStart(2, '0')}: Click to select for sale` : `Screen ${globalIdx + 1}`)}
                            >
                              <span style={{ fontSize: '10.5px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                Screen-{String(globalIdx + 1).padStart(2, '0')}
                              </span>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: isEditing ? '2px 4px' : '0',
                                borderRadius: '4px',
                                background: isEditing ? 'rgba(0,0,0,0.2)' : 'transparent'
                              }}>
                                {devType === 'mobile' ? (
                                  <Smartphone size={15} strokeWidth={2.5} />
                                ) : devType === 'laptop' ? (
                                  <Laptop size={15} strokeWidth={2.5} />
                                ) : (
                                  <Tv size={15} strokeWidth={2.5} />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* 3. Screen Expiry / Customer Details row (retains empty "+" action) */}
                      <div style={gridStyle}>
                        {groupScreens.map(({ screen, globalIdx }) => {
                          const currentExpDate = isEditing
                            ? (editState.dates?.[globalIdx] !== undefined ? editState.dates[globalIdx] : screen.expiryDate)
                            : screen.expiryDate;
                          const isEmpty = isEditing
                            ? (!currentExpDate || !String(currentExpDate).trim())
                            : (screen.status === 'empty' && !currentExpDate);

                          const statusObj = getExpiryStatus(currentExpDate);
                          const isExpiredOrCritical = statusObj.status === 'expired' || statusObj.status === 'today' || statusObj.status === 'critical';
                          const isUpcoming = statusObj.status === 'upcoming';

                          return (
                            <div
                              key={globalIdx}
                              onClick={() => {
                                if (isEmpty && !isEditing) {
                                  if (onNavigateToSaleWithSlot) {
                                    const screenNumStr = String(globalIdx + 1).padStart(2, '0');
                                    onNavigateToSaleWithSlot({
                                      brandId: currentBrand?.id || item.brandId,
                                      brandName: currentBrand?.displayName || currentBrand?.name || item.brandName,
                                      inventoryId: item.id,
                                      accountId: item.id,
                                      email: item.email || '',
                                      accountEmail: item.email || '',
                                      password: item.password || '',
                                      accountPassword: item.password || '',
                                      screenNumber: screenNumStr,
                                      screenName: `Screen-${screenNumStr}`,
                                      pin: screen.pin !== undefined && screen.pin !== null ? String(screen.pin) : '',
                                      screenPin: screen.pin !== undefined && screen.pin !== null ? String(screen.pin) : '',
                                      deviceName: screen.deviceName || '',
                                      validity: item.validity || ''
                                    });
                                    return;
                                  }
                                }
                                if (!isEmpty && !isEditing) {
                                  handleOpenSoldScreenDetails(item, screen, globalIdx);
                                  return;
                                }
                                setScreenDateModal({
                                  itemId: item.id,
                                  screenIndex: globalIdx,
                                  currentDate: currentExpDate || ''
                                });
                              }}
                              style={{
                                height: '34px',
                                minHeight: '34px',
                                maxHeight: '34px',
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '0 2px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: isEmpty ? '18px' : '9.5px',
                                fontWeight: 900,
                                cursor: 'pointer',
                                background: isEmpty ? '#f8fafc' : (isExpiredOrCritical ? '#dc2626' : (isUpcoming ? '#ea580c' : '#15803d')),
                                color: isEmpty ? '#475569' : '#ffffff',
                                border: isEmpty ? '2px dashed #64748b' : (isExpiredOrCritical ? '2px solid #b91c1c' : (isUpcoming ? '2px solid #c2410c' : '2px solid #166534')),
                                boxShadow: isEmpty ? 'none' : '0 2px 4px rgba(0,0,0,0.14)',
                                overflow: 'hidden',
                                lineHeight: 1
                              }}
                              title={currentExpDate ? `Expires: ${currentExpDate}. Click to view or change.` : `Screen-${String(globalIdx + 1).padStart(2, '0')}: Click '+' to assign sale`}
                            >
                              {isEmpty ? '+' : (() => {
                                const parts = String(currentExpDate).split('-');
                                if (parts.length === 3) {
                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.08 }}>
                                      <span style={{ fontSize: '9.5px', fontWeight: 900 }}>{parts[0]}-{parts[1]}</span>
                                      <span style={{ fontSize: '9px', fontWeight: 800, opacity: 0.95 }}>{parts[2]}</span>
                                    </div>
                                  );
                                }
                                return currentExpDate;
                              })()}
                            </div>
                          );
                        })}
                      </div>

                      {/* 4. Device Name row (only when Device Name is ON) */}
                      {currentBrand?.showDeviceName !== false && (
                        <div style={gridStyle}>
                          {groupScreens.map(({ screen, globalIdx }) => {
                            const devNameVal = isEditing
                              ? (editState.deviceNames?.[globalIdx] !== undefined ? editState.deviceNames[globalIdx] : (screen.deviceName || ''))
                              : (screen.deviceName || '');

                            return (
                              <div key={globalIdx} style={{ width: '100%', boxSizing: 'border-box' }}>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    placeholder="Device name"
                                    value={devNameVal}
                                    onChange={(e) => {
                                      const newNames = [...(editState.deviceNames || screensList.map(s => s.deviceName || ''))];
                                      newNames[globalIdx] = e.target.value;
                                      setEditingCards(prev => ({
                                        ...prev,
                                        [item.id]: { ...prev[item.id], deviceNames: newNames }
                                      }));
                                    }}
                                    style={{
                                      height: '28px',
                                      minHeight: '28px',
                                      width: '100%',
                                      boxSizing: 'border-box',
                                      padding: '0 6px',
                                      borderRadius: '6px',
                                      fontSize: '10.5px',
                                      fontWeight: 700,
                                      background: '#ffffff',
                                      color: '#0f172a',
                                      border: '1.5px solid #93c5fd',
                                      outline: 'none',
                                      textAlign: 'left'
                                    }}
                                    title={`Screen-${String(globalIdx + 1).padStart(2, '0')} Device Name`}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      height: '28px',
                                      minHeight: '28px',
                                      boxSizing: 'border-box',
                                      padding: '0 6px',
                                      borderRadius: '6px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'flex-start',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      background: devNameVal ? '#f0fdf4' : '#f8fafc',
                                      color: devNameVal ? '#166534' : '#94a3b8',
                                      border: devNameVal ? '1.5px solid #86efac' : '1.5px solid #e2e8f0',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      textAlign: 'left'
                                    }}
                                    title={devNameVal ? `Device: ${devNameVal}` : 'No device name'}
                                  >
                                    {devNameVal || '-'}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                };

                if (isGroupedBy5) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                      {groups.map((groupScreens, gIdx) => (
                        <div key={gIdx}>
                          {renderGroupContent(groupScreens)}
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div
                    className="screens-scroll-container"
                    style={{
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      paddingBottom: '8px',
                      marginTop: '10px',
                      WebkitOverflowScrolling: 'touch'
                    }}
                  >
                    <div style={{ width: 'max-content', minWidth: '100%' }}>
                      {renderGroupContent(groups[0])}
                    </div>
                  </div>
                );
              })()}

              {/* Bottom Action Buttons: [ Edit (Unlock) ] [ ⭐ ] [ Save ] */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '12px'
              }}>
                {/* 1. Edit (Unlock) */}
                <button
                  type="button"
                  className={`glossy-btn ${isEditing ? 'glossy-btn-orange' : 'glossy-btn-blue'}`}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '10px 8px',
                    fontSize: '13px',
                    borderRadius: '10px',
                    justifyContent: 'center'
                  }}
                  onClick={() => handleToggleLock(item)}
                >
                  {isEditing ? <Unlock size={15} /> : <Lock size={15} />}
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isEditing ? 'Lock' : 'Edit (UnLock)'}
                  </span>
                </button>

                {/* 2. Star Button (Account Details & Change History Modal - Feature Four) */}
                <button
                  type="button"
                  onClick={() => setStarModalItem(item)}
                  style={{
                    width: '42px',
                    height: '40px',
                    minWidth: '42px',
                    borderRadius: '10px',
                    background: (item.sellerDetails || (item.credentialHistory && item.credentialHistory.length > 0)) ? '#fefce8' : '#ffffff',
                    border: (item.sellerDetails || (item.credentialHistory && item.credentialHistory.length > 0)) ? '1.5px solid #eab308' : '1.5px solid #cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'all 0.15s ease',
                    padding: 0
                  }}
                  title="Account Details & Change History"
                >
                  <Star
                    size={18}
                    color="#eab308"
                    fill={(item.sellerDetails || (item.credentialHistory && item.credentialHistory.length > 0)) ? '#eab308' : '#fde047'}
                  />
                </button>

                {/* 3. Save */}
                <button
                  type="button"
                  className="glossy-btn glossy-btn-green"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '10px 8px',
                    fontSize: '13px',
                    borderRadius: '10px',
                    justifyContent: 'center'
                  }}
                  onClick={() => handleSaveCard(item)}
                >
                  <Save size={15} />
                  <span>Save</span>
                </button>

                {/* Subtle Delete when in edit mode */}
                {isEditing && (
                  <button
                    type="button"
                    className="glossy-btn glossy-btn-red"
                    style={{
                      width: '40px',
                      height: '40px',
                      minWidth: '40px',
                      padding: 0,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => setDeleteConfirmItem(item)}
                    title="Delete account"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      );
        })
      )}

      {/* ======================================================== */}
      {/* ADD ACCOUNT POPUP - EXACT SAME STYLE AS AVAILABLE CARD   */}
      {/* Centered in the middle of mobile screen (image copy 57/58)*/}
      {/* ======================================================== */}
      {showAddAccountModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            overflowY: 'auto'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddAccountModal(false);
          }}
        >
          <div
            className="inventory-card"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '430px',
              padding: '14px',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
              margin: 'auto 0'
            }}
          >
            {/* Top Row: Ribbon Badge, Plan Variant, Validity, Close X */}
            <div className="card-top-row">
              <div className="ribbon-badge">
                {String(items.length + 1).padStart(2, '0')}
              </div>

              {/* Plan Variant Badge (Clickable to cycle) */}
              <div
                className="badge-plan-variant"
                onClick={() => {
                  const plans = ['General', 'With Ads', 'Ads Free'];
                  const curIdx = plans.indexOf(newPlanVariant);
                  setNewPlanVariant(plans[(curIdx + 1) % plans.length]);
                }}
                style={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  padding: '3px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 800,
                  background: newPlanVariant === 'General' ? '#f1f5f9' : '#eff6ff',
                  color: newPlanVariant === 'General' ? '#475569' : '#1d4ed8',
                  border: '1.5px solid',
                  borderColor: newPlanVariant === 'General' ? '#cbd5e1' : '#93c5fd',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
                title="Click to cycle plan variant"
              >
                <Sparkles size={12} color={newPlanVariant === 'General' ? '#64748b' : '#2563eb'} />
                <span>{newPlanVariant}</span>
              </div>

              <div className="card-top-right">
                <div
                  className="badge-navy-pill"
                  onClick={() => {
                    const valids = ['01 Month', '03 Months', '06 Months', '12 Months'];
                    const curIdx = valids.indexOf(newValidity);
                    setNewValidity(valids[(curIdx + 1) % valids.length]);
                  }}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to cycle validity"
                >
                  {newValidity}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b'
                  }}
                  title="Close"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ID Row: blue badge + empty input */}
            <div className="credential-row">
              <div className="credential-label-badge blue">
                ID
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="email"
                  className="credential-input"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="e.g. netflix.user03@gmail.com"
                  style={{ fontWeight: 700 }}
                  required
                />
              </div>
            </div>

            {/* Password Row: purple badge + empty input + show/hide eye */}
            <div className="credential-row">
              <div className="credential-label-badge purple">
                Password
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type={newPassVisible ? 'text' : 'password'}
                  className="credential-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="e.g. Pass@123456"
                  style={{ paddingRight: '40px', fontWeight: 700 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setNewPassVisible(!newPassVisible)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b'
                  }}
                  title="Toggle password visibility"
                >
                  {newPassVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Dynamic Screens in Add Account Modal */}
            {(() => {
              const count = newScreenCount;
              const isGrouped = currentBrand?.groupScreensBy5 !== false;
              const groupSize = 5;
              const indices = Array.from({ length: count }, (_, i) => i);

              const groups = isGrouped
                ? Array.from({ length: Math.ceil(count / groupSize) || 1 }, (_, gIdx) =>
                    indices.slice(gIdx * groupSize, (gIdx + 1) * groupSize)
                  )
                : [indices];

              const renderAddModalGroup = (grpIndices) => {
                const gridStyle = isGrouped
                  ? { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', alignItems: 'center' }
                  : { display: 'grid', gridTemplateColumns: `repeat(${count}, minmax(68px, 1fr))`, gap: '6px', alignItems: 'center', width: 'max-content', minWidth: '100%' };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Screen PINs row (only if brand allows Screen PIN) */}
                    {currentBrand?.showScreenPin !== false && (
                      <div style={gridStyle}>
                        {grpIndices.map(sIdx => (
                          <div
                            key={sIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#f1f5f9',
                              padding: '5px 2px',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              minHeight: '26px',
                              boxSizing: 'border-box'
                            }}
                          >
                            <input
                              type="text"
                              maxLength={6}
                              value={newScreenPins[sIdx] || ''}
                              onChange={e => {
                                const updated = [...newScreenPins];
                                updated[sIdx] = e.target.value;
                                setNewScreenPins(updated);
                              }}
                              style={{
                                width: '100%',
                                fontSize: '12px',
                                textAlign: 'center',
                                border: 'none',
                                background: 'transparent',
                                fontWeight: 800,
                                outline: 'none',
                                padding: 0
                              }}
                              title={`Screen-${String(sIdx + 1).padStart(2, '0')} PIN`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Screen Buttons row (Screen name on top, TV icon below) */}
                    <div style={gridStyle}>
                      {grpIndices.map(sIdx => (
                        <div
                          key={sIdx}
                          style={{
                            background: '#ea580c',
                            color: '#ffffff',
                            borderRadius: '8px',
                            padding: '5px 2px',
                            textAlign: 'center',
                            boxShadow: '0 2px 4px rgba(234,88,12,0.25)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            lineHeight: 1,
                            boxSizing: 'border-box'
                          }}
                        >
                          <span style={{ fontSize: '10.5px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                            Screen-{String(sIdx + 1).padStart(2, '0')}
                          </span>
                          <Tv size={15} strokeWidth={2.5} />
                        </div>
                      ))}
                    </div>

                    {/* Status Empty Boxes Row ('+' boxes) */}
                    <div style={gridStyle}>
                      {grpIndices.map(sIdx => (
                        <div
                          key={sIdx}
                          style={{
                            height: '34px',
                            minHeight: '34px',
                            maxHeight: '34px',
                            width: '100%',
                            boxSizing: 'border-box',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: 900,
                            background: '#ffffff',
                            color: '#64748b',
                            border: '2px dashed #94a3b8'
                          }}
                        >
                          +
                        </div>
                      ))}
                    </div>

                    {/* Device Name input row (when Device Name is ON) */}
                    {currentBrand?.showDeviceName !== false && (
                      <div style={gridStyle}>
                        {grpIndices.map(sIdx => (
                          <div key={sIdx} style={{ width: '100%', boxSizing: 'border-box' }}>
                            <input
                              type="text"
                              placeholder="Device name"
                              value={newDeviceNames[sIdx] || ''}
                              onChange={e => {
                                const updated = [...newDeviceNames];
                                updated[sIdx] = e.target.value;
                                setNewDeviceNames(updated);
                              }}
                              style={{
                                height: '28px',
                                minHeight: '28px',
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '0 4px',
                                borderRadius: '6px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                background: '#ffffff',
                                color: '#0f172a',
                                border: '1.5px solid #93c5fd',
                                outline: 'none',
                                textAlign: 'center'
                              }}
                              title={`Screen-${String(sIdx + 1).padStart(2, '0')} Device Name`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              };

              if (isGrouped) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                    {groups.map((grpIndices, gIdx) => (
                      <div key={gIdx}>
                        {renderAddModalGroup(grpIndices)}
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div
                  className="screens-scroll-container"
                  style={{
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    paddingBottom: '8px',
                    marginTop: '10px',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  <div style={{ width: 'max-content', minWidth: '100%' }}>
                    {renderAddModalGroup(groups[0])}
                  </div>
                </div>
              );
            })()}

            {/* Bottom 2 Action Buttons: Cancel and Save */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.5fr',
              gap: '10px',
              marginTop: '14px'
            }}>
              <button
                type="button"
                className="glossy-btn glossy-btn-gray"
                style={{ padding: '10px 12px', fontSize: '14px', borderRadius: '10px' }}
                onClick={() => setShowAddAccountModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="glossy-btn glossy-btn-green"
                style={{ padding: '10px 12px', fontSize: '14px', borderRadius: '10px' }}
                onClick={handleCreateAccount}
                id="modal-save-new-account-btn"
              >
                <Save size={16} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirmItem(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', padding: '24px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Delete Account?
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
              Are you sure you want to remove <strong>{deleteConfirmItem.email}</strong>? Historical sales will be preserved.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="glossy-btn glossy-btn-gray"
                style={{ flex: 1, padding: '10px', borderRadius: '10px' }}
                onClick={() => setDeleteConfirmItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="glossy-btn glossy-btn-red"
                style={{ flex: 1, padding: '10px', borderRadius: '10px' }}
                onClick={handleDeleteCard}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen Expiry Date Picker Modal for unlocked editing */}
      {screenDateModal && (
        <DatePickerModal
          isOpen={true}
          initialDate={screenDateModal.currentDate || ''}
          onSelect={async (selectedDate) => {
            const { itemId, screenIndex } = screenDateModal;
            if (editingCards[itemId]) {
              setEditingCards(prev => {
                const currentEdit = prev[itemId] || {};
                const currentDates = [...(currentEdit.dates || [])];
                currentDates[screenIndex] = selectedDate;
                return {
                  ...prev,
                  [itemId]: { ...currentEdit, dates: currentDates }
                };
              });
              setScreenDateModal(null);
              showToast(`Screen ${screenIndex + 1} expiry set to ${selectedDate} (Click Save)`, 'info');
            } else {
              // Direct immediate save to Supabase!
              try {
                const targetItem = items.find(i => i.id === itemId);
                if (targetItem) {
                  const updatedScreens = (targetItem.screens || []).map((s, idx) => {
                    if (idx === screenIndex) {
                      return {
                        ...s,
                        expiryDate: selectedDate,
                        status: selectedDate ? 'occupied' : 'empty'
                      };
                    }
                    return s;
                  });
                  const res = await api.updateInventory(itemId, { screens: updatedScreens });
                  setItems(prev => prev.map(i => i.id === itemId ? res : i));
                  showToast(`Screen ${screenIndex + 1} expiry updated to ${selectedDate} & saved!`, 'success');
                }
              } catch (err) {
                showToast('Failed to save date: ' + err.message, 'error');
              }
              setScreenDateModal(null);
            }
          }}
          onClearDate={async () => {
            const { itemId, screenIndex } = screenDateModal;
            if (editingCards[itemId]) {
              setEditingCards(prev => {
                const currentEdit = prev[itemId] || {};
                const currentDates = [...(currentEdit.dates || [])];
                currentDates[screenIndex] = '';
                return {
                  ...prev,
                  [itemId]: { ...currentEdit, dates: currentDates }
                };
              });
              setScreenDateModal(null);
              showToast(`Screen ${screenIndex + 1} expiry cleared`, 'info');
            } else {
              try {
                const targetItem = items.find(i => i.id === itemId);
                if (targetItem) {
                  const updatedScreens = (targetItem.screens || []).map((s, idx) => {
                    if (idx === screenIndex) {
                      return {
                        ...s,
                        expiryDate: null,
                        status: 'empty'
                      };
                    }
                    return s;
                  });
                  const res = await api.updateInventory(itemId, { screens: updatedScreens });
                  setItems(prev => prev.map(i => i.id === itemId ? res : i));
                  showToast(`Screen ${screenIndex + 1} expiry cleared & reset to empty`, 'success');
                }
              } catch (err) {
                showToast('Failed to clear date: ' + err.message, 'error');
              }
              setScreenDateModal(null);
            }
          }}
          onClose={() => setScreenDateModal(null)}
        />
      )}

      {/* User Details Short Popup (Exact matching image copy 70.png) */}
      {userDetailsModal && (
        <div
          className="modal-backdrop"
          onClick={() => setUserDetailsModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              background: '#ffffff',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              animation: 'slideUp 0.2s ease-out'
            }}
          >
            {/* Dark blue Header bar matching image copy 70.png */}
            <div style={{
              background: '#1d3557',
              color: '#ffffff',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ width: '24px' }} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, textAlign: 'center', flex: 1, color: '#ffffff' }}>
                User Details
              </h3>
              <button
                type="button"
                onClick={() => setUserDetailsModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Content Form matching image copy 70.png */}
            <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Row 1: Name, Number, Sold */}
              <div style={{ display: 'grid', gridTemplateColumns: userDetailsModal.sold ? '1fr 1.2fr 0.9fr' : '1fr 1.2fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Name</div>
                  <div style={{
                    background: '#1d4ed8',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    fontWeight: 900,
                    fontSize: '13px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(29, 78, 216, 0.25)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {userDetailsModal.name || 'Bharath'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Number</div>
                  <div style={{
                    background: '#1d4ed8',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '8px 8px 8px 10px',
                    fontWeight: 900,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 4px rgba(29, 78, 216, 0.25)'
                  }}>
                    <span style={{ letterSpacing: '0.3px' }}>{userDetailsModal.number || '9059542610'}</span>
                    <CopyButton text={userDetailsModal.number} size={13} color="#ffffff" showLabelOnCopy={false} />
                  </div>
                </div>

                {userDetailsModal.sold && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Sold</div>
                    <div style={{
                      background: '#475569',
                      color: '#ffffff',
                      borderRadius: '10px',
                      padding: '8px 6px',
                      fontWeight: 900,
                      fontSize: '12px',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {userDetailsModal.sold}
                    </div>
                  </div>
                )}
              </div>

              {/* Row 2: Plan (Validity), Activation, Expiry */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Plan</div>
                  <div style={{
                    background: '#ea580c',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '8px 4px',
                    fontWeight: 900,
                    fontSize: '12px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(234, 88, 12, 0.25)',
                    whiteSpace: 'nowrap'
                  }}>
                    {userDetailsModal.plan || '06 Months'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Activation</div>
                  <div style={{
                    background: '#15803d',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '8px 4px',
                    fontWeight: 900,
                    fontSize: '11.5px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(21, 128, 61, 0.25)',
                    whiteSpace: 'nowrap'
                  }}>
                    {userDetailsModal.activation || '27-Jul-2026'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Expiry</div>
                  <div style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '8px 4px',
                    fontWeight: 900,
                    fontSize: '11.5px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
                    whiteSpace: 'nowrap'
                  }}>
                    {userDetailsModal.expiry || '12-Mar-2027'}
                  </div>
                </div>
              </div>

              {/* Row 3: Amount & Device */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Amount</div>
                  <div style={{
                    background: '#7c3aed',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    fontWeight: 900,
                    fontSize: '13px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(124, 58, 237, 0.25)'
                  }}>
                    {userDetailsModal.amount || '₹ 799'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Device</div>
                  <div style={{
                    background: '#0891b2',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    fontWeight: 900,
                    fontSize: '12.5px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(8, 145, 178, 0.25)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {userDetailsModal.device || '-'}
                  </div>
                </div>
              </div>

              {/* Row 4: Ref Details (Always shown per user requirement, empty/'-' if not provided) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                padding: '8px 10px'
              }}>
                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b' }}>Ref Name</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>{userDetailsModal.refName || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b' }}>Ref Number</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>{userDetailsModal.refNumber || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SELLER DETAILS MODAL POPUP (Image Copy 127 Requirement)  */}
      {/* ======================================================== */}
      {sellerModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 12000,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !sellerSaving) {
              setSellerModalItem(null);
            }
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              maxWidth: '420px',
              width: '100%',
              maxHeight: '86vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              animation: 'modalSlideUp 0.18s ease-out'
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: '#fef9c3',
                    border: '1px solid #facc15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ca8a04'
                  }}
                >
                  <Star size={15} fill="#ca8a04" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>
                    Seller Details
                  </h3>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>
                    Account #{sellerModalItem.recordNumber || '01'} &bull; {currentBrand?.displayName || 'OTT'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSellerModalItem(null)}
                disabled={sellerSaving}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div
              style={{
                padding: '8px 10px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '7px',
                flex: '1 1 auto',
                minHeight: 0,
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y'
              }}
            >
              {sellerError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    color: '#b91c1c',
                    fontWeight: 600
                  }}
                >
                  {sellerError}
                </div>
              )}

              {/* A. Purchase Information */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#2563eb' }}>&bull;</span> A. Purchase Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={sellerFormData.purchaseDate}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, purchaseDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '11px',
                        height: '28px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                      Seller Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul OTT"
                      value={sellerFormData.sellerName}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, sellerName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '11px',
                        height: '28px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={sellerFormData.sellerNumber}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, sellerNumber: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '11px',
                        height: '28px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* B. Reference Information */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#0284c7' }}>&bull;</span> B. Reference Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={sellerFormData.referenceDate}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, referenceDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '11px',
                        height: '28px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                      Reference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Telegram / Friend"
                      value={sellerFormData.reference}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, reference: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '11px',
                        height: '28px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                      Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://t.me/..."
                      value={sellerFormData.link}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, link: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '11px',
                        height: '28px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* C. Payment / Card Information */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#059669' }}>&bull;</span> C. Payment / Card Information
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '6px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                      Card
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC 4242"
                      value={sellerFormData.card}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, card: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '11px',
                        height: '28px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                      Expiry
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      maxLength={5}
                      value={sellerFormData.expiry}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, expiry: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '11px',
                        height: '28px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                      CVV
                    </label>
                    <input
                      type="password"
                      placeholder="***"
                      maxLength={4}
                      value={sellerFormData.cvv}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, cvv: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '11px',
                        height: '28px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                        letterSpacing: '2px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="₹ Amount"
                      value={sellerFormData.amount}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, amount: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '11px',
                        height: '28px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* D. Additional Information */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: '#7c3aed' }}>&bull;</span> D. Additional Information
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', marginBottom: '2px' }}>
                    Note Box
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter seller contact details, replacement policies, or account notes..."
                    value={sellerFormData.notes}
                    onChange={(e) => setSellerFormData({ ...sellerFormData, notes: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '4px 6px',
                      fontSize: '11px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      background: '#ffffff',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions: [ Clear (if exists) ] [ Cancel ] [ Save Details ] */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                gap: '8px'
              }}
            >
              <div>
                {sellerModalItem.sellerDetails && (
                  <button
                    type="button"
                    onClick={handleClearSellerDetails}
                    disabled={sellerSaving}
                    style={{
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#dc2626',
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear Details
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setSellerModalItem(null)}
                  disabled={sellerSaving}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#475569',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSellerDetails}
                  disabled={sellerSaving}
                  className="glossy-btn glossy-btn-blue"
                  style={{
                    padding: '6px 14px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    borderRadius: '6px'
                  }}
                >
                  {sellerSaving ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Star Details & Credential Change History Modal */}
      {starModalItem && (
        <AccountStarDetailsModal
          isOpen={true}
          item={starModalItem}
          brand={currentBrand}
          onClose={() => setStarModalItem(null)}
          onOpenSellerDetails={(itemToEdit) => {
            setStarModalItem(null);
            handleOpenSellerDetails(itemToEdit);
          }}
          onToggleDefaultExpanded={handleToggleDefaultExpanded}
        />
      )}
    </div>
  );
}
