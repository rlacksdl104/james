const axios = require('axios');
const { getDb, serverTimestamp, formatFirebaseError } = require('../firebase');
const { resolvePokeQuery, TYPE_KO } = require('./pokemon');

const EV_STATS = ['H', 'A', 'B', 'C', 'D', 'S'];

const ABILITY_KO = {
  '적응력':'adaptability', '부유':'levitate', '저수':'water-absorb',
  '축전':'volt-absorb', '내열':'flash-fire', '초식':'sap-sipper',
  '승부근성':'guts', '근성':'guts', '자연회복':'natural-cure',
  '정전기':'static', '복안':'compound-eyes', '매직가드':'magic-guard',
  '엽록소':'chlorophyll', '옹골참':'sturdy', '위협':'intimidate',
  '가뭄':'drought', '잔비':'drizzle', '심술꾸러기':'prankster',
  '변환자재':'protean', '리베로':'libero', '힘껏밀기':'sheer-force',
  '강철정신':'clear-body', '멀티스케일':'multiscale', '두꺼운지방':'thick-fat',
  '불꽃몸':'flame-body', '질풍날개':'gale-wings', '철가시':'iron-barbs',
  '모래날리기':'sand-stream', '눈퍼뜨리기':'snow-warning',
};

function formatSample(sample, index = null) {
  const prefix = index !== null ? `**[${index}]** ` : '';
  return [
    `${prefix}📋 **${sample.koName}** (No.${sample.pokeId}) | 🏷️ \`${sample.types}\``,
    `🎒 도구: \`${sample.item}\` | ⭐ 특성: \`${sample.abilityKo || sample.ability}\` | 🌀 성격: \`${sample.nature}\``,
    `📊 노력치: \`${sample.evDisplay}\` (총합: ${sample.evTotal}/66)`,
    `⚔️ 기술: ${sample.moves.map((m, i) => `\`${i+1}.${m}\``).join(' ')}`,
    `👤 작성자: ${sample.authorTag} | 🕐 ${sample.createdAt}`,
  ].join('\n');
}

module.exports = {

  async sample(interaction) {
    await interaction.deferReply();
    try {
      // 1. 포켓몬 조회
      const nameInput = interaction.options.getString('포켓몬');
      await interaction.editReply('🔍 **[1/6]** 포켓몬 정보 조회 중...');

      let query;
      try { query = await resolvePokeQuery(nameInput.toLowerCase()); } catch { query = null; }
      if (!query) return interaction.editReply(`❌ **[1/6 포켓몬]** **"${nameInput}"** 포켓몬을 찾을 수 없습니다.\n영문 이름이나 번호로도 시도해보세요.`);

      let pokeData, species;
      try {
        const r1 = await axios.get(`https://pokeapi.co/api/v2/pokemon/${query}`);
        pokeData = r1.data;
      } catch { return interaction.editReply('❌ **[1/6 포켓몬]** 포켓몬 API 응답 실패. 잠시 후 다시 시도해주세요.'); }

      try {
        const r2 = await axios.get(pokeData.species.url);
        species = r2.data;
      } catch { return interaction.editReply('❌ **[1/6 포켓몬]** 종족 정보를 가져오는 데 실패했습니다.'); }

      const koName = species.names.find(n => n.language.name === 'ko')?.name || pokeData.name;
      const types = pokeData.types.map(t => TYPE_KO[t.type.name] || t.type.name).join('/');
      const image = pokeData.sprites.other['official-artwork'].front_default;

      // 2. 특성 처리
      await interaction.editReply('⭐ **[2/6]** 특성 정보 조회 중...');
      const abilityInput = interaction.options.getString('특성');
      const rawAbilities = pokeData.abilities.map(a => a.ability.name);

      const abilityKoNames = await Promise.all(
        rawAbilities.map(async name => {
          try {
            const { data: ab } = await axios.get(`https://pokeapi.co/api/v2/ability/${name}`);
            return ab.names.find(n => n.language.name === 'ko')?.name || name;
          } catch { return name; }
        })
      );

      const matchedIndex = abilityKoNames.findIndex(k => k === abilityInput);
      const resolvedAbility = matchedIndex !== -1
        ? rawAbilities[matchedIndex]
        : (ABILITY_KO[abilityInput] || abilityInput);

      // 해당 포켓몬 특성인지 검증
      const isValidAbility = rawAbilities.includes(resolvedAbility) || abilityKoNames.includes(abilityInput);
      if (!isValidAbility) {
        return interaction.editReply([
          `❌ **[2/6 특성]** **"${abilityInput}"** 은 ${koName}의 특성이 아닙니다.`,
          `사용 가능한 특성: ${abilityKoNames.map(a => `\`${a}\``).join(', ')}`,
        ].join('\n'));
      }

      // 3. 노력치 처리
      await interaction.editReply('📊 **[3/6]** 노력치 검증 중...');
      const evInput = interaction.options.getString('노력치');
      const evValues = evInput.trim().split(/\s+/).map(Number);

      if (evValues.length !== 6 || evValues.some(isNaN)) {
        return interaction.editReply([
          `❌ **[3/6 노력치]** 형식이 올바르지 않습니다.`,
          `숫자 6개를 공백으로 구분해서 입력해주세요.`,
          `예: \`6 20 0 10 10 20\` → H:6 A:20 B:0 C:10 D:10 S:20`,
        ].join('\n'));
      }

      const overIndex = evValues.findIndex(v => v > 32 || v < 0);
      if (overIndex !== -1) {
        return interaction.editReply([
          `❌ **[3/6 노력치]** ${EV_STATS[overIndex]} 값(${evValues[overIndex]})이 범위를 벗어났습니다.`,
          `각 스탯은 \`0~32\` 사이여야 합니다.`,
        ].join('\n'));
      }

      const evTotal = evValues.reduce((a, b) => a + b, 0);
      if (evTotal > 66) {
        return interaction.editReply([
          `❌ **[3/6 노력치]** 총합이 \`${evTotal}\`로 최대 \`66\`을 초과했습니다.`,
          `현재: ${EV_STATS.map((s, i) => `${s}:${evValues[i]}`).join(' ')} = ${evTotal}`,
          `\`${evTotal - 66}\` 만큼 줄여주세요.`,
        ].join('\n'));
      }

      const evDisplay = EV_STATS.map((s, i) => `${s}:${evValues[i]}`).join(' / ');

      // 4. 기술 처리
      await interaction.editReply('⚔️ **[4/6]** 기술 확인 중...');
      const moves = [1,2,3,4].map(i => interaction.options.getString(`기술${i}`));
      const emptyMove = moves.findIndex(m => !m || !m.trim());
      if (emptyMove !== -1) {
        return interaction.editReply(`❌ **[4/6 기술]** 기술 ${emptyMove + 1}번이 비어있습니다.`);
      }

      // 5. Firebase 저장
      await interaction.editReply('💾 **[5/6]** 데이터베이스에 저장 중...');
      const now = new Date();
      const createdAt = `${now.getFullYear()}.${now.getMonth()+1}.${now.getDate()}`;
      const sampleData = {
        authorId: interaction.user.id,
        authorTag: interaction.user.tag,
        pokeName: pokeData.name,
        koName, pokeId: pokeData.id, types,
        item: interaction.options.getString('도구'),
        ability: resolvedAbility,
        abilityKo: abilityInput,
        nature: interaction.options.getString('성격'),
        evValues, evDisplay, evTotal,
        moves, image, createdAt,
        timestamp: serverTimestamp(),
      };

      try {
        await getDb().collection('samples').add(sampleData);
      } catch (e) {
        const friendlyError = formatFirebaseError(e);
        console.error('[DB 저장 오류]', e.message);
        return interaction.editReply(`❌ **[5/6 저장]** ${friendlyError}`);
      }

      // 6. 완료
      await interaction.editReply('✅ **[6/6]** 완료!');
      await interaction.followUp([
        '✅ **샘플이 저장되었습니다!**',
        '━'.repeat(28),
        formatSample(sampleData),
        '━'.repeat(28),
        image,
      ].join('\n'));

    } catch (e) {
      console.error('[샘플 오류]', e.message, e.stack);
      try {
        await interaction.editReply(`❌ **알 수 없는 오류**\n\`${e.message}\``);
      } catch {}
    }
  },

  async sampleList(interaction) {
    await interaction.deferReply();
    try {
      let dbQuery = getDb().collection('samples').orderBy('timestamp', 'desc').limit(5);
      const filterInput = interaction.options.getString('포켓몬');

      if (filterInput) {
        let resolved;
        try { resolved = await resolvePokeQuery(filterInput.toLowerCase()); } catch { resolved = null; }
        if (resolved) dbQuery = dbQuery.where('pokeName', '==', resolved);
      }

      const snapshot = await dbQuery.get();
      if (snapshot.empty) return interaction.editReply('📭 저장된 샘플이 없습니다.');

      const lines = [`📚 **샘플 목록** (최근 ${snapshot.size}개)`, '━'.repeat(28)];
      snapshot.docs.forEach((doc, i) => {
        lines.push(formatSample(doc.data(), i + 1));
        lines.push('─'.repeat(28));
      });

      const text = lines.join('\n');
      if (text.length > 1900) {
        const half = Math.floor(lines.length / 2);
        await interaction.editReply(lines.slice(0, half).join('\n'));
        await interaction.followUp(lines.slice(half).join('\n'));
      } else {
        await interaction.editReply(text);
      }
    } catch (e) {
      console.error('[샘플목록 오류]', e.message);
      try { await interaction.editReply(`⚠️ 샘플 조회 중 오류가 발생했습니다.\n${formatFirebaseError(e)}`); } catch {}
    }
  },

  async sampleDelete(interaction) {
    await interaction.deferReply();
    const index = interaction.options.getInteger('번호') - 1;
    try {
      const snapshot = await getDb().collection('samples')
        .where('authorId', '==', interaction.user.id)
        .orderBy('timestamp', 'desc')
        .get();

      if (snapshot.empty) return interaction.editReply('📭 삭제할 샘플이 없습니다.');
      if (index >= snapshot.size) return interaction.editReply(`❌ ${index + 1}번 샘플이 존재하지 않습니다. (총 ${snapshot.size}개)`);

      const doc = snapshot.docs[index];
      await getDb().collection('samples').doc(doc.id).delete();
      await interaction.editReply(`🗑️ **${doc.data().koName}** 샘플이 삭제되었습니다.`);
    } catch (e) {
      console.error('[샘플삭제 오류]', e.message);
      try { await interaction.editReply(`⚠️ 삭제 중 오류가 발생했습니다.\n${formatFirebaseError(e)}`); } catch {}
    }
  },
};
