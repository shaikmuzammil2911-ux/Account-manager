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
