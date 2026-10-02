// 실행: node score.test.js
const assert = require('assert');
const { DEFAULT_RULES, scorePlayer, aggregate, parseStats } = require('./score');

// 킬5 + 설치2 + 해제2 + 어시3
assert.strictEqual(scorePlayer({ kills: 2, plants: 1, defuses: 1, assists: 1 }, DEFAULT_RULES), 17);
// 데스 감점, 승리 보너스 규칙 적용
assert.strictEqual(scorePlayer({ kills: 1, deaths: 2, wins: 1 }, { ...DEFAULT_RULES, deaths: -1, wins: 3 }), 6);

// 경기 누적 + 대소문자 무시 + 정렬
const rows = aggregate([
  { players: [{ name: 'A', kills: 3 }, { name: 'B', kills: 1, assists: 4 }] },
  { players: [{ name: 'a', kills: 1 }, { name: 'B', plants: 1 }] },
], DEFAULT_RULES);
assert.deepStrictEqual(rows.map((r) => [r.name, r.matches, r.score]), [['B', 2, 19], ['A', 2, 20]].sort((x, y) => y[2] - x[2]));

// CSV: 헤더 있음(순서 다름) / 헤더 없음 / 탭 구분
let p = parseStats('이름,어시스트,킬\n철수,2,7');
assert.deepStrictEqual([p[0].name, p[0].assists, p[0].kills], ['철수', 2, 7]);
p = parseStats('영희,9,10,5,1,2,3,1');
assert.deepStrictEqual([p[0].kills, p[0].deaths, p[0].assists, p[0].plants, p[0].defuses, p[0].headshots, p[0].wins], [9, 10, 5, 1, 2, 3, 1]);
p = parseStats('민수\t4\t1');
assert.strictEqual(p[0].kills, 4);

console.log('모든 테스트 통과');
