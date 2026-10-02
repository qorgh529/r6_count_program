// 점수 계산 로직 (브라우저 / Node 공용)
(function (root) {
  // 집계 대상 항목. key는 데이터 필드명, label은 화면 표시용
  const FIELDS = [
    { key: 'kills', label: '킬' },
    { key: 'assists', label: '어시스트' },
    { key: 'plants', label: '폭탄 설치' },
    { key: 'defuses', label: '폭탄 해제' },
    { key: 'headshots', label: '헤드샷' },
    { key: 'deaths', label: '데스' },
    { key: 'wins', label: '승리' },
  ];

  // 기본 점수표 (화면에서 수정 가능). 데스/헤드샷/승리는 기본 0점
  const DEFAULT_RULES = {
    kills: 5,
    assists: 3,
    plants: 2,
    defuses: 2,
    headshots: 0,
    deaths: 0,
    wins: 0,
  };

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  function scorePlayer(stats, rules) {
    return FIELDS.reduce((sum, f) => sum + num(stats[f.key]) * num(rules[f.key]), 0);
  }

  // 여러 경기를 합쳐 선수별 누적 기록과 점수를 만든 뒤 점수순으로 정렬
  function aggregate(matches, rules) {
    const byName = new Map();
    for (const match of matches) {
      for (const p of match.players) {
        const name = String(p.name).trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (!byName.has(key)) {
          const row = { name, matches: 0, score: 0 };
          FIELDS.forEach((f) => (row[f.key] = 0));
          byName.set(key, row);
        }
        const row = byName.get(key);
        row.matches += 1;
        FIELDS.forEach((f) => (row[f.key] += num(p[f.key])));
      }
    }
    const rows = [...byName.values()];
    rows.forEach((r) => (r.score = scorePlayer(r, rules)));
    rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    return rows;
  }

  // CSV/TSV 붙여넣기 → 선수 배열. 헤더가 있으면 이름으로, 없으면 아래 순서로 해석
  const DEFAULT_ORDER = ['name', 'kills', 'deaths', 'assists', 'plants', 'defuses', 'headshots', 'wins'];
  const ALIASES = {
    name: ['name', '이름', '닉네임', 'player', '선수'],
    kills: ['kills', 'kill', '킬'],
    deaths: ['deaths', 'death', '데스'],
    assists: ['assists', 'assist', '어시', '어시스트'],
    plants: ['plants', 'plant', '설치', '폭탄설치', '폭탄 설치'],
    defuses: ['defuses', 'defuse', '해제', '폭탄해제', '폭탄 해제'],
    headshots: ['headshots', 'headshot', 'hs', '헤드샷'],
    wins: ['wins', 'win', '승', '승리'],
  };

  function headerKey(cell) {
    const c = cell.trim().toLowerCase();
    return Object.keys(ALIASES).find((k) => ALIASES[k].includes(c)) || null;
  }

  function parseStats(text) {
    const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const split = (l) => l.split(/\t|,/).map((c) => c.trim());
    let order = DEFAULT_ORDER;
    const first = split(lines[0]);
    if (first.some((c) => headerKey(c))) {
      order = first.map(headerKey);
      lines.shift();
    }
    return lines.map((line) => {
      const cells = split(line);
      const p = { name: '', kills: 0, deaths: 0, assists: 0, plants: 0, defuses: 0, headshots: 0, wins: 0 };
      order.forEach((key, i) => {
        if (!key || cells[i] === undefined) return;
        p[key] = key === 'name' ? cells[i] : num(cells[i]);
      });
      return p;
    }).filter((p) => p.name);
  }

  const api = { FIELDS, DEFAULT_RULES, scorePlayer, aggregate, parseStats };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.R6Score = api;
})(typeof window !== 'undefined' ? window : globalThis);
