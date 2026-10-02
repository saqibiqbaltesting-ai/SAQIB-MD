// GROUP — group management (admins ke liye)
const config = require('../config');

const isAdmin = async (sock, jid, sender) => {
  const meta = await sock.groupMetadata(jid);
  const me = meta.participants.find(p => p.id === sender);
  return me && (me.admin === 'admin' || me.admin === 'superadmin');
};

const botIsAdmin = async (sock, jid) => {
  const meta = await sock.groupMetadata(jid);
  const me = meta.participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net' || p.id === sock.user.id);
  return me && (me.admin === 'admin' || me.admin === 'superadmin');
};

const handler = async (ctx) => {
  const { sock, command, reply, from, arg, quoted } = ctx;

  const needAdmin = ['kick','promote','demote','mute','unmute','tagall','everyone','add','revoke','updategcname','updategcdesc','link','del','hidetag','poll','antilink'];
  if (needAdmin.includes(command)) {
    if (!await isAdmin(sock, from, ctx.sender)) return reply('❌ Ye command sirf *group admins* ke liye hy.');
  }

  switch (command) {
    case 'tagall': case 'everyone': {
      const meta = await sock.groupMetadata(from);
      const txt = arg ? `📢 *${arg}*\n\n` : '📢 *Attention Everyone*\n\n';
      const mentions = meta.participants.map(p => p.id);
      await sock.sendMessage(from, { text: txt + mentions.map((m, i) => `${i + 1}. @${m.split('@')[0]}`).join('\n'), mentions }, { quoted: ctx.m });
      break;
    }
    case 'tag': case 'hidetag': {
      const meta = await sock.groupMetadata(from);
      const mentions = arg ? meta.participants.filter(p => arg.includes(p.id.split('@')[0])).map(p => p.id) : meta.participants.map(p => p.id);
      await sock.sendMessage(from, { text: arg || '📢', mentions }, { quoted: ctx.m });
      break;
    }
    case 'kick': {
      if (!quoted && !arg) return reply('❌ Kisi member ko reply karo ya number do.');
      const target = quoted ? (quoted.key.participant || quoted.key.remoteJid) : arg.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      await sock.groupParticipantsUpdate(from, [target], 'remove');
      await reply(`👢 *@${target.split('@')[0]} ko nikal diya gaya.}*`.replace('}*', '*'), { mentions: [target] });
      break;
    }
    case 'promote': {
      const target = quoted ? quoted.key.participant : arg.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      await sock.groupParticipantsUpdate(from, [target], 'promote');
      await reply(`👑 @${target.split('@')[0]} ab *ADMIN* hy!`, { mentions: [target] });
      break;
    }
    case 'demote': {
      const target = quoted ? quoted.key.participant : arg.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      await sock.groupParticipantsUpdate(from, [target], 'demote');
      await reply(`⬇️ @${target.split('@')[0]} ab normal member hy.`, { mentions: [target] });
      break;
    }
    case 'mute': case 'unmute': {
      if (!await botIsAdmin(sock, from)) return reply('❌ Pehle bot ko group admin banao!');
      await sock.groupSettingUpdate(from, command === 'mute' ? 'announcement' : 'not_announcement');
      await reply(command === 'mute' ? '🔇 Group *sirf admins* ke messages ke liye.' : '🔊 Sab members message kar sakte hain.');
      break;
    }
    case 'link': {
      const code = await sock.groupInviteCode(from);
      await reply(`🔗 *Group Link:*\nhttps://chat.whatsapp.com/${code}`);
      break;
    }
    case 'revoke': {
      await sock.groupRevokeInvite(from);
      await reply('♻️ Purana link khatam, naya link ban gaya.');
      break;
    }
    case 'ginfo': {
      const meta = await sock.groupMetadata(from);
      await reply(`👥 *${meta.subject}*\n\n🔹 Members: ${meta.participants.length}\n🔹 Created: ${new Date(meta.creation * 1000).toLocaleDateString()}\n🔹 Owner: @${(meta.owner || '').split('@')[0]}\n🔹 Description: ${meta.desc || '-'}`);
      break;
    }
    case 'updategcname': {
      if (!arg) return reply('❌ Naya naam do.');
      await sock.groupUpdateSubject(from, arg);
      await reply('✅ Group name update ho gaya.');
      break;
    }
    case 'updategcdesc': {
      if (!arg) return reply('❌ Nayi description do.');
      await sock.groupUpdateDescription(from, arg);
      await reply('✅ Description update ho gayi.');
      break;
    }
    case 'poll': {
      if (!arg.includes(',')) return reply(`❌ Format: ${config.PREFIX}poll sawal?, option1, option2`);
      const [q, ...opts] = arg.split(',').map(s => s.trim());
      await sock.sendMessage(from, { poll: { name: q, values: opts } }, { quoted: ctx.m });
      break;
    }
    case 'del': {
      if (!quoted) return reply('❌ Kisi message ko reply karo.');
      await sock.sendMessage(from, { delete: quoted.key });
      break;
    }
    case 'add': {
      const num = arg.replace(/[^0-9]/g, '');
      await sock.groupParticipantsUpdate(from, [num + '@s.whatsapp.net'], 'add');
      await reply(`✅ +${num} ko group me add kar diya.`);
      break;
    }
    case 'welcome': case 'goodbye': {
      const on = command === 'welcome' ? config.WELCOME : config.GOODBYE;
      await reply(`ℹ️ ${command} system abhi *${on ? 'ON' : 'OFF'}* hy. Settings plugin se toggle karo.`);
      break;
    }
    default: await reply('❓ Unknown group command');
  }
};

module.exports = {
  commands: ['tagall','everyone','tag','hidetag','kick','promote','demote','mute','unmute','link','revoke','ginfo','updategcname','updategcdesc','poll','del','add','welcome','goodbye'],
  category: '👥 GROUP',
  groupOnly: true,
  handler,
};
