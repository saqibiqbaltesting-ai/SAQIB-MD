// OWNER — sirf bot owner ke liye
const config = require('../config');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const handler = async (ctx) => {
  const { sock, command, reply, quoted } = ctx;

  switch (command) {
    // view-once extract: .vv / .vv2 / .vv3 — view-once photo/video/audio par reply karo
    case 'vv': case 'vv2': case 'vv3': {
      if (!quoted) return reply('❌ View-once photo/video ko *reply* kar ke .vv2 likho.');
      const qm = quoted.message;
      const type = qm.imageMessage && qm.imageMessage.viewOnce ? 'image'
        : qm.videoMessage && qm.videoMessage.viewOnce ? 'video'
        : qm.audioMessage && qm.audioMessage.viewOnce ? 'audio'
        : qm.imageMessage ? 'image' : qm.videoMessage ? 'video' : null;
      if (!type) return reply('❌ Ye view-once media nahi lag raha. Photo/video ko reply karo.');
      const msg = qm.imageMessage || qm.videoMessage || qm.audioMessage;
      const stream = downloadContentFromMessage(msg, type);
      const chunks = [];
      for await (const c of stream) chunks.push(c);
      const buf = Buffer.concat(chunks);
      const cap = `🔓 *View-once unlocked*\n👑 ${config.BOT_NAME}`;
      if (type === 'image') await sock.sendMessage(ctx.from, { image: buf, caption: cap }, { quoted: ctx.m });
      else if (type === 'video') await sock.sendMessage(ctx.from, { video: buf, caption: cap }, { quoted: ctx.m });
      else await sock.sendMessage(ctx.from, { audio: buf, mimetype: 'audio/mpeg' }, { quoted: ctx.m });
      break;
    }
    case 'forward': {
      if (!quoted) return reply('❌ Kisi message ko reply karo.');
      if (!ctx.arg) return reply(`❌ JID/number do. Example: ${config.PREFIX}forward 923xxxxxxxxxx`);
      const jid = ctx.arg.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      await sock.copyNForward(jid, quoted.message, true);
      await reply(`✅ Forward ho gaya -> +${jid.split('@')[0]}`);
      break;
    }
    case 'block': case 'unblock': {
      const num = (quoted ? quoted.key.participant : ctx.arg).replace(/[^0-9]/g, '');
      await sock.updateBlockStatus(num + '@s.whatsapp.net', command === 'block' ? 'block' : 'unblock');
      await reply(`${command === 'block' ? '🚫' : '✅'} +${num} ${command}ed.`);
      break;
    }
    case 'delete': {
      if (!quoted) return reply('❌ Reply to a message.');
      await sock.sendMessage(ctx.from, { delete: quoted.key });
      break;
    }
    case 'leave': {
      await reply('👋 Bot ja raha hy... Allah Hafiz!');
      setTimeout(() => sock.groupLeave(ctx.from), 1500);
      break;
    }
    case 'fullpp': case 'setppall': {
      if (!quoted?.message?.imageMessage) return reply('❌ Kisi photo par reply karo.');
      const stream = downloadContentFromMessage(quoted.message.imageMessage, 'image');
      const chunks = []; for await (const c of stream) chunks.push(c);
      await sock.updateProfilePicture(sock.user.id, chunks);
      await reply('✅ Profile picture update ho gayi.');
      break;
    }
    case 'status': case 'status2': {
      if (quoted?.message?.imageMessage || quoted?.message?.videoMessage) {
        const isImg = !!quoted.message.imageMessage;
        const stream = downloadContentFromMessage(isImg ? quoted.message.imageMessage : quoted.message.videoMessage, isImg ? 'image' : 'video');
        const chunks = []; for await (const c of stream) chunks.push(c);
        await sock.sendMessage('status@broadcast', isImg ? { image: Buffer.concat(chunks), caption: ctx.arg || '' } : { video: Buffer.concat(chunks), caption: ctx.arg || '' });
        await reply('✅ Status laga diya.');
      } else if (ctx.arg) {
        await sock.sendMessage('status@broadcast', { text: ctx.arg });
        await reply('✅ Text status laga diya.');
      } else reply('❌ Text likho ya media par reply karo.');
      break;
    }
    case 'getbio': {
      const num = (quoted ? quoted.key.participant : (ctx.arg ? ctx.arg.replace(/[^0-9]/g, '') : sock.user.id)).replace(/[^0-9]/g, '');
      try {
        const s = await sock.fetchStatus(num + '@s.whatsapp.net');
        await reply(`📝 *Bio (+${num}):*\n${s[0]?.status || s?.status || '-'}`);
      } catch { await reply('❌ Bio nahi mili.'); }
      break;
    }
    case 'updatebio': {
      if (!ctx.arg) return reply('❌ Nayi bio likho.');
      await sock.updateProfileStatus(ctx.arg);
      await reply('✅ Bio update ho gayi.');
      break;
    }
    case 'setname': {
      if (!ctx.arg) return reply('❌ Naya naam do.');
      await sock.updateProfileName(ctx.arg);
      await reply('✅ Naam update ho gaya.');
      break;
    }
    case 'pair': {
      const num = ctx.arg.replace(/[^0-9]/g, '');
      if (!num) return reply(`❌ Number do. Example: ${config.PREFIX}pair 923xxxxxxxxxx`);
      try {
        const code = await sock.requestPairingCode(num);
        await reply(`🔗 *Pairing Code for +${num}:*\n\n\`\`\`${code}\`\`\``);
      } catch (e) { await reply('❌ ' + e.message); }
      break;
    }
    case 'anticall': {
      await reply('ℹ️ Anti-call feature settings me hy — owner .env me ANTICALL=true karega. (Incoming call reject kar ke message bhejta hoga.)');
      break;
    }
    default: reply('❓ Unknown owner command');
  }
};

module.exports = {
  commands: ['vv','vv2','vv3','forward','block','unblock','delete','leave','fullpp','setppall','status','status2','getbio','updatebio','setname','pair','anticall','ik','gpass'],
  category: '👑 OWNER',
  ownerOnly: true,
  handler,
};
