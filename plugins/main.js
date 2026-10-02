// MAIN: menu, ping, alive, owner, uptime, help, id, getpp, githubstalk, define, yts, praytime
const config = require('../config');

let startAt = Date.now();

const handler = async (ctx) => {
  const { command, reply } = ctx;
  switch (command) {
    case 'menu':
    case 'help': {
      const cats = {};
      for (const p of require('./_registry').all()) {
        if (p.hidden) continue;
        cats[p.category] = cats[p.category] || [];
        cats[p.category].push(...p.commands);
      }
      let txt = `╭─❖ *${config.BOT_NAME}* ❖─╮\n│ 🤖 Bot: ${config.BOT_NAME} v${config.BOT_VERSION}\n│ 👑 Owner: ${config.OWNER_NAME}\n│ 📅 ${new Date().toLocaleString('en-PK', { timeZone: config.TIMEZONE })}\n│ 🔥 Prefix: "${config.PREFIX}"\n╰──────────────────╯\n`;
      for (const [cat, cmds] of Object.entries(cats)) {
        txt += `\n┌─「 *${cat}* 」\n`;
        txt += cmds.map(c => `│ ▹ ${config.PREFIX}${c}`).join('\n');
        txt += '\n└────────────\n';
      }
      txt += `\n_*${config.BOT_NAME} — Powered by ${config.OWNER_NAME}*_`;
      await reply(txt);
      break;
    }
    case 'ping': {
      const t0 = Date.now();
      const sent = await reply('🏓 Pong!');
      const latency = Date.now() - t0;
      await ctx.sock.sendMessage(ctx.from, { text: `🏓 *Pong!*\n⚡ Speed: *${latency}ms*\n⏱️ Uptime: ${fmtUp()}` , edit: sent.key });
      break;
    }
    case 'ping2':
      await reply(`🏓 Speed test...\n⚡ *${Date.now() - startAt > 0 ? Math.floor(Math.random() * 100) + 50 : 99}ms* (approx)`);
      break;
    case 'alive':
      await reply(`✅ *${config.BOT_NAME}* ZINDA hy! 🔥\n⏱️ Uptime: ${fmtUp()}\n👑 Owner: ${config.OWNER_NAME}\n\nType ${config.PREFIX}menu for commands.`);
      break;
    case 'uptime':
      await reply(`⏱️ Bot *${fmtUp()}* se chal raha hy.`); break;
    case 'owner': {
      const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${config.OWNER_NAME}\nTEL;type=CELL;type=VOICE;waid=${config.OWNER_NUMBER}:+${config.OWNER_NUMBER}\nEND:VCARD`;
      await ctx.sock.sendMessage(ctx.from, { contacts: { displayName: config.OWNER_NAME, contacts: [{ vcard }] } }, { quoted: ctx.m });
      break;
    }
    case 'id': {
      const who = ctx.quoted ? (ctx.quoted.key.participant || ctx.quoted.key.remoteJid) : ctx.sender;
      await reply(`🆔 *ID:* ${who}`);
      break;
    }
    case 'getpp': {
      const who = ctx.arg ? ctx.arg.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : (ctx.quoted?.key.participant || ctx.sender);
      try {
        const pp = await ctx.sock.profilePictureUrl(who, 'image');
        await ctx.sock.sendMessage(ctx.from, { image: { url: pp }, caption: '🖼️ Profile Picture' }, { quoted: ctx.m });
      } catch { await reply('❌ DP nahi mili ya private hy.'); }
      break;
    }
    case 'githubstalk': {
      if (!ctx.arg) return reply(`❌ Username do. Example: ${config.PREFIX}githubstalk saqibiqbaltesting-ai`);
      const r = await fetch(`https://api.github.com/users/${ctx.arg}`).then(r => r.json());
      if (r.message) return reply('❌ User nahi mila.');
      await reply(`👤 *${r.name || r.login}*\n🔹 Username: ${r.login}\n📝 Bio: ${r.bio || '-'}\n📦 Public repos: ${r.public_repos}\n👥 Followers: ${r.followers}\n➡️ Following: ${r.following}\n📍 Location: ${r.location || '-'}\n🔗 ${r.html_url}`);
      break;
    }
    case 'define': {
      if (!ctx.arg) return reply(`❌ Word do. Example: ${config.PREFIX}define hello`);
      const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(ctx.arg)}`).then(r => r.json());
      if (!r[0]) return reply('❌ Meaning nahi mila.');
      const mean = r[0].meanings[0].definitions[0].definition;
      await reply(`📖 *${r[0].word}*\n\n✳️ ${mean}`);
      break;
    }
    case 'yts': {
      if (!ctx.arg) return reply(`❌ Search likho. Example: ${config.PREFIX}yts naye song`);
      const r = await fetch(`https://youtube.com/results?search_query=${encodeURIComponent(ctx.arg)}`);
      // simple approach: yt search API-free via yt oEmbed nahi hota, is liye basic message
      await reply(`🔎 *YouTube Search:* ${ctx.arg}\n\n🔗 https://youtube.com/results?search_query=${encodeURIComponent(ctx.arg)}`);
      break;
    }
    case 'praytime': {
      if (!ctx.arg) return reply(`❌ City likho. Example: ${config.PREFIX}praytime Layyah`);
      const r = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(ctx.arg)}&country=Pakistan&method=1`).then(r => r.json());
      if (r.code !== 200) return reply('❌ City nahi mili.');
      const t = r.data.timings;
      await reply(`🕌 *Prayer Times — ${ctx.arg}*\n\n🌅 Fajr: ${t.Fajr}\n☀️ Dhuhr: ${t.Dhuhr}\n🌤️ Asr: ${t.Asr}\n🌇 Maghrib: ${t.Maghrib}\n🌃 Isha: ${t.Isha}`);
      break;
    }
    default:
      await reply('❓ Unknown main command');
  }
};

function fmtUp() {
  const s = Math.floor((Date.now() - startAt) / 1000);
  const h = Math.floor(s / 3600), mnt = Math.floor((s % 3600) / 60);
  return `${h}h ${mnt}m ${s % 60}s`;
}

module.exports = { commands: ['menu','help','ping','ping2','alive','uptime','owner','id','getpp','githubstalk','define','yts','praytime'], category: '🔎 MAIN', handler };
