// SAQIB-MD — bot configuration
require('dotenv').config();

const config = {
  BOT_NAME: process.env.BOT_NAME || 'SAQIB-MD',
  BOT_VERSION: '1.0.0',
  PREFIX: process.env.PREFIX || '.',
  OWNER_NAME: process.env.OWNER_NAME || 'Attitude King',
  OWNER_NUMBER: process.env.OWNER_NUMBER || '000000000000', // set in .env, format: 92xxxxxxxxxx
  OWNER_EMAIL: process.env.OWNER_EMAIL || '',
  // AI providers (set in .env)
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  // behaviour
  MODE: process.env.MODE || 'public', // public | private (private = sirf owner ke liye)
  AUTO_READ: true,
  AUTO_TYPING: true,
  WELCOME: true,
  GOODBYE: true,
  ANTILINK: false,
  ANTIDELETE: false,
  MAX_MENU_COLUMNS: 1,
  TIMEZONE: 'Asia/Karachi',
};

// AI command aliases -> sab isi engine par route honge (Gemini)
// Har alias ka apna "persona" me hot reply deta hai.
config.AI_ALIASES = [
  'ai','bot','gpt','gpt3','gpt35turbo','gpt4','gpt4turbo','gpt4o','gpt4omini','gpt4vision','gpt4all',
  'gpt5','gpt5mini','chatgpt','chatgpt35','chatgpt4','chatgpt4o','chatgptplus','chatgptelite',
  'o1','o1mini','o1preview','o3','o3mini','o4','copilot','mscopilot','elitecopilot',
  'deepseek','deepseekv2','deepseekv3','deepseekcoder','deepseekcoder2','deepseekmath','deepseekllm','deepseekvl','deepseekchat',
  'gemini','geminipro','geminiultra','gemininano','gemini15','gemini15pro','gemini15flash','gemini20','gemini20flash','gemini25','gemini25pro','gemini25flash',
  'bard','palm','palm2','grok','grok1','grok15','grok2','grok2mini','grok3','grok3mini','grok4','grokbeta','grokvision',
  'claude','claude1','claude2','claudeinstant','claude3','claude3opus','claude3sonnet','claude3haiku','claude35','claude35sonnet','claude35haiku','claude37','claude37sonnet','claude4','claude4opus','claude4sonnet','claudeopus','claudesonnet','claudehaiku',
  'qwen','qwen15','qwen2','qwen25','qwen3','qwencoder','qwenmath','qwenmax','qwenplus','qwenzurbo',
  'llama2','llama3','mistral','mixtral','falcon','bloom','bloomz','orca','vicuna','alpaca','phi2',
  'wizard','codet5','codex','starcoder','codegen','kimi','perplexity','yi','yi34b','mathgpt',
  'command','jurassic','ai21','solar','lumin','redpajama','dolly','hugging','openassistant','gptneo','gptj','flant5','starlin','talkai','brain','elite','elitegpt','assistant','smart','genius','proai','ultra','maxai','nova','zenith','apex','vertex','pulse','quantum','neo','omega'
];

// Audio effects -> ffmpeg filter map (baqi plugins me use hota hai)
config.AUDIO_FX = {
  bass:   ['equalizer=f=60:gain_type=q:gain=8', 20],
  deep:   ['equalizer=f=100:gain_type=o:gain=-6', 20],
  smooth: ['equalizer=f=800:gain_type=o:gain=-4', 20],
  fat:    ['bass=g=6', 20],
  tupai:  ['asetrate=44100*1.3,aresample=44100,atempo=0.85', 20],
  blown:  ['volume=8,acrusher=bits=4', 20],
  radio:  ['highpass=f=500,f=lowpass=f=3000', 20],
  robot:  ['vibrato=f=8:d=0.8,flanger', 20],
  chipmunk: ['asetrate=44100*1.6,aresample=44100,atempo=0.9', 20],
  nightcore: ['asetrate=44100*1.25,aresample=44100,atempo=1.0', 20],
  earrape: ['volume=25,acrusher=bits=2', 25],
  reverse: ['areverse', 20],
  slow:   ['asetrate=44100*0.8,aresample=44100,atempo=1.0', 20],
  fast:   ['asetrate=44100*1.35,aresample=44100,atempo=1.0', 20],
  baby:   ['asetrate=44100*1.7,aresample=44100,atempo=0.95,lowpass=f=6000', 20],
  demon:  ['asetrate=44100*0.7,aresample=44100,atempo=1.05,bass=g=10', 20],
  tomp3:  [null, 0], // special: video -> mp3
  toptt:  ['loudnorm,atrim=0:60', 0],
};

module.exports = config;
