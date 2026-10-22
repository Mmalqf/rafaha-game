/* إنشاء الباركود محليًا؛ لا يُرسل رابط اللعبة إلى خدمة خارجية. */
(() => {
  const el = id => document.getElementById(id);
  const dialog = el('presenterQrDialog');
  let opener;
  const draw = text => {
    const code = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.MEDIUM);
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    const margin = 4, size = code.size + margin * 2;
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'باركود فتح جوال المقدّم'); svg.setAttribute('shape-rendering', 'crispEdges');
    const background = document.createElementNS(svgNS, 'rect'); background.setAttribute('width', String(size)); background.setAttribute('height', String(size)); background.setAttribute('fill', '#fff'); svg.appendChild(background);
    const modules = [];
    for (let y = 0; y < code.size; y++) for (let x = 0; x < code.size; x++) if (code.getModule(x, y)) modules.push(`M${x + margin},${y + margin}h1v1h-1z`);
    const path = document.createElementNS(svgNS, 'path'); path.setAttribute('d', modules.join('')); path.setAttribute('fill', '#000'); svg.appendChild(path);
    el('presenterQrCode').replaceChildren(svg);
  };
  const open = event => {
    opener = event.currentTarget;
    const url = new URL('presenter.html', location.href);
    url.searchParams.set('level', el('difficulty').value);
    const shareable = /^https?:$/.test(url.protocol) && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    el('presenterUrl').value = shareable ? url.href : '';
    el('presenterOpen').hidden = !shareable; el('presenterCopy').disabled = !shareable;
    el('presenterQrCode').replaceChildren();
    if (shareable) {
      el('presenterOpen').href = url.href;
      try { draw(url.href); el('presenterQrStatus').textContent = 'المستوى نفسه المختار في الصفحة الرئيسية. لا تعرض هذه الصفحة على شاشة اللاعبين بعد مسح الرمز.'; }
      catch (_) { el('presenterQrStatus').textContent = 'تعذر رسم الباركود؛ انسخ رابط المقدّم أو افتحه مباشرة.'; }
    } else {
      el('presenterOpen').removeAttribute('href');
      el('presenterQrStatus').textContent = 'افتح اللعبة من رابطها المنشور لإنشاء باركود يمكن للجوال الثاني الوصول إليه. ملف الجهاز المحلي ليس رابط مشاركة.';
    }
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  };
  ['presenterQrHome', 'presenterQrSetup', 'presenterQrBank'].forEach(id => el(id).addEventListener('click', open));
  el('presenterQrClose').onclick = () => { if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open'); if (opener) opener.focus(); };
  el('presenterCopy').onclick = async () => {
    const text = el('presenterUrl').value;
    if (!text) return;
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard');
      await navigator.clipboard.writeText(text); el('presenterQrStatus').textContent = 'تم نسخ رابط المقدّم.';
    } catch (_) { el('presenterUrl').focus(); el('presenterUrl').select(); el('presenterQrStatus').textContent = 'اضغط مطولًا على الرابط المحدد واختر نسخ، ثم أرسله للجوال الثاني.'; }
  };
})();
