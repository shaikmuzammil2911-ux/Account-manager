const API_BASE = '/api';

export const api = {
  async getBrands() {
    const res = await fetch(`${API_BASE}/brands`);
    if (!res.ok) throw new Error('Failed to fetch brands');
    return res.json();
  },

  async getInventory(params = {}) {
    const query = new URLSearchParams();
    if (params.brandId) query.append('brandId', params.brandId);
    if (params.selectedOnly) query.append('selectedOnly', 'true');
    if (params.emptyOnly) query.append('emptyOnly', 'true');
    if (params.validity) query.append('validity', params.validity);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);

    const res = await fetch(`${API_BASE}/inventory?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch inventory');
    return res.json();
  },

  async createInventory(data) {
    const res = await fetch(`${API_BASE}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create inventory');
    return res.json();
  },

  async updateInventory(id, updates) {
    const res = await fetch(`${API_BASE}/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update inventory');
    return res.json();
  },

  async deleteInventory(id) {
    const res = await fetch(`${API_BASE}/inventory/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete inventory');
    return res.json();
  },

  async toggleInventoryLock(id) {
    const res = await fetch(`${API_BASE}/inventory/${id}/lock`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle lock');
    return res.json();
  },

  async toggleInventorySelect(id) {
    const res = await fetch(`${API_BASE}/inventory/${id}/select`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle selection');
    return res.json();
  },

  async getSales(params = {}) {
    const query = new URLSearchParams();
    if (params.brandId) query.append('brandId', params.brandId);
    if (params.validity) query.append('validity', params.validity);
    if (params.date) query.append('date', params.date);
    if (params.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE}/sales?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch sales');
    return res.json();
  },

  async createSale(saleData) {
    const res = await fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit sale');
    }
    return res.json();
  },

  async getExpiry(params = {}) {
    const query = new URLSearchParams();
    if (params.filter) query.append('filter', params.filter);
    if (params.brandId) query.append('brandId', params.brandId);

    const res = await fetch(`${API_BASE}/expiry?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch expiry list');
    return res.json();
  },

  async notifyCustomer(saleId) {
    const res = await fetch(`${API_BASE}/notify/${saleId}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to notify customer');
    return res.json();
  },

  async getStats() {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getSettings() {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async resetData() {
    const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset database');
    return res.json();
  }
};
