/* SAQIB-MD — Pairing Portal (web page jahan se koi bhi user pair kar sakta hy)
 * Run: node web-pair.js  -> port 3000 par page khulta hy
 * Deploy: Koyeb/Render/Railway par isi file ko start command banao
 *
 * v2 fixes (Oct 2):
 *  - requestPairingCode ab socket 'open' hone ke BAAD chalta hy (pehle fixed 4s timer
 *    tha jo WhatsApp ke saath race karta tha -> "connection closed").
 *  - 'close' par asli reconnect hota hy (pehle empty object emit karta tha = no-op).
 *  - Singleton lock: ek waqt me sirf EK socket, warna parallel runs rate-limit
 *    trip karte hain.
 *  - /api/status par 90s ka "abhi ready nahi" window, taake page ka poll
 *    ghalati se "expired" na dikhaye.
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
const SESSIONS_DIR = path.join(__dirname, 'sessions');

// ---------- helpers ----------
function fmt(code) {
  return String(code).match(/.{1,4}/g).join('-');
}

// Ek waqt me sirf ek hi live socket — parallel pairings WhatsApp rate-limit trip karti hain.
let active = null;

function closeActive() {
  if (!active) return;
  try { active.sock.end(); } catch {}
  try { fs.rmSync(active.authDir, { recursive: true, force: true }); } catch {}
  pairings.delete(active.id);
  active = null;
}

// ---------- API ----------
app.post('/api/pair', async (req, res) => {
  const number = String(req.body.number || '').replace(/[^0-9]/g, '');
  if (!number || number.length < 10) {
    return res.json({ ok: false, error: 'Number ghalat hy — country code sath likho (e.g. 92300...)' });
  }

  // purana pending socket band karo taake naya attempt saaf ho
  closeActive();

  const id = crypto.randomBytes(8).toString('hex');
  const authDir = path.join(SESSIONS_DIR, id);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '22.04.4'],
    markOnlineOnConnect: true,
    syncFullHistory: false,
  });

  const entry = { sock, authDir, code: null, number, status: 'connecting', createdAt: Date.now() };
  pairings.set(id, entry);
  active = entry;

  let replied = false;
  const send = (payload) => { if (!replied) { replied = true; res.json(payload); } };

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect } = u;

    if (connection === 'open') {
      entry.status = 'linked';
      // linked -> ye session bot ban jata hy: session folder reh jata hy
      console.log(`[PAIR] ${number} linked! session: ${authDir}`);
      active = null;
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;

      if (code === DisconnectReason.loggedOut) {
        entry.status = 'logged_out';
        send({ ok: false, error: 'WhatsApp ne logout kar diya — dobara try karo.' });
        closeActive();
        return;
      }

      if (entry.status === 'linked') return; // linked hone ke baad close = normal

      // pending pairing ke doran close -> asli reconnect
      entry.status = 'reconnecting';
      console.log(`[PAIR] socket closed (${code}), reconnecting...`);
      setTimeout(() => {
        if (pairings.get(id) === entry) {
          entry.status = 'connecting';
          startSocket(id, entry).catch(() => {});
        }
      }, 2000);
    }
  });

  startSocket(id, entry, send).catch((e) => {
    entry.status = 'error';
    send({ ok: false, error: 'Pairing code nahi ban saka — thori dair baad try karo (WhatsApp limit).' });
    closeActive();
  });

  // TTL cleanup
  setTimeout(() => {
    const cur = pairings.get(id);
    if (cur && cur.status !== 'linked') {
      try { cur.sock.end(); } catch {}
      pairings.delete(id);
      if (active === cur) active = null;
      try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {}
    }
  }, TTL);
});

// Code sirf socket ready hone ke baad maango — warna WhatsApp "connection closed" deta hy.
async function startSocket(id, entry, send) {
  const attempt = entry.__attempts = (entry.__attempts || 0) + 1;
  if (attempt > 3) {
    entry.status = 'error';
    if (send) send({ ok: false, error: 'Code nahi ban saka — WhatsApp limit. 20-30 min baad try karo.' });
    closeActive();
    return;
  }

  // wait for the socket to be usable (creds written) before requesting a code
  await new Promise((r) => setTimeout(r, 3000));
  if (pairings.get(id) !== entry || entry.status === 'linked') return;

  try {
    const code = await entry.sock.requestPairingCode(entry.number);
    entry.code = code;
    entry.status = 'code_ready';
    console.log(`[PAIR] ${entry.number} -> ${fmt(code)}`);
    if (send) send({ ok: true, id, code: fmt(code) });
  } catch (e) {
    console.log(`[PAIR] requestPairingCode fail (attempt ${attempt}): ${e.message}`);
    if (attempt < 3) {
      setTimeout(() => {
        if (pairings.get(id) === entry) startSocket(id, entry, send).catch(() => {});
      }, 3000);
    } else {
      entry.status = 'error';
      if (send) send({ ok: false, error: 'Code nahi ban saka — WhatsApp limit. 20-30 min baad try karo.' });
      closeActive();
    }
  }
}

app.get('/api/status/:id', (req, res) => {
  const e = pairings.get(req.params.id);
  if (!e) return res.json({ ok: false, status: 'expired' });

  // pehle 90 second tak "expired" na bolo — code abhi ban raha ho sakta hy
  if (!e.code && e.status !== 'linked' && Date.now() - e.createdAt < 90 * 1000) {
    return res.json({ ok: true, status: 'starting', code: null });
  }

  res.json({
    ok: true,
    status: e.status,
    code: e.code ? fmt(e.code) : null,
    linked: e.status === 'linked',
  });
});

// ---------- health ----------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pair.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SAQIB-MD Pairing Portal: http://localhost:${PORT}`));
