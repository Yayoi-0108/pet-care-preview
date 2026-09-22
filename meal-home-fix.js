/* Home meal row must open the meal form, not toggle the one-time care check.
   Run after app.js; capture-phase handler takes priority over its bubble handler.
   No storage keys or existing records are changed. */
'use strict';
document.addEventListener('click', function (event) {
  const target = event.target;
  const button = target instanceof Element ? target.closest('button[data-care="ごはん"]') : null;
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  navigate('meal');
}, true);
