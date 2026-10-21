/* سجل مشاهدة دائم. لا تُعاد تهيئته عند نفاد الأسئلة أو تحديث البنك. */
window.RafahaHistory = (() => {
  const normalize = value => String(value).normalize('NFKC')
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
    .toLowerCase().replace(/[^\u0621-\u064aa-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const canonicalAnswer = value => {
    let text = normalize(String(value).replace(/^ال(?=\S)/, '')).replace(/^(?:ظاهره|ظاهرة|تاثير|اثر|الضغط|ضغط) /, '');
    const aliases = {'مايسنر':'ميسنر','البرت اينشتاين':'اينشتاين','نيل ارمسترونغ':'نيل ارمسترونج','ارمسترونغ':'نيل ارمسترونج','سيف الدين قطز':'قطز','يوهان فولفغانغ غوته':'غوته','ويليام شكسبير':'شكسبير','وليم شكسبير':'شكسبير','شارل داروين':'داروين','تشارلز داروين':'داروين','الكسندر فلمنغ':'فلمنغ','الكسندر فليمنغ':'فلمنغ','نيكولاس كوبرنيكوس':'كوبرنيكوس','يوهان غوتنبرغ':'غوتنبرغ','ويلهلم رونتغن':'رونتجن','ليوناردو دا فنشي':'ليوناردو','ابراهام لينكولن':'لينكولن','ليون تولستوي':'تولستوي','ليو تولستوي':'تولستوي','فيودور دوستويفسكي':'دوستويفسكي'};
    return aliases[text] || text;
  };
  let db;
  let seen = new Set();
  const recentCategories = [];
  const all = () => window.RAFAHA_QUESTIONS || [];
  const wasSeen = q => seen.has(q.id) || (q.previousIds || []).some(id => seen.has(id));
  const errorMessage = 'تعذر فتح سجل الأسئلة أو حفظه. اسمح بتخزين بيانات الموقع وافتح اللعبة في نافذة عادية، ثم أعد تحميل الصفحة. لم نعرض سؤالًا جديدًا حتى لا يتكرر لاحقًا.';
  const shuffled = values => {
    const result = values.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const ready = new Promise((resolve, reject) => {
    if (!window.indexedDB || !all().length) {
      reject(new Error(!all().length ? 'تعذر تحميل بنك الأسئلة. اتصل بالإنترنت وأعد تحميل الصفحة.' : errorMessage));
      return;
    }
    const request = indexedDB.open('rafaha-question-history', 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      database.createObjectStore('seen');
      database.createObjectStore('meta');
    };
    request.onerror = () => reject(new Error(errorMessage));
    request.onblocked = () => reject(new Error('أغلق نسخ اللعبة الأخرى ثم أعد فتحها لإتاحة سجل الأسئلة.'));
    request.onsuccess = () => {
      db = request.result;
      db.onversionchange = () => db.close();
      let legacy = [];
      try {
        const raw = localStorage.getItem('hu2');
        if (raw !== null) {
          legacy = JSON.parse(raw);
          if (!Array.isArray(legacy) || legacy.some(q => typeof q !== 'string')) throw new Error('invalid history');
        }
      } catch (_) {
        reject(new Error('تعذر قراءة سجل الأسئلة السابق. لم نمسحه ولم نبدأ سجلًا جديدًا. احتفظ ببيانات الموقع لمعالجة السجل.'));
        return;
      }
      const tx = db.transaction(['seen', 'meta'], 'readwrite');
      const store = tx.objectStore('seen');
      const migrationKey = 'legacy-hu2-' + window.RAFAHA_BANK_VERSION;
      const marker = tx.objectStore('meta').get(migrationKey);
      marker.onsuccess = () => {
        if (!marker.result) {
          const old = legacy.map(normalize);
          const oldSet = new Set(old);
          const answers = window.RAFAHA_LEGACY_ANSWERS || {};
          const oldAnswers = new Set(old.map(q => answers[q]).filter(Boolean).map(canonicalAnswer));
          all().forEach(q => {
            const subject = normalize(q.subject || '');
            const match = oldSet.has(normalize(q.q)) || oldAnswers.has(canonicalAnswer(q.a)) || (subject.length >= 4 && old.some(text => (' ' + text + ' ').includes(' ' + subject + ' ')));
            if (match) store.put({ imported: true }, q.id);
          });
          tx.objectStore('meta').put(true, migrationKey);
        }
        const keys = store.getAllKeys();
        keys.onsuccess = () => {
          seen = new Set(keys.result);
          all().forEach(q => {
            if (!seen.has(q.id) && (q.previousIds || []).some(id => seen.has(id))) {
              store.put({ imported: true }, q.id); seen.add(q.id);
            }
          });
        };
      };
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(new Error(errorMessage));
    };
  });
  // Attach a handler immediately; callers still receive and display the original failure.
  ready.catch(() => {});
  const refresh = async () => {
    await ready;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('seen', 'readonly');
      const request = tx.objectStore('seen').getAllKeys();
      request.onsuccess = () => { seen = new Set(request.result); };
      tx.oncomplete = () => resolve(stats());
      tx.onerror = tx.onabort = () => reject(new Error(errorMessage));
    });
  };
  const eligible = (q, difficulty) => !difficulty || difficulty === 'mixed' || q.difficulty === difficulty;
  const stats = (difficulty = 'mixed') => {
    const remaining = all().filter(q => eligible(q, difficulty) && !wasSeen(q));
    const counts = {};
    remaining.forEach(q => { counts[q.letter] = (counts[q.letter] || 0) + 1; });
    return { total: all().length, remaining: remaining.length, seen: all().filter(wasSeen).length, counts };
  };
  const claim = async (letter, difficulty = 'mixed', reserve = 0) => {
    await ready;
    return new Promise((resolve, reject) => {
      let picked = null;
      const tx = db.transaction('seen', 'readwrite');
      const store = tx.objectStore('seen');
      const request = store.getAllKeys();
      request.onsuccess = () => {
        seen = new Set(request.result);
        let pool = all().filter(q => q.letter === letter && eligible(q, difficulty) && !wasSeen(q));
        if (pool.length <= reserve) return;
        // Mixed play chooses among available levels for this letter; exhausted levels are not recycled.
        if (difficulty === 'mixed' && pool.length) {
          const weights = [['سهل', 15], ['متوسط', 55], ['صعب', 30]].filter(([level]) => pool.some(q => q.difficulty === level));
          let roll = Math.random() * weights.reduce((sum, item) => sum + item[1], 0);
          const level = (weights.find(item => (roll -= item[1]) < 0) || weights[weights.length - 1])[0];
          pool = pool.filter(q => q.difficulty === level);
        }
        const varied = pool.filter(q => !recentCategories.includes(q.category));
        if (varied.length) pool = varied;
        if (!pool.length) return;
        picked = pool[Math.floor(Math.random() * pool.length)];
        store.add({ at: Date.now() }, picked.id);
        (picked.previousIds || []).forEach(id => store.put({ at: Date.now(), aliasFor: picked.id }, id));
      };
      // Resolve only after the record commits. Concurrent tabs share this transaction lock.
      tx.oncomplete = () => {
        if (picked) {
          seen.add(picked.id);
          (picked.previousIds || []).forEach(id => seen.add(id));
          recentCategories.push(picked.category);
          if (recentCategories.length > 3) recentCategories.shift();
        }
        resolve(picked);
      };
      tx.onerror = tx.onabort = () => reject(new Error(errorMessage));
    });
  };
  const layout = async (counts, size) => {
    await ready;
    return new Promise((resolve, reject) => {
      let result, problem;
      const tx = db.transaction('meta', 'readwrite');
      const store = tx.objectStore('meta');
      const request = store.get('last-layout');
      request.onsuccess = () => {
        const previous = Array.isArray(request.result) ? request.result : [];
        const capacity = {};
        Object.keys(counts).forEach(letter => {
          const forbidden = previous.slice(0, size).filter(value => value === letter).length;
          capacity[letter] = Math.min(counts[letter], size - forbidden);
        });
        const letters = shuffled(Object.keys(capacity).filter(letter => capacity[letter] > 0));
        const used = {}, bag = [];
        // Use each available letter before repeating any, and never allocate more cells than unseen questions.
        while (bag.length < size) {
          let added = false;
          for (const letter of letters) {
            if ((used[letter] || 0) < capacity[letter]) {
              bag.push(letter); used[letter] = (used[letter] || 0) + 1; added = true;
              if (bag.length === size) break;
            }
          }
          if (!added) break;
        }
        if (bag.length < size) { problem = 'لا تسمح الأسئلة والحروف المتبقية بتوزيع جديد لهذه اللوحة في المستوى المختار. اختر حجمًا أصغر أو مستوى آخر.'; return; }
        // Match individual letter tokens to cells whose previous letter differs. Repeated letters remain valid tokens.
        const owners = Array(size).fill(-1);
        const positions = bag.map(letter => shuffled(Array.from({ length: size }, (_, i) => i).filter(i => previous[i] !== letter)));
        const place = (token, visited) => {
          for (const index of positions[token]) {
            if (visited.has(index)) continue;
            visited.add(index);
            if (owners[index] < 0 || place(owners[index], visited)) { owners[index] = token; return true; }
          }
          return false;
        };
        for (const token of shuffled(Array.from({ length: size }, (_, i) => i))) {
          if (!place(token, new Set())) { problem = 'لا تسمح الحروف المتبقية بتوزيع جديد يغيّر كل المواضع. اختر مستوى آخر أو لوحة أصغر؛ لن نكرر أسئلة سابقة.'; return; }
        }
        result = owners.map(token => bag[token]);
        store.put(result, 'last-layout');
      };
      tx.oncomplete = () => problem ? reject(new Error(problem)) : resolve(result);
      tx.onerror = tx.onabort = () => reject(new Error(errorMessage));
    });
  };
  return { ready, refresh, stats, claim, layout };
})();
