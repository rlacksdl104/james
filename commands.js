const axios = require('axios');

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// ─── 상수 테이블 ───────────────────────────────
const TYPE_KO = {
  normal:'노말', fire:'불꽃', water:'물', electric:'전기', grass:'풀',
  ice:'얼음', fighting:'격투', poison:'독', ground:'땅', flying:'비행',
  psychic:'에스퍼', bug:'벌레', rock:'바위', ghost:'고스트', dragon:'드래곤',
  dark:'악', steel:'강철', fairy:'페어리',
};

const STAT_KO = {
  hp:'HP', attack:'공격', defense:'방어',
  'special-attack':'특수공격', 'special-defense':'특수방어', speed:'스피드',
};

const WEATHER_EMOJI = (id) => {
  if (id >= 200 && id < 300) return '⛈️';
  if (id >= 300 && id < 400) return '🌦️';
  if (id >= 500 && id < 600) return '🌧️';
  if (id >= 600 && id < 700) return '❄️';
  if (id >= 700 && id < 800) return '🌫️';
  if (id === 800) return '☀️';
  return '⛅';
};

// ─── 한국어 → 포켓몬 영문 ID 변환 ────────────────
async function resolvePokeQuery(query) {
  // 숫자면 그대로
  if (/^\d+$/.test(query)) return query;
  // 영문이면 그대로
  if (/^[a-z\-]+$/.test(query)) return query;

  // 한국어일 경우 → 전체 종족 리스트에서 검색
  const { data } = await axios.get('https://pokeapi.co/api/v2/pokemon-species?limit=10000');
  for (const species of data.results) {
    const res = await axios.get(species.url);
    const koName = res.data.names.find(n => n.language.name === 'ko')?.name;
    if (koName === query) return species.name;
  }
  return null;
}

// ─── 커맨드 ───────────────────────────────────
const commands = {

  help: {
    name: 'help',
    description: '명령어 목록',
    async execute(message) {
      message.reply([
        '🤖 **James Bot 명령어 목록**',
        '`!help` — 명령어 목록',
        '`!ping` — 응답속도 확인',
        '`!날씨 [도시명]` — 날씨 조회 (예: `!날씨 Seoul`)',
        '`!포켓몬 [이름/번호]` — 도감 조회 (예: `!포켓몬 피카츄`, `!포켓몬 25`)',
      ].join('\n'));
    },
  },

  ping: {
    name: 'ping',
    description: '응답속도 확인',
    async execute(message) {
      const sent = await message.reply('🏓 측정 중...');
      sent.edit(`🏓 **Pong!**\n📡 메시지: \`${sent.createdTimestamp - message.createdTimestamp}ms\`\n💻 API: \`${Math.round(message.client.ws.ping)}ms\``);
    },
  },

날씨: {
  name: '날씨',
  description: '날씨 조회',
  async execute(message, args) {
    if (!args.length) return message.reply('❌ 도시 이름을 입력해주세요. 예: `!날씨 Seoul`');

    const CITY_MAP = {
      '서울': 'Seoul',
      '대전': 'Daejeon',
      '부산': 'Busan',
      '대구': 'Daegu',
      '인천': 'Incheon',
      '광주': 'Gwangju',
      '울산': 'Ulsan',
    };

    const inputCity = args.join(' ');
    const city = CITY_MAP[inputCity] || inputCity;

    try {
      const { data } = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric&lang=kr`);
      const { name, main, weather, wind } = data;

      message.reply([
        `${WEATHER_EMOJI(weather[0].id)} **${name} 날씨**`,
        `🌡️ 기온: \`${main.temp}°C\` (체감 \`${main.feels_like}°C\`)`,
        `📊 최저/최고: \`${main.temp_min}°C\` / \`${main.temp_max}°C\``,
        `💧 습도: \`${main.humidity}%\` | 🌬️ 풍속: \`${wind.speed}m/s\``,
        `🌤️ 날씨: \`${weather[0].description}\``,
      ].join('\n'));
    } catch (e) {
      message.reply(e.response?.status === 404 ? `❌ "${inputCity}" 도시를 찾을 수 없습니다.` : '⚠️ 오류가 발생했습니다.');
    }
  },
},
  

  포켓몬: {
    name: '포켓몬',
    description: '포켓몬 도감',
    async execute(message, args) {
      if (!args.length) return message.reply('❌ 이름이나 번호를 입력해주세요. 예: `!포켓몬 피카츄`');

      await message.reply('🔍 검색 중...');

      try {
        const query = await resolvePokeQuery(args[0]);
        if (!query) return message.reply(`❌ **"${args[0]}"** 포켓몬을 찾을 수 없습니다.`);

        const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${query}`);
        const { data: species } = await axios.get(data.species.url);

        const koName = species.names.find(n => n.language.name === 'ko')?.name || data.name;
        const desc = species.flavor_text_entries.find(e => e.language.name === 'ko')?.flavor_text?.replace(/\f|\n/g, ' ') || '설명 없음';
        const types = data.types.map(t => TYPE_KO[t.type.name] || t.type.name).join(', ');
        const stats = data.stats.map(s => `${STAT_KO[s.stat.name]}: \`${s.base_stat}\``).join(' | ');
        const image = data.sprites.other['official-artwork'].front_default;
        const totalStat = data.stats.reduce((sum, s) => sum + s.base_stat, 0);

        message.reply([
        `🔴 **No.${data.id} ${koName}**`,
        `🏷️ 타입: \`${types}\` | 📏 \`${data.height / 10}m\` | ⚖️ \`${data.weight / 10}kg\``,
        `📖 ${desc}`,
        `📊 ${stats}`,
        `✨ 종족값 총합: \`${totalStat}\``,
        image,
        ].join('\n'));
      } catch (e) {
        message.reply(e.response?.status === 404 ? `❌ 포켓몬을 찾을 수 없습니다.` : '⚠️ 오류가 발생했습니다.');
      }
    },
  },

  

};



module.exports = { commands };