const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { commands } = require('./commands');
const { initializeFirebase, formatFirebaseError } = require('./firebase');
const pokeSlash = require('./slash/pokemon');
const sampleSlash = require('./slash/sample');

// Firebase 초기화
try {
  initializeFirebase();
  console.log('✅ Firebase Admin 초기화 완료');
} catch (error) {
  console.error('❌ Firebase 초기화 실패:', formatFirebaseError(error));
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = '!';

client.once('ready', () => {
  console.log(`✅ ${client.user.tag} (James) 봇이 온라인 상태입니다!`);
  client.user.setPresence({
    activities: [{ name: '/샘플 | James Bot', type: ActivityType.Watching }],
    status: 'online',
  });
});

// ─── 슬래시 커맨드 핸들러 ─────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;
  try {
    if (commandName === '포켓몬') await pokeSlash.pokemon(interaction);
    else if (commandName === '파티')  await pokeSlash.party(interaction);
    else if (commandName === '샘플')  await sampleSlash.sample(interaction);
    else if (commandName === '샘플목록') await sampleSlash.sampleList(interaction);
    else if (commandName === '샘플삭제') await sampleSlash.sampleDelete(interaction);
  } catch (e) {
    console.error(`[슬래시 오류] ${commandName}:`, e);
    if (interaction.deferred) interaction.editReply('⚠️ 오류가 발생했습니다.');
  }
});

// ─── 기존 !커맨드 핸들러 유지 ─────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  const command = commands[commandName];
  try {
    await command.execute(message, args);
  } catch (e) {
    console.error(`[오류] ${commandName}:`, e);
  }
});

client.login(process.env.DISCORD_TOKEN);
