import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Request logger for API calls
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// Brands
app.get('/api/brands', (req, res) => {
  try {
    const brands = db.getBrands();
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/brands/:id', (req, res) => {
  try {
    const brand = db.getBrand(req.params.id);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });
    res.json(brand);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inventory
app.get('/api/inventory', (req, res) => {
  try {
    const { brandId, selectedOnly, emptyOnly, validity, sortOrder } = req.query;
    const items = db.getInventory({
      brandId,
      selectedOnly: selectedOnly === 'true',
      emptyOnly: emptyOnly === 'true',
      validity,
      sortOrder
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory', (req, res) => {
  try {
    const newItem = db.createInventory(req.body);
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory/:id', (req, res) => {
  try {
    const updated = db.updateInventory(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Inventory item not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory/:id', (req, res) => {
  try {
    const success = db.deleteInventory(req.params.id);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/:id/lock', (req, res) => {
  try {
    const updated = db.toggleInventoryLock(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Inventory item not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/:id/select', (req, res) => {
  try {
    const updated = db.toggleInventorySelect(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Inventory item not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sales
app.get('/api/sales', (req, res) => {
  try {
    const { brandId, date, validity, search } = req.query;
    const sales = db.getSales({ brandId, date, validity, search });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales', (req, res) => {
  try {
    const {
      brandId,
      validity,
      activationDate,
      expiryDate,
      customerName,
      customerNumber,
      accountEmail,
      accountPassword,
      screenNumber,
      screenPin,
      amount,
      deviceName,
      referenceName,
      referenceNumber,
      inventoryId
    } = req.body;

    if (!brandId || !validity || !activationDate || !customerName || !customerNumber) {
      return res.status(400).json({
        error: 'Missing required fields: brandId, validity, activationDate, customerName, customerNumber are mandatory'
      });
    }

    const result = db.createSale({
      brandId,
      validity,
      activationDate,
      expiryDate,
      customerName,
      customerNumber,
      accountEmail,
      accountPassword,
      screenNumber,
      screenPin,
      amount,
      deviceName,
      referenceName,
      referenceNumber,
      inventoryId
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expiry
app.get('/api/expiry', (req, res) => {
  try {
    const { filter = 'ALL', brandId = 'all' } = req.query;
    const list = db.getExpiryList({ filter, brandId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Notify
app.post('/api/notify/:id', (req, res) => {
  try {
    const result = db.notifyCustomer(req.params.id);
    if (!result) return res.status(404).json({ error: 'Subscription not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stats
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Google Sheets Integration Routes
app.get('/api/sheets/config', (req, res) => {
  try {
    const config = db.getSheetsConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sheets/config', (req, res) => {
  try {
    const updated = db.updateSheetsConfig(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sheets/test', async (req, res) => {
  try {
    const webhookUrl = req.body.webhookUrl || db.getSheetsConfig()?.webhookUrl;
    if (!webhookUrl || !webhookUrl.trim()) {
      return res.status(400).json({ connected: false, message: 'Google Sheet Webhook URL is required' });
    }

    const testUrl = new URL(webhookUrl.trim());
    testUrl.searchParams.set('action', 'test_connection');
    testUrl.searchParams.set('_t', String(Date.now()));

    const response = await fetch(testUrl.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      db.updateSheetsConfig({ status: 'Error', lastError: `HTTP ${response.status}` });
      return res.status(response.status).json({
        connected: false,
        message: `HTTP error ${response.status}: ${response.statusText}`
      });
    }

    const data = await response.json();
    const isConnected = data.status === 'connected';
    db.updateSheetsConfig({
      status: isConnected ? 'Connected' : 'Error',
      lastError: isConnected ? null : data.message
    });

    res.json({
      connected: isConnected,
      spreadsheetName: data.spreadsheetName || 'Google Spreadsheet',
      spreadsheetId: data.spreadsheetId,
      sheets: data.sheets || [],
      message: isConnected ? 'Spreadsheet connected successfully!' : 'Spreadsheet ping failed'
    });
  } catch (err) {
    db.updateSheetsConfig({ status: 'Error', lastError: err.message });
    res.status(500).json({
      connected: false,
      message: `Connection test failed: ${err.message}. Check URL and permissions.`
    });
  }
});

app.post('/api/sheets/validate', async (req, res) => {
  try {
    const webhookUrl = req.body.webhookUrl || db.getSheetsConfig()?.webhookUrl;
    const autoCreate = req.body.autoCreate || false;

    if (!webhookUrl || !webhookUrl.trim()) {
      return res.status(400).json({ valid: false, message: 'Google Sheet Webhook URL is required' });
    }

    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'validate_sheets', autoCreate })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ valid: false, message: err.message });
  }
});

app.post('/api/sheets/sync', async (req, res) => {
  try {
    const result = await db.syncAllToGoogleSheets();
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset
app.post('/api/reset', (req, res) => {
  try {
    const initial = db.resetDatabase();
    res.json({ success: true, message: 'Database reset to initial demo state', data: initial });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('API Server running on port ' + PORT);
    }
  });
});

app.listen(PORT, () => {
  console.log(`Accounts Manager API server running on http://localhost:${PORT}`);
});
