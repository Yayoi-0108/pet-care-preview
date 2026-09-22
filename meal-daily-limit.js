/* Guard the meal save action by pet and selected calendar date.
   Keep existing localStorage and historic records unchanged. */
'use strict';
(function () {
  function mealGoal() {
    return Math.max(1, Math.min(12, Number(pet().mealGoal) || 2));
  }
  function mealCountFor(day) {
    return state.records.filter(record => record.petId === pet().id && record.type === 'ごはん' && String(record.datetime || '').slice(0, 10) === day).length;
  }
  function mealLimitState() {
    const dateInput = document.getElementById('recordDatetime');
    const button = document.querySelector('button[data-action="saveMeal"]');
    const notice = document.getElementById('mealLimitNotice');
    if (!dateInput || !button || !notice) return null;
    const day = dateInput.value.slice(0, 10);
    const goal = mealGoal();
    const count = day ? mealCountFor(day) : 0;
    const reached = !!day && count >= goal;
    button.disabled = !day || reached;
    notice.textContent = !day ? '日時を選んでください。' : reached
      ? `${day}のごはんは${count}/${goal}回です。設定回数に達したため、これ以上は記録できません。`
      : `${day}のごはんは${count}/${goal}回です。`;
    return { day, goal, count, reached };
  }

  // Keep the existing form and insert an explanatory status before its save button.
  const originalMealPage = pages.meal;
  pages.meal = function () {
    const html = originalMealPage.apply(this, arguments);
    const day = today();
    const goal = mealGoal();
    const count = mealCountFor(day);
    return html.replace(
      '<button class="primary" data-action="saveMeal">保存</button>',
      `<p id="mealLimitNotice" class="notice" role="status">${day}のごはんは${count}/${goal}回です。${count >= goal ? '設定回数に達したため、これ以上は記録できません。' : ''}</p><button class="primary" data-action="saveMeal" ${count >= goal ? 'disabled' : ''}>保存</button>`
    );
  };

  document.addEventListener('change', function (event) {
    if (event.target && event.target.id === 'recordDatetime') mealLimitState();
  });
  document.addEventListener('input', function (event) {
    if (event.target && event.target.id === 'recordDatetime') mealLimitState();
  });

  // The app's generic click handler runs in bubbling phase; block invalid saves first.
  document.addEventListener('click', function (event) {
    const target = event.target;
    const button = target instanceof Element ? target.closest('button[data-action="saveMeal"]') : null;
    if (!button) return;
    const current = mealLimitState();
    if (!current || !current.day || current.reached) {
      event.preventDefault();
      event.stopImmediatePropagation();
      alert(current && current.reached ? `ごはんは1日${current.goal}回までです。これ以上は記録できません。` : '日時を選んでください。');
    }
  }, true);
})();
