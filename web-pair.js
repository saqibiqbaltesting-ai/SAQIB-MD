/* SAQIB-MD — Pairing Portal (web page jahan se koi bhi user pair kar sakta hy)
 * Run: node web-pair.js  -> port 3000 par page khulta hy
 * Deploy: Koyeb/Render/Railway par isi file ko start command banao
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const config = require('./config');

const app = express();
const logger = pino({ level: 'silent' });
const pairings = new Map(); // id -> { sock, code, number, status, createdAt }
const TTL = 5 * 60 * 1000; // 5 min baad pending pairing clear

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- API ----------
app.post('/api/pair', async (req, res) => {
  const number = String(req.body.number || '').replace(/[^0-9]/g, '');
  if (!number || number.length < 10) return res.json({ ok: false, error: 'Number ghalat hy — country code sath likho (e.g. 92300...)' });

  const id = crypto.randomBytes(8).toString('hex');
  const authDir = path.join(__dirname, 'sessions', id);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '22.04.4'],
  });

  const entry = { sock, code: null, number, status: 'connecting', createdAt: Date.now() };
  pairings.set(id, entry);

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u) => {
    if (u.connection === 'open') {
      entry.status = 'linked';
      // linked -> ye session bot ban jata hy: session folder reh jata hy
      console.log(`[PAIR] ${number} linked! session: ${authDir}`);
    }
    if (u.connection === 'close') {
      const code = u.lastDisconnect?.error?.output?.statusCode;
      if (entry.status !== 'linked' && code !== DisconnectReason.loggedOut) {
        // reconnect pending pairing
        setTimeout(() => { try { sock.ev.emit('connection.update', {}); } catch {} }, 2000);
      }
    }
  });

  setTimeout(async () => {
    try {
      const code = await sock.requestPairingCode(number);
      entry.code = code;
      res.json({ ok: true, id, code: code.match(/.{1,4}/g).join('-') });
    } catch (e) {
      entry.status = 'error';
      pairings.delete(id);
      res.json({ ok: false, error: 'Pairing code nahi ban saka — thori dair baad try karo (WhatsApp limit).' });
    }
  }, 4000);

  // TTL cleanup
  setTimeout(() => {
    if (pairings.has(id) && pairings.get(id).status !== 'linked') {
      try { pairings.get(id).sock.end(); } catch {}
      pairings.delete(id);
      fs.rmSync(authDir, { recursive: true, force: true });
    }
  }, TTL);
});

app.get('/api/status/:id', (req, res) => {
  const e = pairings.get(req.params.id);
  if (!e) return res.json({ ok: false, status: 'expired' });
  res.json({ ok: true, status: e.status, code: e.code ? e.code.match(/.{1,4}/g).join('-') : null });
});

// ---------- health ----------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pair.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SAQIB-MD Pairing Portal: http://localhost:${PORT}`));
