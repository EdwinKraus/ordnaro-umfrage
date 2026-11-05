/* Ordnaro-Umfrage: Schritt-für-Schritt-Formular, sendet beim Absenden per POST (no-cors) an das
   veröffentlichte Google-Formular. Keine Cookies, kein Speicher, keine weiteren Anfragen.
   Fragen, Optionen und Entry-IDs kommen aus umfrage-config.js (vom Builder aus den Live-Formularen erzeugt). */
(function () {
  'use strict';
  var ALL = window.ORDNARO_UMFRAGE;
  if (!ALL) return;
  var params = new URLSearchParams(location.search);
  var lang = pickLang();
  var C = ALL[lang], U = C.ui, Q = C.questions;
  var CODE_RE = new RegExp(ALL.codePattern);
  var rawCode = (params.get('c') || '').trim().toUpperCase();
  var linkCode = CODE_RE.test(rawCode) ? rawCode : '';
  var steps = C.steps, cur = 0, sending = false;
  var main = document.getElementById('inhalt');

  function pickLang() {
    var p = (params.get('lang') || '').toLowerCase();
    if (p === 'de' || p === 'en') return p;
    var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < list.length; i++) {
      var l = String(list[i] || '').toLowerCase();
      if (l.indexOf('de') === 0) return 'de';
      if (l.indexOf('en') === 0) return 'en';
    }
    return 'en';
  }

  /* ---------- kleine DOM-Helfer ---------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c !== null && c !== undefined && c !== false) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o[k] !== undefined ? o[k] : ''; }); }
  /** Text mit https-Links und E-Mail-Adressen als Links (alles andere bleibt Text). */
  function linkify(text, opts) {
    var frag = document.createDocumentFragment();
    var re = /(https:\/\/[^\s]+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      var url = m[1], mail = m[2];
      if (url && opts && opts.replaceUrl) frag.appendChild(el('a', { href: opts.replaceUrl.href, text: opts.replaceUrl.text }));
      else frag.appendChild(el('a', url ? { href: url, rel: 'noopener', target: '_blank', text: url } : { href: 'mailto:' + mail, text: mail }));
      last = re.lastIndex;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    return frag;
  }
  function o0(q) { return q.options[0] || ''; }
  function privacyHref() { return lang === 'de' ? 'datenschutz.html' : 'privacy.html'; }

  /* ---------- Kopf, Fuß, Sprache ---------- */
  function setupChrome() {
    document.documentElement.lang = lang;
    document.title = C.title;
    var skip = document.querySelector('.skip'); if (skip) skip.textContent = U.skip;
    var nav = document.getElementById('sprache');
    nav.setAttribute('aria-label', U.langLabel);
    nav.textContent = '';
    [['en', 'EN', 'English'], ['de', 'DE', 'Deutsch']].forEach(function (x) {
      var q = new URLSearchParams(); q.set('lang', x[0]); if (linkCode) q.set('c', linkCode);
      nav.appendChild(el('a', { href: '?' + q.toString(), lang: x[0], hreflang: x[0], 'aria-current': x[0] === lang ? 'true' : null, 'aria-label': x[1] + ' – ' + x[2], text: x[1] }));
    });
    var f = document.getElementById('fuss-text');
    f.textContent = '';
    f.appendChild(el('p', { text: U.provider }));
    f.appendChild(el('p', null, [linkify(U.contact)]));
    f.appendChild(el('p', { text: U.noCookies }));
    f.appendChild(el('ul', null, [
      el('li', null, [el('a', { href: privacyHref(), text: U.privacyLink })]),
      el('li', null, [el('a', { href: fallbackUrl(false), rel: 'noopener', text: U.googleAlt })])
    ]));
  }

  /* ---------- Einleitung ---------- */
  function renderIntro() {
    var t = C.title.replace(/^Ordnaro\s*[–-]\s*/, '');
    var hero = el('section', { class: 'hero', 'aria-labelledby': 'titel' }, [
      el('div', { class: 'wrap' }, [
        el('div', null, [
          el('p', { class: 'kicker', text: U.kicker }),
          el('h1', { id: 'titel', text: t }),
          el('p', { class: 'lead', text: C.intro }),
          el('a', { class: 'btn btn-haupt', href: '#umfrage', onclick: function (e) { e.preventDefault(); startSurvey(); }, text: U.start })
        ]),
        el('aside', { class: 'vorteil', 'aria-labelledby': 'vorteil-titel' }, [
          el('h2', { id: 'vorteil-titel', text: U.youGet }),
          el('ul', { class: 'haken' }, U.get.map(function (g) { return el('li', { text: g }); }))
        ])
      ])
    ]);
    var ex = el('section', { class: 'abschnitt', 'aria-labelledby': 'beispiele-titel', style: null }, [
      el('div', { class: 'wrap' }, [
        el('div', { class: 'trenner' }, [el('span', { class: 'reiter', 'aria-hidden': 'true', text: C.s1 })]),
        el('h2', { id: 'beispiele-titel', class: 'vh', text: C.s1 }),
        el('div', { class: 'bilder' }, C.images.map(function (im) {
          return el('figure', null, [
            el('img', { src: im.src, srcset: im.srcset, sizes: '(min-width: 860px) 36rem, 100vw', width: '1600', height: '900', loading: 'lazy', decoding: 'async', alt: im.alt }),
            el('figcaption', null, [el('b', { text: im.title }), im.caption])
          ]);
        })),
        el('div', { class: 'karte ziele' }, [
          el('h3', { text: C.goals.title }),
          el('p', { text: C.goals.lead }),
          el('ul', { class: 'haken' }, C.goals.items.map(function (g) { return el('li', { text: g }); }))
        ]),
        el('p', { class: 'ds-kurz' }, [linkify(C.privacyShort, { replaceUrl: { href: privacyHref(), text: U.privacyFull } })])
      ])
    ]);
    main.appendChild(hero);
    main.appendChild(ex);
  }

  /* ---------- Umfrage ---------- */
  var form, stepEls = [], progText, progBar, progFill, btnBack, btnNext, statusEl, survey;

  function renderSurvey() {
    progText = el('p', { class: 'fortschritt-text', id: 'fs-text' });
    progFill = el('span');
    progBar = el('div', { class: 'fortschritt', role: 'progressbar', 'aria-labelledby': 'fs-text', 'aria-valuemin': '1' }, [progFill]);
    btnBack = el('button', { type: 'button', class: 'btn btn-neben', onclick: back, text: U.back });
    btnNext = el('button', { type: 'submit', class: 'btn btn-haupt', text: U.next });
    statusEl = el('div', { class: 'vh', role: 'status', 'aria-live': 'polite' });
    form = el('form', { id: 'formular', novalidate: true, onsubmit: function (e) { e.preventDefault(); next(); } });
    steps.forEach(function (s, i) { var n = renderStep(s, i); stepEls.push(n); form.appendChild(n); });
    form.appendChild(el('div', { class: 'knoepfe' }, [btnBack, btnNext]));
    survey = el('section', { id: 'umfrage', class: 'umfrage', 'aria-labelledby': 'umfrage-titel' }, [
      el('div', { class: 'wrap schmal' }, [
        el('div', { class: 'trenner r-dunkel' }, [el('span', { class: 'reiter', 'aria-hidden': 'true', text: U.surveyTab })]),
        el('h2', { id: 'umfrage-titel', class: 'vh', text: U.surveyTab }),
        el('p', { class: 'pflicht-hinweis', text: U.requiredNote }),
        el('div', { class: 'fortschritt-box' }, [progText, progBar]),
        el('div', { class: 'karte', id: 'karte' }, [form]),
        statusEl
      ])
    ]);
    main.appendChild(survey);
    show(0, false);
  }

  function req(q) { return q.required ? [el('span', { class: 'pflicht', 'aria-hidden': 'true', text: ' *' }), el('span', { class: 'vh', text: ' ' + U.requiredSr })] : []; }

  function renderStep(s, i) {
    var wrap = el('div', { class: 'schritt', 'data-i': String(i), hidden: true });
    var page = C.pages[s.page] || {};
    if (page.title && page.title !== s.title) wrap.appendChild(el('p', { class: 'abschnitt-name', text: page.title }));
    if (s.keys.length === 1 && !s.title) {
      wrap.appendChild(renderQuestion(s.keys[0], true));
    } else {
      wrap.appendChild(el('h3', { tabindex: '-1', class: 'schritt-titel', text: s.title }));
      if (s.help) wrap.appendChild(el('p', { class: 'schritt-hilfe', text: s.help }));
      if (s.offer) wrap.appendChild(offerBox('h4'));
      s.keys.forEach(function (k) { wrap.appendChild(renderQuestion(k, false)); });
    }
    return wrap;
  }

  function offerBox(hTag) {
    return el('div', { class: 'angebot' }, [
      el(hTag, { text: C.offer.title }),
      C.offer.lead ? el('p', { text: C.offer.lead }) : null,
      el('ul', null, C.offer.items.map(function (x) { return el('li', { text: x }); }))
    ]);
  }

  function renderQuestion(key, asHeading) {
    var q = Q[key], id = 'f-' + key, helpId = 'h-' + key, errId = 'e-' + key;
    var describedby = (q.help ? helpId + ' ' : '') + errId;
    var titleKids = [q.title].concat(req(q));
    var help = q.help ? el('p', { class: 'hilfe', id: helpId, text: q.help }) : null;
    var err = el('p', { class: 'fehler', id: errId, hidden: true });
    var box;
    if (q.type === 'MULTIPLE_CHOICE' || q.type === 'CHECKBOX') {
      var isCb = q.type === 'CHECKBOX';
      var legendInner = asHeading ? el('h3', { tabindex: '-1', class: 'schritt-titel' }, titleKids) : el('span', { class: 'frage-titel' }, titleKids);
      var opts = el('div', { class: 'optionen' + (q.options.length > 5 && !isCb ? '' : '') });
      q.options.forEach(function (o, j) {
        var inp = el('input', { type: isCb ? 'checkbox' : 'radio', name: key, value: o, id: id + '-' + j, required: (!isCb && q.required) ? true : null });
        var lab = el('span');
        lab.textContent = o; // Einwilligung: exakt der Formulartext, ohne Link in der Beschriftung (Tippfläche)
        opts.appendChild(el('label', { class: 'option', for: id + '-' + j }, [inp, lab]));
      });
      if (q.other) {
        var oj = q.options.length;
        var oi = el('input', { type: isCb ? 'checkbox' : 'radio', name: key, value: '__other_option__', id: id + '-o' });
        var ot = el('input', { type: 'text', id: id + '-ot', 'aria-label': U.otherLabel, 'data-other': key });
        ot.addEventListener('input', function () { if (ot.value) oi.checked = true; });
        opts.appendChild(el('label', { class: 'option', for: id + '-o' }, [oi, el('span', { text: U.otherLabel })]));
        opts.appendChild(ot);
        void oj;
      }
      var extra = null;
      if (key === 'einwilligung') {
        var gdoc = (o0(q).match(/https:\/\/\S+/) || [])[0];
        extra = el('p', { class: 'hilfe ds-links' }, [U.privacyLink + ': ', el('a', { href: privacyHref(), text: U.privacyHere }),
          gdoc ? ' · ' : null, gdoc ? el('a', { href: gdoc, rel: 'noopener', target: '_blank', text: U.privacyGoogle }) : null]);
      }
      box = el('fieldset', { class: 'frage', 'data-key': key, 'aria-describedby': describedby }, [el('legend', null, [legendInner]), help, opts, extra, err]);
      if (!isCb && !q.required) {
        var clr = el('button', { type: 'button', class: 'link-knopf', hidden: true, text: U.clear, onclick: function () {
          form.querySelectorAll('input[name="' + key + '"]').forEach(function (x) { x.checked = false; });
          clr.hidden = true; var first = form.querySelector('input[name="' + key + '"]'); if (first) first.focus();
        } });
        opts.addEventListener('change', function () { clr.hidden = !getVal(key); });
        box.appendChild(clr);
      }
    } else {
      var label = el('label', { for: id }, titleKids);
      var head = asHeading ? el('h3', { tabindex: '-1', class: 'schritt-titel' }, [label]) : el('div', { class: 'frage-titel' }, [label]);
      var v = q.validation || {};
      var attrs = { id: id, name: key, 'aria-describedby': describedby, required: q.required ? true : null };
      var input;
      if (q.type === 'PARAGRAPH_TEXT') {
        if (v.kind === 'maxlen') attrs.maxlength = String(v.max);
        input = el('textarea', attrs);
      } else {
        attrs.type = v.kind === 'email' ? 'email' : 'text';
        if (v.kind === 'email') { attrs.autocomplete = 'email'; attrs.inputmode = 'email'; attrs.spellcheck = 'false'; }
        if (v.kind === 'between') { attrs.inputmode = 'decimal'; attrs.class = 'kurz'; attrs.autocomplete = 'off'; }
        if (key === 'ref_code') { attrs.class = 'kurz'; attrs.autocapitalize = 'characters'; attrs.autocomplete = 'off'; attrs.spellcheck = 'false'; attrs.maxlength = '8'; }
        if (key === 'zeitzone') attrs.autocomplete = 'off';
        input = el('input', attrs);
      }
      var kids = [head, help, input];
      if (v.kind === 'maxlen') {
        var cnt = el('p', { class: 'zaehler', 'aria-live': 'polite', text: fmt(U.chars, { n: 0, max: v.max }) });
        input.addEventListener('input', function () { cnt.textContent = fmt(U.chars, { n: input.value.length, max: v.max }); });
        kids.push(cnt);
      }
      if (key === 'ref_code') {
        input.addEventListener('input', function () { var p = input.selectionStart; input.value = input.value.toUpperCase(); try { input.setSelectionRange(p, p); } catch (e) { /* email/number types */ } });
        if (linkCode) { input.value = linkCode; kids.push(el('p', { class: 'code-hinweis', text: U.codeFromLink })); }
      }
      kids.push(err);
      box = el('div', { class: 'frage', 'data-key': key }, kids);
    }
    return box;
  }

  /* ---------- Werte, Prüfung ---------- */
  function getVal(key) {
    var q = Q[key];
    if (q.type === 'CHECKBOX') return Array.prototype.map.call(form.querySelectorAll('input[name="' + key + '"]:checked'), function (x) { return x.value; });
    if (q.type === 'MULTIPLE_CHOICE') { var c = form.querySelector('input[name="' + key + '"]:checked'); return c ? c.value : ''; }
    var f = form.querySelector('[name="' + key + '"]');
    return f ? f.value.trim() : '';
  }
  function isEmpty(v) { return Array.isArray(v) ? v.length === 0 : !v; }
  function normNumber(s) { return s.replace(/\s/g, '').replace(',', '.'); }

  function checkKey(key) {
    var q = Q[key], v = getVal(key), vd = q.validation || {};
    if (isEmpty(v)) return q.required ? U.required : '';
    if (q.other) {
      var ot = form.querySelector('[data-other="' + key + '"]');
      var sel = Array.isArray(v) ? v.indexOf('__other_option__') > -1 : v === '__other_option__';
      if (sel && ot && !ot.value.trim()) return U.required;
    }
    if (Array.isArray(v)) return '';
    if (vd.kind === 'between') {
      var n = normNumber(v);
      if (!/^\d+(\.\d+)?$/.test(n) || Number(n) < vd.min || Number(n) > vd.max) return vd.msg;
    } else if (vd.kind === 'maxlen') {
      if (v.length > vd.max) return vd.msg;
    } else if (vd.kind === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return vd.msg;
    } else if (vd.kind === 'regex') {
      if (!new RegExp(vd.pattern).test(v)) return vd.msg;
    }
    return '';
  }

  function setError(key, msg) {
    var box = form.querySelector('[data-key="' + key + '"]'), err = document.getElementById('e-' + key);
    err.textContent = msg || ''; err.hidden = !msg;
    box.classList.toggle('ungueltig', !!msg);
    box.querySelectorAll('input,textarea').forEach(function (x) { if (msg) x.setAttribute('aria-invalid', 'true'); else x.removeAttribute('aria-invalid'); });
  }

  function validateStep(i) {
    var firstBad = null;
    steps[i].keys.forEach(function (k) {
      var msg = checkKey(k); setError(k, msg);
      if (msg && !firstBad) firstBad = k;
    });
    if (firstBad) {
      var box = form.querySelector('[data-key="' + firstBad + '"]');
      var target = box.querySelector('input:checked') || box.querySelector('input,textarea');
      if (target) target.focus();
      return false;
    }
    return true;
  }

  /* ---------- Navigation ---------- */
  function active(i) {
    var s = steps[i];
    if (!s.showIf) return true;
    return getVal(s.showIf.key) === Q[s.showIf.key].options[s.showIf.option];
  }
  function visibleIdx() { var a = []; for (var i = 0; i < steps.length; i++) if (active(i)) a.push(i); return a; }

  function show(i, focus) {
    cur = i;
    stepEls.forEach(function (n, j) { n.hidden = j !== i; });
    var vis = visibleIdx(), pos = vis.indexOf(i) + 1, total = vis.length;
    progText.textContent = fmt(U.progress, { i: pos, n: total });
    progBar.setAttribute('aria-valuemax', String(total));
    progBar.setAttribute('aria-valuenow', String(pos));
    progFill.style.width = Math.round(pos / total * 100) + '%';
    btnBack.hidden = pos === 1;
    btnNext.textContent = pos === total ? U.submit : U.next;
    if (focus) {
      var h = stepEls[i].querySelector('.schritt-titel');
      survey.scrollIntoView({ block: 'start', behavior: 'instant' });
      if (h) h.focus({ preventScroll: true });
    }
  }

  function next() {
    if (sending) return;
    if (!validateStep(cur)) return;
    var vis = visibleIdx(), pos = vis.indexOf(cur);
    if (pos === vis.length - 1) { submit(); return; }
    show(vis[pos + 1], true);
  }
  function back() {
    var vis = visibleIdx(), pos = vis.indexOf(cur);
    if (pos > 0) show(vis[pos - 1], true);
  }
  function startSurvey() {
    survey.scrollIntoView({ block: 'start', behavior: 'instant' });
    var h = stepEls[cur].querySelector('.schritt-titel');
    if (h) h.focus({ preventScroll: true });
  }

  /* ---------- Absenden ---------- */
  function activeKeys() {
    var keys = [];
    steps.forEach(function (s, i) { if (active(i)) keys = keys.concat(s.keys); });
    return keys;
  }
  function appendAnswer(p, key, forPrefill) {
    var q = Q[key], v = getVal(key), name = 'entry.' + q.entry;
    if (isEmpty(v)) return;
    if (forPrefill && key === 'einwilligung') return; // Einwilligung nie vorausfüllen
    var vals = Array.isArray(v) ? v : [v];
    vals.forEach(function (x) {
      if (q.validation && q.validation.kind === 'between') x = normNumber(x);
      p.append(name, x);
      if (x === '__other_option__') {
        var ot = form.querySelector('[data-other="' + key + '"]');
        p.append(name + '.other_option_response', ot ? ot.value.trim() : '');
      }
    });
  }
  function buildBody() {
    var p = new URLSearchParams();
    activeKeys().forEach(function (k) { appendAnswer(p, k, false); });
    p.append('fvv', '1');
    p.append('pageHistory', C.pageHistory);
    return p;
  }
  function fallbackUrl(withAnswers) {
    var p = new URLSearchParams(); p.set('usp', 'pp_url');
    if (withAnswers && form) activeKeys().forEach(function (k) { appendAnswer(p, k, true); });
    else if (linkCode) p.set('entry.' + Q.ref_code.entry, linkCode);
    return C.viewform + '?' + p.toString();
  }

  function submit() {
    sending = true;
    btnNext.disabled = true; btnBack.disabled = true;
    btnNext.textContent = U.sending;
    statusEl.textContent = U.sending;
    var old = document.getElementById('sende-fehler'); if (old) old.remove();
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    var req = (navigator.onLine === false) ? Promise.reject(new Error('offline'))
      : fetch(C.action, { method: 'POST', mode: 'no-cors', body: buildBody(), credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctrl ? ctrl.signal : undefined });
    req.then(function () { clearTimeout(timer); thanks(); }, function () { clearTimeout(timer); sendError(); });
  }

  function sendError() {
    sending = false;
    btnNext.disabled = false; btnBack.disabled = false;
    btnNext.textContent = U.submit;
    var box = el('div', { class: 'meldung', id: 'sende-fehler', role: 'alert' }, [
      el('h4', { text: U.netErrTitle }),
      el('p', { text: U.netErrText }),
      el('div', { class: 'knopfreihe' }, [
        el('button', { type: 'button', class: 'btn btn-haupt btn-klein', onclick: function () { submit(); }, text: U.retry }),
        el('a', { class: 'btn btn-neben btn-klein', href: fallbackUrl(true), rel: 'noopener', target: '_blank', text: U.fallback })
      ])
    ]);
    form.insertBefore(box, form.querySelector('.knoepfe'));
    box.scrollIntoView({ block: 'center', behavior: 'instant' });
  }

  function thanks() {
    var call = getVal('gespraech') === Q.gespraech.options[0];
    var code = getVal('ref_code');
    var h = el('h2', { tabindex: '-1', text: U.thanksTitle });
    var card = el('div', { class: 'karte danke' }, [
      h,
      el('p', { text: U.confirmation }),
      code ? el('p', { text: fmt(U.yourCode, { code: code }) }) : null,
      offerBox('h3'),
      el('p', { class: 'gespraech' }, [linkify(call ? U.callYes : U.callNo)]),
      el('p', null, [el('a', { href: privacyHref(), text: U.privacyLink })])
    ]);
    var k = document.getElementById('karte');
    k.replaceWith(card);
    progText.parentNode.hidden = true;
    survey.querySelector('.pflicht-hinweis').hidden = true;
    statusEl.textContent = U.thanksTitle;
    survey.scrollIntoView({ block: 'start', behavior: 'instant' });
    h.focus({ preventScroll: true });
  }

  /* ---------- Start ---------- */
  var ns = document.getElementById('ohne-js'); if (ns) ns.remove();
  setupChrome();
  renderIntro();
  renderSurvey();
})();
