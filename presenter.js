/* المقدّم يستخدم السجل نفسه للعرض الجديد؛ لا يسحب أسئلة بمجرد فتح الصفحة. */
(() => {
  const el = id => document.getElementById(id);
  const history = window.RafahaHistory;
  const letters = ['ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];
  const levels = ['mixed', 'سهل', 'متوسط', 'صعب'];
  const incoming = new URLSearchParams(location.search).get('level');
  el('hostLevel').value = levels.includes(incoming) ? incoming : 'mixed';
  let ready = false, busy = false, currentLetter = '';
  const buttons = new Map();
  const update = () => {
    if (!history || !ready) return;
    const state = history.stats(el('hostLevel').value);
    el('hostCount').textContent = 'المتبقي لهذا المستوى: ' + state.remaining.toLocaleString('ar') + ' من بنك يضم ' + state.total.toLocaleString('ar') + ' سؤالًا';
    buttons.forEach((button, letter) => {
      const count = state.counts[letter] || 0;
      button.disabled = busy || !count;
      button.classList.toggle('selected', letter === currentLetter);
      button.setAttribute('aria-pressed', String(letter === currentLetter));
      button.setAttribute('aria-label', 'حرف ' + letter + '، المتبقي ' + count.toLocaleString('ar'));
      button.querySelector('small').textContent = count.toLocaleString('ar');
    });
    el('hostNext').disabled = busy || !currentLetter || !(state.counts[currentLetter] > 0);
    el('hostLevel').disabled = busy;
  };
  const choose = async letter => {
    if (!ready || busy) return;
    busy = true; update(); el('hostStatus').textContent = 'جارٍ حفظ السؤال الجديد…';
    try {
      const record = await history.claim(letter, el('hostLevel').value);
      if (!record) { el('hostStatus').textContent = 'نفدت الأسئلة غير المشاهدة لهذا الحرف في المستوى المختار. اختر حرفًا آخر أو مستوى آخر؛ لن نعيد القديم.'; return; }
      currentLetter = letter;
      el('hostLetter').textContent = letter;
      el('hostCategory').textContent = record.category;
      el('hostQuestion').textContent = record.q;
      el('hostAnswer').textContent = record.a;
      el('hostCard').hidden = false;
      el('hostStatus').textContent = 'اقرأ السؤال للاعبين، واحتفظ بالإجابة على هذا الجوال.';
      el('hostCard').scrollIntoView({ block: 'start', behavior: 'smooth' });
    } catch (error) { el('hostStatus').textContent = error.message; }
    finally { busy = false; update(); }
  };
  letters.forEach(letter => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'letter-button'; button.disabled = true;
    const glyph = document.createElement('span'), stock = document.createElement('small'); glyph.textContent = letter; stock.className = 'letter-stock'; stock.textContent = '—';
    button.append(glyph, stock); button.addEventListener('click', () => choose(letter)); buttons.set(letter, button); el('hostLetters').appendChild(button);
  });
  el('hostNext').disabled = true;
  el('hostNext').onclick = () => { if (currentLetter) choose(currentLetter); };
  el('hostLevel').onchange = () => {
    if (busy) return;
    currentLetter = ''; el('hostCard').hidden = true; el('hostQuestion').textContent = ''; el('hostAnswer').textContent = '';
    el('hostStatus').textContent = 'اختر الحرف المطلوب. تغيير المستوى لا يمسح الأسئلة المشاهدة.';
    update();
  };
  if (!history) { el('hostStatus').textContent = 'تعذر تحميل سجل الأسئلة. اتصل بالإنترنت وأعد تحميل الصفحة.'; return; }
  history.ready.then(() => { ready = true; update(); }).catch(error => { el('hostCount').textContent = 'تعذر فتح السجل'; el('hostStatus').textContent = error.message; });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && ready && !busy) history.refresh().then(update).catch(error => { el('hostStatus').textContent = error.message; });
  });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
})();
