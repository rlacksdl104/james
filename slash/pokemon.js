const axios = require('axios');

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

async function resolvePokeQuery(query) {
  if (/^\d+$/.test(query)) return query;
  if (/^[a-z\-]+$/.test(query)) return query;
  const { data } = await axios.get('https://pokeapi.co/api/v2/pokemon-species?limit=10000');
  for (const s of data.results) {
    const res = await axios.get(s.url);
    const koName = res.data.names.find(n => n.language.name === 'ko')?.name;
    if (koName === query) return s.name;
  }
  return null;
}

module.exports = {
  // /포켓몬
  async pokemon(interaction) {
    await interaction.deferReply();
    const input = interaction.options.getString('이름');
    try {
      const query = await resolvePokeQuery(input.toLowerCase());
      if (!query) return interaction.editReply(`❌ **"${input}"** 포켓몬을 찾을 수 없습니다.`);

      const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${query}`);
      const { data: species } = await axios.get(data.species.url);

      const koName = species.names.find(n => n.language.name === 'ko')?.name || data.name;
      const desc = species.flavor_text_entries.find(e => e.language.name === 'ko')?.flavor_text?.replace(/\f|\n/g, ' ') || '설명 없음';
      const types = data.types.map(t => TYPE_KO[t.type.name] || t.type.name).join(', ');
      const stats = data.stats.map(s => `${STAT_KO[s.stat.name]}: \`${s.base_stat}\``).join(' | ');
      const totalStat = data.stats.reduce((sum, s) => sum + s.base_stat, 0);
      const image = data.sprites.other['official-artwork'].front_default;

      interaction.editReply([
        `🔴 **No.${data.id} ${koName}**`,
        `🏷️ 타입: \`${types}\` | 📏 \`${data.height / 10}m\` | ⚖️ \`${data.weight / 10}kg\``,
        `📖 ${desc}`,
        `📊 ${stats}`,
        `✨ 종족값 총합: \`${totalStat}\``,
        image,
      ].join('\n'));
    } catch (e) {
      interaction.editReply(e.response?.status === 404 ? `❌ 포켓몬을 찾을 수 없습니다.` : '⚠️ 오류가 발생했습니다.');
    }
  },

  // /파티
  async party(interaction) {
    await interaction.deferReply();
    const keys = ['포켓몬1','포켓몬2','포켓몬3','포켓몬4','포켓몬5','포켓몬6'];
    const args = keys.map(k => interaction.options.getString(k)).filter(Boolean);

    const results = [];
    let totalPartyStats = 0;

    for (let i = 0; i < args.length; i++) {
      try {
        const query = await resolvePokeQuery(args[i].toLowerCase());
        if (!query) { results.push(`❌ **${args[i]}** — 찾을 수 없음`); continue; }

        const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${query}`);
        const { data: species } = await axios.get(data.species.url);
        const koName = species.names.find(n => n.language.name === 'ko')?.name || data.name;
        const types = data.types.map(t => TYPE_KO[t.type.name] || t.type.name).join('/');
        const total = data.stats.reduce((sum, s) => sum + s.base_stat, 0);
        const stats = data.stats.map(s => `${STAT_KO[s.stat.name]}:\`${s.base_stat}\``).join(' ');
        totalPartyStats += total;

        results.push([
          `**${i + 1}. No.${data.id} ${koName}** | 🏷️ \`${types}\``,
          `📊 ${stats} | ✨ 합계: \`${total}\``,
        ].join('\n'));
      } catch {
        results.push(`⚠️ **${args[i]}** — 오류 발생`);
      }
    }

    const avgStat = Math.round(totalPartyStats / results.length);
    interaction.editReply([
      `🎮 **파티 정보** (${results.length}마리)`,
      '─'.repeat(30),
      ...results,
      '─'.repeat(30),
      `✨ 파티 종족값 총합: \`${totalPartyStats}\` | 평균: \`${avgStat}\``,
    ].join('\n'));
  },

  resolvePokeQuery,
  TYPE_KO,
};