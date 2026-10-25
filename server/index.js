import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { syncSaleToSupabase, syncScreenToSupabase, deleteSaleFromSupabase } from './supabase.js';

import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

const SMTP_USER = process.env.SMTP_USER || 'Fixyourmobiles10@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'wgupwtpbbczbnbhq';

const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logger for API calls
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// Auth Routes
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = db.validateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({
      success: true,
      user,
      token: `token_${Date.now()}_${Math.random().toString(36).slice(2)}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN & MULTI-USER API ROUTES ---
app.get('/api/admin/users', (req, res) => {
  try {
    const users = db.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users', (req, res) => {
  try {
    const { fullName, mobileNumber, email, password, role } = req.body;
    const newUser = db.createUser({ fullName, mobileNumber, email, password, role });
    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/users/:id', (req, res) => {
  try {
    const updatedUser = db.updateUserProfile(req.params.id, req.body);
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/users/:id/reset-password', (req, res) => {
  try {
    const { newPassword } = req.body;
    const result = db.adminResetPassword(req.params.id, newPassword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/users/:id/permissions', (req, res) => {
  try {
    const permissions = db.getUserPermissions(req.params.id);
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/:id/permissions', (req, res) => {
  try {
    const updatedPermissions = db.updateUserPermissions(req.params.id, req.body.permissions || req.body);
    res.json({ success: true, permissions: updatedPermissions });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- SITE SETTINGS & BRANDING ROUTES ---
app.get('/api/site-settings', (req, res) => {
  try {
    const settings = db.getSiteSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/site-settings', (req, res) => {
  try {
    const updated = db.updateSiteSettings(req.body);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    db.saveOtp(email, otp);

    const origin = (req.headers.origin || req.headers.referer || 'https://accounts-manager-murex.vercel.app').replace(/\/$/, '');
    const resetLink = `${origin}/?reset=true&email=${encodeURIComponent(email.trim())}&otp=${otp}`;

    const mailOptions = {
      from: `"OTT Sellers Management" <${SMTP_USER}>`,
      to: email.trim(),
      subject: 'Your Password Reset Link & OTP - OTT Sellers Management',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Password Reset Request</h2>
          <p style="color: #475569; font-size: 14px;">You requested to reset your password for the OTT Sellers Management System.</p>
          <div style="background: #eff6ff; border: 1px dashed #3b82f6; padding: 18px; border-radius: 10px; text-align: center; margin: 20px 0;">
            <div style="font-size: 13px; color: #1e40af; font-weight: 700; margin-bottom: 6px;">YOUR VERIFICATION OTP</div>
            <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #1d4ed8;">${otp}</div>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: bold; font-size: 16px;">
              Reset Password Directly
            </a>
            <p style="color: #64748b; font-size: 12px; margin-top: 8px;">Or open this link directly: <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a></p>
          </div>
          <p style="color: #64748b; font-size: 13px;">This OTP and reset link are valid for 15 minutes.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">Fixyourmobiles &bull; OTT Sellers Management System</p>
        </div>
      `
    };

    let emailSent = false;
    let mailError = null;
    try {
      await mailTransporter.sendMail(mailOptions);
      emailSent = true;
      console.log(`[AUTH] OTP sent successfully to ${email}`);
    } catch (sendErr) {
      console.warn(`[AUTH] Email send failed: ${sendErr.message}. Fallback link active.`);
      mailError = sendErr.message;
    }

    res.json({
      success: true,
      message: `Password reset link and OTP sent to ${email}`,
      emailSent,
      devOtp: otp,
      resetLink
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { email, newPassword, otp } = req.body;
    if (!email || !newPassword || !otp) {
      return res.status(400).json({ error: 'Email, new password, and OTP are required' });
    }
    const result = db.resetPassword(email, newPassword, otp);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    res.json({ success: true, message: 'Password has been reset successfully! You can now login.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Brands
app.get('/api/brands', (req, res) => {
  try {
    const { userEmail, userRole, userId } = req.query;
    const brands = db.getBrands(userEmail, userRole, userId);
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

app.post('/api/brands', (req, res) => {
  try {
    const newBrand = db.createBrand(req.body);
    res.status(201).json(newBrand);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/brands/:id', (req, res) => {
  try {
    const updated = db.updateBrand(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Brand not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/brands/:id', (req, res) => {
  try {
    const success = db.deleteBrand(req.params.id);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Groups Management
app.get('/api/groups', (req, res) => {
  try {
    const groups = db.getGroups();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/groups/:id', (req, res) => {
  try {
    const group = db.getGroup(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/groups', (req, res) => {
  try {
    const { name, heading } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    const newGroup = db.createGroup(req.body);
    res.status(201).json(newGroup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/groups/:id', (req, res) => {
  try {
    const updated = db.updateGroup(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Group not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/groups/:id', (req, res) => {
  try {
    const success = db.deleteGroup(req.params.id);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Custom Forms
app.get('/api/forms', (req, res) => {
  try {
    const { type } = req.query;
    const forms = db.getCustomForms(type);
    res.json(forms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/forms/:id', (req, res) => {
  try {
    const form = db.getCustomForm(req.params.id);
    if (!form) return res.status(404).json({ error: 'Form not found' });
    res.json(form);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/forms', (req, res) => {
  try {
    const newForm = db.createCustomForm(req.body);
    res.status(201).json(newForm);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/forms/:id', (req, res) => {
  try {
    const updated = db.updateCustomForm(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Form not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/forms/:id', (req, res) => {
  try {
    const success = db.deleteCustomForm(req.params.id);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// App Settings (WhatsApp Templates & User Customizations)
app.get('/api/settings', (req, res) => {
  try {
    const { userEmail } = req.query;
    const settings = db.getSettings(userEmail);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const { userEmail } = req.query;
    const settings = db.updateSettings(req.body, userEmail || req.body.userEmail);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cell Mappings
app.get('/api/cells/mapping', (req, res) => {
  try {
    const { formId } = req.query;
    const mappings = db.getCellMappings(formId || 'default');
    res.json(mappings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cells/mapping', (req, res) => {
  try {
    const { formId = 'default', mappings, spreadsheetId } = req.body;
    const saved = db.saveCellMappings(formId, { mappings, spreadsheetId });
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inventory
app.get('/api/inventory', (req, res) => {
  try {
    const { brandId, selectedOnly, emptyOnly, validity, sortOrder, userEmail, userRole, userId } = req.query;
    const items = db.getInventory({
      brandId,
      selectedOnly: selectedOnly === 'true',
      emptyOnly: emptyOnly === 'true',
      validity,
      sortOrder,
      userEmail,
      userRole,
      userId
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
    const actor = req.query.userEmail || req.body.userEmail || req.body.changedBy;
    const updated = db.updateInventory(req.params.id, req.body, actor);
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
    const { brandId, date, validity, search, sellerEmail, userEmail, userRole, userId } = req.query;
    const sales = db.getSales({
      brandId,
      date,
      validity,
      search,
      sellerEmail: sellerEmail || userEmail,
      userRole,
      userId
    });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Share Brands (Multi-seller collaboration)
app.get('/api/shares', (req, res) => {
  try {
    const { email } = req.query;
    const shares = db.getShares({ email });
    res.json(shares);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/shares', (req, res) => {
  try {
    const share = db.createShare(req.body);
    res.status(201).json(share);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/shares/:id', (req, res) => {
  try {
    const updated = db.updateShare(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/shares/:id', (req, res) => {
  try {
    db.deleteShare(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/shares/:id/brands/:brandId', (req, res) => {
  try {
    db.revokeShareBrand(req.params.id, req.params.brandId);
    res.json({ success: true });
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
      inventoryId,
      note: req.body.note || ''
    });

    if (result && result.sale) {
      // Async sync to Supabase
      syncSaleToSupabase(result.sale).catch(e => console.warn('Supabase sale sync error:', e));
      if (result.assignedAccount?.id) {
        syncScreenToSupabase(result.assignedAccount.id, result.sale.screenNumber, {
          status: 'occupied',
          saleId: result.sale.id,
          expiryDate: result.sale.expiryDate
        }).catch(e => console.warn('Supabase screen sync error:', e));
      }
    }

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sales/:id', (req, res) => {
  try {
    const updated = db.updateSale(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Sale not found' });

    // Async sync update to Supabase
    syncSaleToSupabase(updated).catch(e => console.warn('Supabase sale update error:', e));
    if (updated.inventoryId) {
      syncScreenToSupabase(updated.inventoryId, updated.screenNumber, {
        status: updated.status === 'Cancelled' ? 'empty' : 'occupied',
        saleId: updated.status === 'Cancelled' ? null : updated.id,
        expiryDate: updated.expiryDate
      }).catch(e => console.warn('Supabase screen update error:', e));
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sales/:id', (req, res) => {
  try {
    const deleted = db.deleteSale(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Sale not found' });

    deleteSaleFromSupabase(req.params.id).catch(e => console.warn('Supabase sale delete error:', e));
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expiry
app.get('/api/expiry', (req, res) => {
  try {
    const { filter = 'ALL', brandId = 'all', userEmail, userRole, userId } = req.query;
    const list = db.getExpiryList({ filter, brandId, userEmail, userRole, userId });
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
    const { userEmail, userRole, userId } = req.query;
    const stats = db.getStats({ userEmail, userRole, userId });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings
app.get('/api/settings', (req, res) => {
  try {
    const userEmail = req.query.userEmail;
    const settings = db.getSettings(userEmail);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const userEmail = req.query.userEmail || req.body.userEmail;
    const updated = db.updateSettings(req.body, userEmail);
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
      headers: { 'Accept': 'application/json' },
      redirect: 'follow'
    });

    const text = await response.text();
    if (text.includes('ServiceLogin') || text.includes('accounts.google.com')) {
      db.updateSheetsConfig({ status: 'Error', lastError: 'Permission error: Access must be set to Anyone' });
      return res.status(401).json({
        connected: false,
        message: 'Apps Script permission error: In Apps Script, click Deploy > Manage deployments > Edit > set "Who has access" to "Anyone" and redeploy.'
      });
    }

    let data = {};
    try {
      data = JSON.parse(text);
    } catch (e) {
      db.updateSheetsConfig({ status: 'Error', lastError: 'Invalid JSON returned' });
      return res.status(502).json({
        connected: false,
        message: 'Google Apps Script did not return JSON. Ensure Apps Script code is deployed as Web App.'
      });
    }

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
      body: JSON.stringify({ action: 'validate_sheets', autoCreate }),
      redirect: 'follow'
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

// Server-side relay proxy for all Google Sheet write actions (prevents browser CORS & Failed to fetch)
app.post('/api/sheets/proxy', async (req, res) => {
  try {
    const config = db.getSheetsConfig();
    const webhookUrl = req.body.webhookUrl || config?.webhookUrl;
    if (!webhookUrl || !webhookUrl.trim()) {
      return res.status(400).json({ status: 'error', message: 'No Google Sheet Webhook URL configured' });
    }

    const targetUrl = webhookUrl.trim();
    const payload = { ...req.body };
    delete payload.webhookUrl;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const text = await response.text();
    if (text.includes('ServiceLogin') || text.includes('accounts.google.com')) {
      return res.status(401).json({
        status: 'error',
        message: 'Apps Script permission error: Set "Who has access" to "Anyone" in Web App deployment.'
      });
    }

    try {
      const json = JSON.parse(text);
      return res.json(json);
    } catch (parseErr) {
      return res.json({ status: 'success', raw: text });
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/sheets/live-data', async (req, res) => {
  try {
    const config = db.getSheetsConfig();
    const webhookUrl = req.query.webhookUrl || config?.webhookUrl;
    if (!webhookUrl || !webhookUrl.trim()) {
      return res.status(400).json({ status: 'error', message: 'No Google Sheet Webhook URL configured' });
    }

    const fetchUrl = new URL(webhookUrl.trim());
    fetchUrl.searchParams.set('action', 'fetch_all');
    fetchUrl.searchParams.set('_t', String(Date.now()));

    const response = await fetch(fetchUrl.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow'
    });

    const text = await response.text();
    if (text.includes('ServiceLogin') || text.includes('accounts.google.com')) {
      return res.status(401).json({
        status: 'error',
        message: 'Apps Script permission error: In Apps Script, set "Who has access" to "Anyone".'
      });
    }

    try {
      const data = JSON.parse(text);
      res.json(data);
    } catch (e) {
      res.status(502).json({ status: 'error', message: 'Spreadsheet returned non-JSON response' });
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
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

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Accounts Manager API server running on http://localhost:${PORT}`);
  });
}

export default app;
