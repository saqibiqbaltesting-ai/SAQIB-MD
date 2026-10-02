// DOWNLOADER — social media downloads (public APIs par)
const config = require('../config');

const handler = async (ctx) => {
  const { command, reply, arg } = ctx;
  if (!arg || !arg.startsWith('http')) return reply(`❌ Link do. Example: ${config.PREFIX}${command} <link>`);

  switch (command) {
    case 'tiktok': case 'tiktok2': case 'tiktok3': case 'ttmp3': {
      try {
        const r = await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(arg)}`).then(r => r.json());
        if (!r.data) return reply('❌ Video nahi mili. Link check karo.');
        if (command === 'ttmp3') {
          await sock_sendAudio(ctx, r.data.music);
        } else {
          await ctx.sock.sendMessage(ctx.from, { video: { url: r.data.play }, caption: `⬇️ *TikTok Download*\n🏷️ ${config.BOT_NAME}` }, { quoted: ctx.m });
        }
      } catch (e) { await reply('❌ Download fail: ' + e.message); }
      break;
    }
    case 'twitter': case 'fb': case 'igdl': case 'igdl2': case 'igdl3': case 'igmp3': case 'mediafire': case 'gdrive': case 'capcut': case 'megadl': case 'download': case 'video': {
      // generic: tikwm tiktok ke liye, baqi ke liye public cobalt-style API
      try {
        const r = await fetch('https://api.cobalt.tools/api/json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ url: arg }),
        }).then(r => r.json());
        if (r.status === 'error' || !r.url) return reply('❌ Download nahi ho saka. Link private ya unsupported hy.');
        if (r.audio) await ctx.sock.sendMessage(ctx.from, { audio: { url: r.audio }, mimetype: 'audio/mpeg' }, { quoted: ctx.m });
        else await ctx.sock.sendMessage(ctx.from, { video: { url: r.url }, caption: `⬇️ *Download* — ${config.BOT_NAME}` }, { quoted: ctx.m });
      } catch (e) { await reply('❌ Download fail: ' + e.message); }
      break;
    }
    case 'song': case 'play': case 'music': {
      // search -> youtube top result audio (public API-free approach: yt search + y2mate style nahi, simple link)
      try {
        const s = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(ctx.arg)}`);
        const html = await s.text();
        const m = html.match(/"videoId":"(.{11})"/);
        if (!m) return reply('❌ Song nahi mila.');
        await reply(`🎵 *${ctx.arg}*\n\n▶️ https://youtu.be/${m[1]}\n\n_(Audio file ke liye ye link .ytaudio me use karo — ya bot ko ytdl-core support ke sath update karwa lo.)_`);
      } catch (e) { await reply('❌ ' + e.message); }
      break;
    }
    default:
      await reply('❓ Unknown download command');
  }
};

async function sock_sendAudio(ctx, url) {
  await ctx.sock.sendMessage(ctx.from, { audio: { url }, mimetype: 'audio/mpeg' }, { quoted: ctx.m });
}

module.exports = {
  commands: ['tiktok','tiktok2','tiktok3','ttmp3','twitter','fb','igdl','igdl2','igdl3','igmp3','mediafire','gdrive','capcut','megadl','download','video','song','play','music','ytpost','apk'],
  category: '📥 DOWNLOAD',
  handler,
};
