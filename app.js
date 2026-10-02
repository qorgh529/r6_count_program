(function () {
  const { FIELDS, DEFAULT_RULES, aggregate, scorePlayer, parseStats } = window.R6Score;
  const STORE = 'r6-score-v1';

  // 입력 표 열 순서 (이름 + 숫자 항목). 승리는 체크박스
  const ENTRY_COLS = ['kills', 'deaths', 'assists', 'plants', 'defuses', 'headshots'];
  const label = (key) => FIELDS.find((f) => f.key === key).label;

  let state = load();

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE));
      if (s && Array.isArray(s.matches)) return { rules: { ...DEFAULT_RULES, ...s.rules }, matches: s.matches };
    } catch (e) { /* 저장값이 없거나 깨졌으면 기본값 사용 */ }
    return { rules: { ...DEFAULT_RULES }, matches: [] };
  }
  const save = () => {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* 저장 불가 환경이면 무시 */ }
  };

  const $ = (id) => document.getElementById(id);
  function el(tag, props, ...children) {
    const e = document.createElement(tag);
    Object.assign(e, props);
    children.forEach((c) => e.append(c));
    return e;
  }

  // ---- 점수표 ----
  function renderRules() {
    const box = $('rules');
    box.replaceChildren();
    FIELDS.forEach((f) => {
      const input = el('input', { type: 'number', step: 'any', value: state.rules[f.key] });
      input.addEventListener('input', () => {
        state.rules[f.key] = Number(input.value) || 0;
        save();
        renderBoard();
        renderMatches();
      });
      box.append(el('label', {}, `${f.label} (점/개)`, input));
    });
  }

  // ---- 경기 입력 표 ----
  function renderEntryHead() {
    const tr = el('tr', {}, el('th', { textContent: '이름' }));
    ENTRY_COLS.forEach((k) => tr.append(el('th', { textContent: label(k) })));
    tr.append(el('th', { textContent: '승리' }), el('th'));
    $('entry').tHead.replaceChildren(tr);
  }

  function addRow(p = {}) {
    const tr = el('tr');
    tr.append(el('td', {}, el('input', { type: 'text', value: p.name || '', placeholder: '닉네임' })));
    ENTRY_COLS.forEach((k) => {
      tr.append(el('td', {}, el('input', { type: 'number', min: 0, value: p[k] || 0 })));
    });
    tr.append(el('td', {}, el('input', { type: 'checkbox', checked: !!p.wins })));
    const del = el('button', { textContent: '✕', title: '이 줄 삭제', className: 'ghost' });
    del.addEventListener('click', () => tr.remove());
    tr.append(el('td', {}, del));
    $('entry').tBodies[0].append(tr);
  }

  function readRows() {
    return [...$('entry').tBodies[0].rows].map((tr) => {
      const inputs = tr.querySelectorAll('input');
      const p = { name: inputs[0].value.trim() };
      ENTRY_COLS.forEach((k, i) => (p[k] = Math.max(0, Number(inputs[i + 1].value) || 0)));
      p.wins = inputs[ENTRY_COLS.length + 1].checked ? 1 : 0;
      return p;
    }).filter((p) => p.name);
  }

  function resetEntry() {
    $('entry').tBodies[0].replaceChildren();
    $('matchName').value = '';
    for (let i = 0; i < 5; i++) addRow();
  }

  // ---- 순위 ----
  function renderBoard() {
    const rows = aggregate(state.matches, state.rules);
    const table = $('board');
    table.replaceChildren();
    $('boardEmpty').hidden = rows.length > 0;
    if (!rows.length) return;

    const cols = ['kills', 'assists', 'plants', 'defuses', 'headshots', 'deaths', 'wins'];
    const head = el('tr', {}, el('th', { textContent: '순위' }), el('th', { textContent: '이름' }), el('th', { textContent: '경기' }));
    cols.forEach((k) => head.append(el('th', { textContent: label(k) })));
    head.append(el('th', { textContent: '점수' }));
    table.append(el('thead', {}, head));

    const body = el('tbody');
    rows.forEach((r, i) => {
      const tr = el('tr', { className: i === 0 ? 'top' : '' });
      tr.append(el('td', { textContent: i + 1 }), el('td', { className: 'name', textContent: r.name }), el('td', { textContent: r.matches }));
      cols.forEach((k) => tr.append(el('td', { textContent: r[k] })));
      tr.append(el('td', { className: 'score', textContent: r.score }));
      body.append(tr);
    });
    table.append(body);
  }

  // ---- 저장된 경기 목록 ----
  function renderMatches() {
    const ul = $('matches');
    ul.replaceChildren();
    if (!state.matches.length) ul.append(el('li', { className: 'meta', textContent: '아직 없습니다.' }));
    state.matches.forEach((m, i) => {
      const best = [...m.players].sort((a, b) => scorePlayer(b, state.rules) - scorePlayer(a, state.rules))[0];
      const del = el('button', { textContent: '삭제', className: 'danger' });
      del.addEventListener('click', () => {
        state.matches.splice(i, 1);
        save();
        renderBoard();
        renderMatches();
      });
      ul.append(el('li', {},
        el('span', {}, el('strong', { textContent: m.name }), el('span', { className: 'meta', textContent: `  ${m.date} · ${m.players.length}명 · MVP ${best.name} (${scorePlayer(best, state.rules)}점)` })),
        del));
    });
  }

  // ---- 이벤트 ----
  $('resetRules').addEventListener('click', () => {
    state.rules = { ...DEFAULT_RULES };
    save();
    renderRules();
    renderBoard();
    renderMatches();
  });
  $('addRow').addEventListener('click', () => addRow());
  $('saveMatch').addEventListener('click', () => {
    const players = readRows();
    if (!players.length) return alert('이름이 입력된 선수가 없습니다.');
    const date = new Date().toLocaleDateString('ko-KR');
    state.matches.push({ name: $('matchName').value.trim() || `경기 ${state.matches.length + 1}`, date, players });
    save();
    resetEntry();
    renderBoard();
    renderMatches();
  });
  $('loadCsv').addEventListener('click', () => {
    const players = parseStats($('csv').value);
    if (!players.length) return alert('읽을 수 있는 줄이 없습니다. 형식을 확인해 주세요.');
    $('entry').tBodies[0].replaceChildren();
    players.forEach(addRow);
    $('csv').value = '';
  });
  $('exportJson').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    el('a', { href: url, download: 'r6-score.json' }).click();
    URL.revokeObjectURL(url);
  });
  $('importJson').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const s = JSON.parse(await file.text());
      if (!Array.isArray(s.matches)) throw new Error('matches 배열이 없습니다');
      state = { rules: { ...DEFAULT_RULES, ...s.rules }, matches: s.matches };
      save();
      renderRules();
      renderBoard();
      renderMatches();
    } catch (err) {
      alert('불러오기 실패: ' + err.message);
    }
    e.target.value = '';
  });
  $('clearAll').addEventListener('click', () => {
    if (!confirm('저장된 모든 경기를 삭제할까요? (점수표는 유지됩니다)')) return;
    state.matches = [];
    save();
    renderBoard();
    renderMatches();
  });

  renderRules();
  renderEntryHead();
  resetEntry();
  renderBoard();
  renderMatches();
})();
