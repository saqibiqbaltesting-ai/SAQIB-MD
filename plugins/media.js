// MEDIA: sticker, tomp3, audio effects, upscale/removebg style image tools (ffmpeg-based)
const config = require('../config');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function tmpFile(ext) { return path.join(os.tmpdir(), `saqibmd_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`); }

function run(cmd, args) {
  return new Promise((res, rej) => execFile(cmd, args, { timeout: 60000 }, (e, so, se) => e ? rej(new Error(se || e.message)) : res()));
}

async function mediaBuffer(m, msg, type) {
  const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
  const stream = downloadContentFromMessage(msg, type);
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

const handler = async (ctx) => {
  const { command } = ctx;

  // ---------- .sticker ----------
  if (command === 'sticker' || command === 'attp' && false) {
    let msg = ctx.m.message.imageMessage ? ctx.m.message : ctx.quoted?.message;
    if (!msg || (!msg.imageMessage && !msg.videoMessage)) {
      return ctx.reply(`❌ Image/video do. Image bhejo caption me ${config.PREFIX}sticker likho, ya kisi media par reply kar ke likho.`);
    }
    const isVideo = !!msg.videoMessage;
    const buf = await mediaBuffer(ctx.m, isVideo ? msg.videoMessage : msg.imageMessage, isVideo ? 'video' : 'image');
    const inp = tmpFile(isVideo ? 'mp4' : 'jpg');
    const out = tmpFile('webp');
    fs.writeFileSync(inp, buf);
    await run('ffmpeg', isVideo
      ? ['-i', inp, '-t', '10', '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2,fps=12', '-an', '-c:v', 'libwebp', '-quality', '80', out]
      : ['-i', inp, '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2', '-c:v', 'libwebp', '-quality', '85', out]);
    await ctx.sendSticker(fs.readFileSync(out));
    [inp, out].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
    return;
  }

  // ---------- audio effects ----------
  const fx = config.AUDIO_FX[command];
  if (fx) {
    const msg = ctx.m.message.audioMessage || ctx.m.message.videoMessage || ctx.quoted?.message?.audioMessage || ctx.quoted?.message?.videoMessage;
    if (!msg) return ctx.reply(`❌ Audio/voice note par reply karo ya audio bhejo caption me ${config.PREFIX}${command}`);
    const buf = await mediaBuffer(ctx.m, msg, msg.mimetype?.startsWith('video') || ctx.m.message.videoMessage ? 'video' : 'audio');
    const inp = tmpFile('bin');
    fs.writeFileSync(inp, buf);

    if (command === 'tomp3' || command === 'toptt') {
      const out = tmpFile(command === 'toptt' ? 'ogg' : 'mp3');
      await run('ffmpeg', command === 'toptt'
        ? ['-i', inp, '-c:a', 'libopus', '-b:a', '64k', out]
        : ['-i', inp, '-vn', '-c:a', 'libmp3lame', '-q:a', '4', out]);
      if (command === 'toptt') await ctx.sock.sendMessage(ctx.from, { audio: fs.readFileSync(out), mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: ctx.m });
      else await ctx.sock.sendMessage(ctx.from, { document: fs.readFileSync(out), mimetype: 'audio/mpeg', fileName: `saqibmd_${command}.mp3` }, { quoted: ctx.m });
      [inp, out].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
      return;
    }

    const out = tmpFile('mp3');
    await run('ffmpeg', ['-i', inp, '-af', fx[0], '-vn', '-c:a', 'libmp3lame', '-q:a', '4', out]);
    await ctx.sock.sendMessage(ctx.from, { audio: fs.readFileSync(out), mimetype: 'audio/mpeg' }, { quoted: ctx.m });
    [inp, out].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
    return;
  }
};

module.exports = {
  commands: ['sticker', ...Object.keys(config.AUDIO_FX)],
  category: '🛠️ MEDIA & FX',
  handler,
};
