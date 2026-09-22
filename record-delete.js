/* Individual deletion for the local-only prototype; load after app.js and meal-daily-limit.js. */
'use strict';
(function () {
  function card(record) {
    const icon = record.type === 'ごはん' ? '🍚' : record.type === 'うんち' ? '💩' : record.type === '嘔吐' ? '🤢' : '📝';
    return `<div class="row" style="gap:8px">${record.photo ? `<img class="thumb" src="${esc(record.photo)}" alt="記録写真">` : `<span class="row-icon">${icon}</span>`}<span class="row-body"><span class="row-title">${esc(record.type)}</span><span class="row-sub">${esc(formatDateTime(record.datetime))}・${esc(record.recorder || 'あなた')} ${esc(record.note || record.amount || '')}</span></span><button type="button" class="secondary" data-delete-record="${esc(record.id)}" style="width:auto;flex:none;padding:8px 10px;margin:0" aria-label="${esc(record.type)}の記録を削除">削除</button></div>`;
  }
  // All recent records can be deleted individually on the Records screen.
  recordRows = function () {
    const records = petRecords().slice(0, 20);
    return records.length ? records.map(card).join('') : '<p class="empty">まだ記録はありません</p>';
  };
  const originalMealPage = pages.meal;
  pages.meal = function () {
    const html = originalMealPage.apply(this, arguments);
    const meals = petRecords('ごはん').filter(record => String(record.datetime || '').slice(0, 10) === today());
    return html + `<div class="card"><h2>今日のごはん履歴</h2><p class="muted">間違えた1件だけ削除できます。削除すると回数も変わります。</p>${meals.length ? meals.map(card).join('') : '<p class="empty">今日の記録はまだありません</p>'}</div>`;
  };
  document.addEventListener('click', function (event) {
    const button = event.target instanceof Element ? event.target.closest('button[data-delete-record]') : null;
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const record = state.records.find(item => String(item.id) === button.dataset.deleteRecord && item.petId === pet().id);
    if (!record) { alert('記録が見つかりません。画面を開き直してください。'); return; }
    if (!confirm(`${record.type}（${formatDateTime(record.datetime)}）を1件削除しますか？\n削除後は元に戻せません。`)) return;
    const before = state.records;
    state.records = before.filter(item => item !== record);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      state.records = before;
      alert('保存できなかったため、削除は取り消しました。');
      return;
    }
    render();
  }, true);
})();
