// AI plugin — saari AI aliases (gpt/gemini/claude/grok/deepseek...) ek hi engine par chalti hain
const config = require('../config');

const STYLE_NOTES = {
  grok: 'Jawab thoda witty aur sharp style me do.',
  claude: 'Jawab thoughtful aur clear style me do.',
  deepseek: 'Coding ya technical sawal ho to detail se jawab do.',
  mathgpt: 'Ye maths sawal hy — step by step solve karo.',
  gpt4vision: '', // vision handled below
};

async function askGemini(prompt, imageBase64 = null) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.GEMINI_MODEL}:generateContent?key=${config.GEMINI_API_KEY}`;
  const parts = [{ text: prompt }];
  if (imageBase64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { maxOutputTokens: 800 },
    }),
  });
  if (!res.ok) throw new Error(`AI API error ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') || '❌ Koi jawab nahi mila.';
}

const handler = async (ctx) => {
  if (!config.GEMINI_API_KEY) {
    return ctx.reply('⚠️ AI key set nahi hy. Owner ko GEMINI_API_KEY .env me dalni hogi.');
  }
  let prompt = ctx.arg;
  let img = null;

  // .gpt4vision / .grokvision: image + caption
  if (ctx.m.message?.imageMessage) {
    prompt = prompt || 'Is image ko describe karo.';
    const imgMsg = ctx.m.message.imageMessage;
    const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
    const stream = downloadContentFromMessage(imgMsg, 'image');
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    img = Buffer.concat(chunks).toString('base64');
  } else if (ctx.quoted?.message?.imageMessage) {
    prompt = prompt || 'Is image ko describe karo.';
    const imgMsg = ctx.quoted.message.imageMessage;
    const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
    const stream = downloadContentFromMessage(imgMsg, 'image');
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    img = Buffer.concat(chunks).toString('base64');
  }

  if (!prompt) return ctx.reply(`❌ Sawal likho. Example: ${config.PREFIX}${ctx.command} Pakistan ka capital kya hy?`);
  const style = STYLE_NOTES[ctx.command.replace(/[0-9]/g, '')] || '';
  const answer = await askGemini(style ? `${prompt}\n(${style})` : prompt, img);
  await ctx.reply(`🤖 *${config.BOT_NAME} AI*\n\n${answer}`);
};

module.exports = { commands: config.AI_ALIASES, category: '🤖 AI', handler };
