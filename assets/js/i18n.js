/* =========================================================
   UU — i18n engine (KK / RU / EN / ZH / UZ / KY)
   Static JSON dictionaries + data-i18n DOM binding
   ========================================================= */
(function () {
  "use strict";

  var LANGS = [
    { code: "kk", code3: "ҚАЗ", name: "Қазақша" },
    { code: "ru", code3: "РУС", name: "Русский" },
    { code: "en", code3: "ENG", name: "English" },
    { code: "zh", code3: "中文", name: "中文" },
    { code: "uz", code3: "UZB", name: "O'zbekcha" },
    { code: "ky", code3: "КЫР", name: "Кыргызча" },
  ];
  var STORAGE_KEY = "uu_lang";
  var cache = {};

  function qsa(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  function getSaved() {
    try {
      return localStorage.getItem(STORAGE_KEY) || "kk";
    } catch (e) {
      return "kk";
    }
  }
  function save(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
  }

  function getByPath(obj, path) {
    return path.split(".").reduce(function (o, k) {
      return o && o[k] !== undefined ? o[k] : undefined;
    }, obj);
  }

  function loadDict(lang) {
    if (cache[lang]) return Promise.resolve(cache[lang]);
    return fetch("assets/i18n/" + lang + ".json")
      .then(function (r) {
        return r.json();
      })
      .then(function (json) {
        cache[lang] = json;
        return json;
      });
  }

  function applyDict(dict, lang) {
    qsa("[data-i18n]").forEach(function (el) {
      var val = getByPath(dict, el.getAttribute("data-i18n"));
      if (val !== undefined) el.textContent = val;
    });
    qsa("[data-i18n-html]").forEach(function (el) {
      var val = getByPath(dict, el.getAttribute("data-i18n-html"));
      if (val !== undefined) el.innerHTML = val;
    });
    qsa("[data-i18n-ph]").forEach(function (el) {
      var val = getByPath(dict, el.getAttribute("data-i18n-ph"));
      if (val !== undefined) el.setAttribute("placeholder", val);
    });
    qsa("[data-i18n-content]").forEach(function (el) {
      var val = getByPath(dict, el.getAttribute("data-i18n-content"));
      if (val !== undefined) el.setAttribute("content", val);
    });
    qsa("[data-i18n-aria]").forEach(function (el) {
      var val = getByPath(dict, el.getAttribute("data-i18n-aria"));
      if (val !== undefined) el.setAttribute("aria-label", val);
    });

    document.documentElement.setAttribute("lang", lang === "zh" ? "zh-Hans" : lang);

    var current = LANGS.filter(function (l) {
      return l.code === lang;
    })[0];
    qsa("[data-lang-current]").forEach(function (el) {
      if (current) el.textContent = current.code3;
    });
    qsa("[data-lang-option]").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-lang-option") === lang);
    });
  }

  function setLanguage(lang) {
    save(lang);
    loadDict(lang)
      .then(function (dict) {
        applyDict(dict, lang);
      })
      .catch(function (err) {
        console.error("i18n: failed to load", lang, err);
      });
    qsa("[data-lang-switch]").forEach(function (sw) {
      sw.classList.remove("open");
    });
  }

  function initSwitchers() {
    qsa("[data-lang-trigger]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var sw = btn.closest("[data-lang-switch]");
        var willOpen = !sw.classList.contains("open");
        qsa("[data-lang-switch]").forEach(function (s) {
          s.classList.remove("open");
        });
        if (willOpen) sw.classList.add("open");
      });
    });
    document.addEventListener("click", function () {
      qsa("[data-lang-switch]").forEach(function (s) {
        s.classList.remove("open");
      });
    });
    qsa("[data-lang-option]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        setLanguage(btn.getAttribute("data-lang-option"));
      });
    });
  }

  function init() {
    initSwitchers();
    var lang = getSaved();
    loadDict(lang).then(function (dict) {
      applyDict(dict, lang);
    });
  }

  window.UUI18n = { init: init, setLanguage: setLanguage, LANGS: LANGS };
})();
