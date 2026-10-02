// ANIME + LOGO + IMAGE — image APIs par
const config = require('../config');

const WAIFU = {
  waifu: 'https://api.waifu.pics/sfw/waifu',
  neko: 'https://api.waifu.pics/sfw/neko',
  shinobu: 'https://api.waifu.pics/sfw/shinobu',
  megumin: 'https://api.waifu.pics/sfw/megumin',
  awoo: 'https://api.waifu.pics/sfw/awoo',
  maid: 'https://api.waifu.pics/sfw/waifu',
  garl: 'https://api.waifu.pics/sfw/waifu',
  dog: 'https://dog.ceo/api/breeds/image/random',
  anime: 'https://api.waifu.pics/sfw/waifu',
  animegirl: 'https://api.waifu.pics/sfw/waifu',
};

const LOGO = {
  glow: 'glow', neon: 'neon', galaxy: 'galaxy', glitch: 'glitch', luxurygold: 'luxury-gold',
  clouds: 'cloud', sand: 'sand', underwater: 'underwater', beach: 'beach', gradient: 'gradient',
  royal: 'royal', pixelglitch: 'pixel-glitch', amongus: 'among-us', typography: 'typography',
  write: 'write', papercut: 'papercut', watercolor: 'watercolor', cartoon: 'cartoon',
};

const handler = async (ctx) => {
  const { command, reply, arg } = ctx;

  if (WAIFU[command]) {
    try {
      const r = await fetch(WAIFU[command]).then(r => r.json());
      const url = command === 'dog' ? r.message : r.url;
      await ctx.sock.sendMessage(ctx.from, { image: { url }, caption: `🌸 ${config.BOT_NAME}` }, { quoted: ctx.m });
    } catch (e) { await reply('❌ Image nahi mili: ' + e.message); }
    return;
  }

  if (LOGO[command]) {
    if (!arg) return reply(`❌ Text do. Example: ${config.PREFIX}${command} SAQIB-MD`);
    try {
      const style = LOGO[command];
      const url = `https://textpro.me/${style}-text-effect-*.html`; // textpro style endpoint variable
      // simple reliable fallback: ezogether/eruca style — yahan public textpro API wrapper
      const r = await fetch(`https://api.caliph.biz.id/api/textpro?text=${encodeURIComponent(arg)}&style=${encodeURIComponent(style)}&apikey=free`).then(r => r.json());
      if (!r.status || !r.url) throw new Error('API down');
      await ctx.sock.sendMessage(ctx.from, { image: { url: r.url }, caption: `🎨 ${arg} — ${config.BOT_NAME}` }, { quoted: ctx.m });
    } catch (e) { await reply('❌ Logo API down hy, thori dair baad try karo.'); }
    return;
  }
};

module.exports = {
  commands: [...Object.keys(WAIFU), 'animegirl1','animegirl2','animegirl3','animegirl4','animegirl5', ...Object.keys(LOGO)],
  category: '🎌 ANIME & 🎨 LOGO',
  handler,
};
