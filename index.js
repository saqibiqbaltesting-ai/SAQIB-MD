/* SAQIB-MD — WhatsApp Bot (Baileys)
 * Run: node index.js          -> agar pehli dafa chala rahe ho to number poochhe ga (pairing code dega)
 *      OWNER_NUMBER=.env me set karo to seedha wohi use hoga
 */
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  downloadContentFromMessage,
  jidNormalizedUser,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const config = require('./config');

const logger = pino({ level: 'silent' });
const sessionDir = path.join(__dirname, 'session');
if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

// ---------- plugin loader ----------
const plugins = [];
for (const f of fs.readdirSync(path.join(__dirname, 'plugins')).filter(x => x.endsWith('.js'))) {
  try {
    const plug = require(path.join(__dirname, 'plugins', f));
    if (Array.isArray(plug.commands)) plugins.push({ file: f, ...plug });
  } catch (e) {
    console.error('plugin load fail:', f, e.message);
  }
}
require('./plugins/_registry').set(plugins);
console.log(`SAQIB-MD: ${plugins.length} plugin files loaded, ${plugins.reduce((n, p) => n + p.commands.length, 0)} commands`);

// ---------- helpers ----------
function question(txt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(txt, a => { rl.close(); res(a.trim()); }));
}

function isOwner(m) {
  const sender = m.key.participant || m.key.remoteJid;
  return jidNormalizedUser(sender) === config.OWNER_NUMBER + '@s.net' ||
         jidNormalizedUser(sender) === (config.OWNER_NUMBER + '@s.whatsapp.net');
}

function getText(m) {
  return (
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    ''
  );
}

function downloadMedia(m, mediaType) {
  const stream = downloadContentFromMessage(m.message[mediaType], mediaType.replace('Message', '').replace('document', 'document'));
  return stream;
}

// quoted message resolve (reply kiya hua message)
function getQuoted(m) {
  const ctx = m.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return null;
  return { key: { remoteJid: m.key.remoteJid, id: ctx.stanzaId, participant: ctx.participant }, message: ctx.quotedMessage };
}

// ---------- command context banata hai ----------
function buildContext(sock, m) {
  const from = m.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const sender = isGroup ? (m.key.participant || from) : from;
  const pushname = m.pushName || 'User';
  const text = getText(m).trim();
  let body = text;
  let command = null, args = [];
  if (text.startsWith(config.PREFIX)) {
    const parts = text.slice(config.PREFIX.length).trim().split(/\s+/);
    command = (parts.shift() || '').toLowerCase();
    args = parts;
  }
  return {
    sock, m, from, isGroup, sender, pushname,
    text, body, command, args,
    arg: args.join(' '),
    quoted: getQuoted(m),
    isOwner: isOwner(m),
    reply: (txt, extra = {}) => sock.sendMessage(from, { text: txt, ...extra }, { quoted: m }),
    sendSticker: (buffer, isAnimated = false) => sock.sendMessage(from, { sticker: buffer, isAnimated }, { quoted: m }),
    sendMessage: (jid, content) => sock.sendMessage(jid, content),
    downloadMedia,
  };
}

// ---------- connection ----------
async function startBot() {
  const { state: auth, saveCreds: save } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: auth,
    logger,
    printQRInTerminal: false, // pairing code use kar rahe hain
    browser: ['Ubuntu', 'Chrome', '22.04.4'],
    markOnlineOnConnect: true,
    syncFullHistory: false,
  });

  if (!sock.authState.creds.registered) {
    let number = config.OWNER_NUMBER !== '000000000000' ? config.OWNER_NUMBER : process.argv[2];
    if (!number) number = await question('\nApna WhatsApp number likho (country code ke sath, e.g. 923xxXXXXXXX): ');
    number = number.replace(/[^0-9]/g, '');
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(number);
        console.log('\n==============================');
        const codeStr = code.match(/.{1,4}/g).join('-');
        fs.writeFileSync(__dirname + '/pairing-code.txt', codeStr);
        console.log(' PAIRING CODE: ' + codeStr);
        console.log(' WhatsApp > Linked devices > Link with phone number instead');
        console.log('==============================\n');
      } catch (e) {
        console.error('Pairing code fail:', e.message);
        process.exit(1);
      }
    }, 3000);
  }

  sock.ev.on('creds.update', save);

  sock.ev.on('connection.update', async (upd) => {
    const { connection, lastDisconnect } = upd;
    if (connection === 'open') {
      console.log(`✅ SAQIB-MD connected! Bot: ${config.BOT_NAME} | Owner: ${config.OWNER_NAME}`);
      if (config.OWNER_NUMBER !== '000000000000') {
        sock.sendMessage(config.OWNER_NUMBER + '@s.whatsapp.net', {
          text: `🤖 *${config.BOT_NAME}* live hy!\nType *${config.PREFIX}menu* to see all commands.`
        }).catch(() => {});
      }
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log('❌ Logged out. session/ folder delete kar ke dobara chalao.');
      } else {
        console.log('🔄 Reconnecting...', code);
        startBot();
      }
    }
  });

  // ---------- messages ----------
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      if (!m.message) continue;
      if (m.key.id.startsWith('BAE5') && m.key.id.length === 16) continue; // bot ke apne bheje hue
      if (config.AUTO_READ) await sock.readMessages([m.key]).catch(() => {});

      const ctx = buildContext(sock, m);
      if (!ctx.command) continue;

      // plugin dhundo
      const plug = plugins.find(p => p.commands.includes(ctx.command));
      if (!plug) continue;

      // private mode: sirf owner
      if (config.MODE === 'private' && !ctx.isOwner && !plug.commands.includes('menu')) continue;

      // owner-only plugins
      if (plug.ownerOnly && !ctx.isOwner) {
        await ctx.reply('❌ Ye command sirf bot owner ke liye hy.').catch(() => {});
        continue;
      }

      // group-only plugins
      if (plug.groupOnly && !ctx.isGroup) {
        await ctx.reply('❌ Ye command sirf group me chalti hy.').catch(() => {});
        continue;
      }

      console.log(`[CMD] ${ctx.command} | from ${ctx.pushname} (${ctx.isGroup ? 'group' : 'dm'})`);
      try {
        await ctx.reply(`⏳ *${ctx.command}* chal raha hy...`);
        await plug.handler(ctx);
      } catch (e) {
        console.error(`[ERR] ${ctx.command}:`, e);
        await ctx.reply(`❌ Error aya: ${e.message}`).catch(() => {});
      }
    }
  });

  // ---------- group welcome / goodbye ----------
  sock.ev.on('group-participants.update', async (upd) => {
    if (!config.WELCOME && !config.GOODBYE) return;
    try {
      const metadata = await sock.groupMetadata(upd.id);
      const name = metadata.subject;
      for (const jid of upd.participants) {
        const num = jid.split('@')[0];
        if (upd.action === 'add' && config.WELCOME) {
          await sock.sendMessage(upd.id, { text: `👋 Welcome *+${num}* to *${name}*!\n\nType ${config.PREFIX}menu to see what I can do 🔥` });
        }
        if (upd.action === 'remove' && config.GOODBYE) {
          await sock.sendMessage(upd.id, { text: `🕊️ *+${num}* left *${name}*. Allah Hafiz!` });
        }
      }
    } catch (e) { console.error('group event fail:', e.message); }
  });

  return sock;
}

startBot().catch(e => { console.error('FATAL:', e); process.exit(1); });
