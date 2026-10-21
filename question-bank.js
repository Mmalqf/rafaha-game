(() => {
  const records = window.RAFAHA_QUESTIONS || [];
  const byId = id => document.getElementById(id);
  const normalize = text => String(text).normalize('NFKC').replace(/[\u064b-\u065f\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').toLowerCase();
  const searchable = records.map(record => ({ record, text: normalize(record.q + ' ' + record.a) }));
  const categories = [...new Set(records.map(q => q.category))].sort((a, b) => a.localeCompare(b, 'ar'));
  const letters = ['ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];
  for (const [id, values] of [['bankCategory', categories], ['bankLetter', letters]]) {
    values.forEach(value => { const option = document.createElement('option'); option.value = option.textContent = value; byId(id).appendChild(option); });
  }
  let page = 0;
  const pageSize = 30;
  const render = () => {
    const search = normalize(byId('bankSearch').value.trim());
    const category = byId('bankCategory').value, letter = byId('bankLetter').value;
    const filtered = searchable.filter(({ record, text }) => (!search || text.includes(search)) && (!category || record.category === category) && (!letter || record.letter === letter));
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.max(0, Math.min(page, pages - 1));
    byId('bankCount').textContent = filtered.length.toLocaleString('ar') + ' سؤال من ' + records.length.toLocaleString('ar');
    const fragment = document.createDocumentFragment();
    filtered.slice(page * pageSize, (page + 1) * pageSize).forEach(({ record }) => {
      const article = document.createElement('article'); article.className = 'bank-item';
      const meta = document.createElement('div'); meta.className = 'bank-meta'; meta.textContent = record.category + ' • حرف ' + record.letter;
      const title = document.createElement('h2'); title.textContent = record.q;
      const details = document.createElement('details'), summary = document.createElement('summary'), answer = document.createElement('div');
      summary.textContent = 'إظهار الإجابة'; answer.className = 'bank-answer'; answer.textContent = record.a;
      details.append(summary, answer); article.append(meta, title, details); fragment.appendChild(article);
    });
    if (!filtered.length) { const empty = document.createElement('p'); empty.textContent = 'لا توجد أسئلة تطابق البحث. جرّب كلمة أو مجالًا آخر.'; fragment.appendChild(empty); }
    byId('bankList').replaceChildren(fragment);
    byId('bankPage').textContent = (page + 1).toLocaleString('ar') + ' / ' + pages.toLocaleString('ar');
    byId('bankPrev').disabled = page === 0; byId('bankNext').disabled = page >= pages - 1;
  };
  byId('hbank').onclick = () => { byId('home').style.display = 'none'; byId('bank').hidden = false; page = 0; render(); byId('bankBack').focus(); window.scrollTo(0, 0); };
  byId('bankBack').onclick = () => { byId('bank').hidden = true; byId('home').style.display = 'flex'; byId('hbank').focus(); };
  byId('bankSearch').addEventListener('input', () => { page = 0; render(); });
  ['bankCategory','bankLetter'].forEach(id => byId(id).addEventListener('change', () => { page = 0; render(); }));
  byId('bankPrev').onclick = () => { page--; render(); byId('bankCount').scrollIntoView({ block: 'start' }); };
  byId('bankNext').onclick = () => { page++; render(); byId('bankCount').scrollIntoView({ block: 'start' }); };
})();
