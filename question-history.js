/* سجل مشاهدة دائم. لا تُعاد تهيئته عند نفاد الأسئلة أو تحديث البنك. */
window.RafahaHistory = (() => {
  const normalize = value => String(value).normalize('NFKC')
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
    .toLowerCase().replace(/[^\u0621-\u064aa-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const canonicalAnswer = value => {
    let text = normalize(value).replace(/^(?:ظاهره|ظاهرة|تاثير|اثر) /, '');
    const aliases = {'مايسنر':'ميسنر','البرت اينشتاين':'اينشتاين','نيل ارمسترونغ':'نيل ارمسترونج','ارمسترونغ':'نيل ارمسترونج','سيف الدين قطز':'قطز','يوهان فولفغانغ غوته':'غوته','ويليام شكسبير':'شكسبير','وليم شكسبير':'شكسبير','شارل داروين':'داروين','تشارلز داروين':'داروين','الكسندر فلمنغ':'فلمنغ','الكسندر فليمنغ':'فلمنغ','نيكولاس كوبرنيكوس':'كوبرنيكوس','يوهان غوتنبرغ':'غوتنبرغ','ويلهلم رونتغن':'رونتجن','ليوناردو دا فنشي':'ليوناردو','ابراهام لينكولن':'لينكولن','ليون تولستوي':'تولستوي','ليو تولستوي':'تولستوي','فيودور دوستويفسكي':'دوستويفسكي'};
    return aliases[text] || text.replace(/^ال(?=.{3})/, '');
  };
  let db;
  let seen = new Set();
  const recentCategories = [];
  const all = () => window.RAFAHA_QUESTIONS || [];
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
        keys.onsuccess = () => { seen = new Set(keys.result); };
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
  const stats = () => {
    const remaining = all().filter(q => !seen.has(q.id));
    const counts = {};
    remaining.forEach(q => { counts[q.letter] = (counts[q.letter] || 0) + 1; });
    return { total: all().length, remaining: remaining.length, seen: all().length - remaining.length, counts };
  };
  const claim = async letter => {
    await ready;
    return new Promise((resolve, reject) => {
      let picked = null;
      const tx = db.transaction('seen', 'readwrite');
      const store = tx.objectStore('seen');
      const request = store.getAllKeys();
      request.onsuccess = () => {
        seen = new Set(request.result);
        let pool = all().filter(q => q.letter === letter && !seen.has(q.id));
        const varied = pool.filter(q => !recentCategories.includes(q.category));
        if (varied.length) pool = varied;
        if (!pool.length) return;
        picked = pool[Math.floor(Math.random() * pool.length)];
        store.add({ at: Date.now() }, picked.id);
      };
      // Resolve only after the record commits. Concurrent tabs share this transaction lock.
      tx.oncomplete = () => {
        if (picked) {
          seen.add(picked.id);
          recentCategories.push(picked.category);
          if (recentCategories.length > 3) recentCategories.shift();
        }
        resolve(picked);
      };
      tx.onerror = tx.onabort = () => reject(new Error(errorMessage));
    });
  };
  const layout = async (alphabet, size) => {
    await ready;
    return new Promise((resolve, reject) => {
      let result;
      const tx = db.transaction('meta', 'readwrite');
      const store = tx.objectStore('meta');
      const request = store.get('last-layout');
      request.onsuccess = () => {
        const previous = Array.isArray(request.result) ? request.result : [];
        result = shuffled(alphabet).slice(0, size);
        for (let i = 0; i < result.length; i++) {
          if (result[i] === previous[i]) {
            const j = (i + 1) % result.length;
            [result[i], result[j]] = [result[j], result[i]];
          }
        }
        store.put(result, 'last-layout');
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(new Error(errorMessage));
    });
  };
  return { ready, refresh, stats, claim, layout };
})();
