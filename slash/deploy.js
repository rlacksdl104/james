const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  // 포켓몬 도감
  new SlashCommandBuilder()
    .setName('포켓몬')
    .setDescription('포켓몬 도감 조회')
    .addStringOption(o => o.setName('이름').setDescription('포켓몬 이름 또는 번호 (예: 피카츄, 25)').setRequired(true)),

  // 파티
  new SlashCommandBuilder()
    .setName('파티')
    .setDescription('포켓몬 파티 조회 (최대 6마리)')
    .addStringOption(o => o.setName('포켓몬1').setDescription('첫 번째 포켓몬').setRequired(true))
    .addStringOption(o => o.setName('포켓몬2').setDescription('두 번째 포켓몬').setRequired(false))
    .addStringOption(o => o.setName('포켓몬3').setDescription('세 번째 포켓몬').setRequired(false))
    .addStringOption(o => o.setName('포켓몬4').setDescription('네 번째 포켓몬').setRequired(false))
    .addStringOption(o => o.setName('포켓몬5').setDescription('다섯 번째 포켓몬').setRequired(false))
    .addStringOption(o => o.setName('포켓몬6').setDescription('여섯 번째 포켓몬').setRequired(false)),

  // 샘플 작성
// 샘플 작성
new SlashCommandBuilder()
    .setName('샘플')
    .setDescription('포켓몬 샘플 작성 및 DB 저장')
    .addStringOption(o => o.setName('이름').setDescription('샘플 이름 (예: 물리형 피카츄)').setRequired(true))
    .addStringOption(o => o.setName('설명').setDescription('샘플 부가설명 (예: 내 아내임)').setRequired(false))
    .addStringOption(o => o.setName('포켓몬').setDescription('포켓몬 이름 또는 번호').setRequired(true))
    .addStringOption(o => o.setName('도구').setDescription('지닌 도구 (예: 생명의구슬, 없음)').setRequired(true))
    .addStringOption(o => o.setName('특성').setDescription('특성 이름 (한국어 가능)').setRequired(true))
    .addStringOption(o => o.setName('성격').setDescription('성격 (예: 장난꾸러기, 고집)').setRequired(true))
    .addStringOption(o => o.setName('노력치').setDescription('H A B C D S 순서로 입력 (예: 6 20 0 10 10 20)').setRequired(true))
    .addStringOption(o => o.setName('기술1').setDescription('첫 번째 기술').setRequired(true))
    .addStringOption(o => o.setName('기술2').setDescription('두 번째 기술').setRequired(true))
    .addStringOption(o => o.setName('기술3').setDescription('세 번째 기술').setRequired(true))
    .addStringOption(o => o.setName('기술4').setDescription('네 번째 기술').setRequired(true)),
  // 샘플 목록
  new SlashCommandBuilder()
    .setName('샘플목록')
    .setDescription('저장된 샘플 조회')
    .addStringOption(o => o.setName('포켓몬').setDescription('특정 포켓몬 필터 (선택)').setRequired(false)),

  // 샘플 삭제
  new SlashCommandBuilder()
    .setName('샘플삭제')
    .setDescription('내 샘플 삭제')
    .addIntegerOption(o => o.setName('번호').setDescription('삭제할 샘플 번호 (!샘플목록으로 확인)').setRequired(true)),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('⏳ 슬래시 커맨드 등록 중...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ 슬래시 커맨드 등록 완료!');
  } catch (e) {
    console.error('❌ 등록 실패:', e);
  }
})();
