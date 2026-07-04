/* =========================================================
   UU — shared site behaviour
   Partial includes, nav, floating CTA, popup, carousels, reveals
   ========================================================= */

(function () {
  "use strict";

  /* ---------- helpers ---------- */
  function currentPage() {
    var path = window.location.pathname.split("/").pop() || "index.html";
    if (path === "") path = "index.html";
    return path;
  }

  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- include partials (header/footer) ---------- */
  function includePartials(callback) {
    var slots = qsa("[data-include]");
    if (!slots.length) { callback(); return; }
    var pending = slots.length;
    slots.forEach(function (slot) {
      var name = slot.getAttribute("data-include");
      fetch("partials/" + name + ".html")
        .then(function (r) { return r.text(); })
        .then(function (html) {
          slot.outerHTML = html;
        })
        .catch(function () { /* silent */ })
        .finally(function () {
          pending -= 1;
          if (pending === 0) callback();
        });
    });
  }

  /* ---------- nav active state + mobile menu ---------- */
  function initNav() {
    var page = currentPage();
    qsa("[data-nav-link]").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("/").pop();
      if (href === page) a.classList.add("active");
    });

    qsa("[data-dropdown]").forEach(function (dd) {
      var btn = dd.querySelector("[data-dropdown-btn]");
      if (!btn) return;
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var willOpen = !dd.classList.contains("open");
        qsa("[data-dropdown]").forEach(function (o) { o.classList.remove("open"); });
        if (willOpen) dd.classList.add("open");
      });
    });
    document.addEventListener("click", function () {
      qsa("[data-dropdown]").forEach(function (o) { o.classList.remove("open"); });
    });

    var hamburger = document.querySelector("[data-menu-open]");
    var closeBtn = document.querySelector("[data-menu-close]");
    var menu = document.querySelector("[data-mobile-menu]");
    if (!hamburger || !menu) return;

    function openMenu() {
      menu.classList.add("open");
      document.body.classList.add("menu-open");
      hamburger.setAttribute("aria-expanded", "true");
    }
    function closeMenu() {
      menu.classList.remove("open");
      document.body.classList.remove("menu-open");
      hamburger.setAttribute("aria-expanded", "false");
    }
    hamburger.addEventListener("click", openMenu);
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);
    var backdrop = menu.querySelector("[data-menu-backdrop]");
    if (backdrop) backdrop.addEventListener("click", closeMenu);
    qsa("[data-mobile-menu] a").forEach(function (a) { a.addEventListener("click", closeMenu); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* ---------- floating messenger CTA ---------- */
  function initFloatingCta() {
    var fab = document.querySelector("[data-fab]");
    if (!fab) return;
    var toggle = fab.querySelector("[data-fab-toggle]");
    toggle.addEventListener("click", function () {
      fab.classList.toggle("open");
    });
    document.addEventListener("click", function (e) {
      if (!fab.contains(e.target)) fab.classList.remove("open");
    });
  }

  /* ---------- lead popup (timed + exit intent, once per session) ---------- */
  function initPopup() {
    var overlay = document.querySelector("[data-popup]");
    if (!overlay) return;
    var KEY = "uu_popup_shown";
    var shown = false;
    try { shown = sessionStorage.getItem(KEY) === "1"; } catch (e) {}

    function open() {
      if (shown) return;
      overlay.classList.add("open");
      shown = true;
      try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
    }
    function close() { overlay.classList.remove("open"); }

    qsa("[data-popup-close]", overlay).forEach(function (b) { b.addEventListener("click", close); });
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });

    setTimeout(open, 30000);

    document.addEventListener("mouseout", function (e) {
      if (!e.relatedTarget && !e.toElement && e.clientY < 8) open();
    });
  }

  /* ---------- generic lead form handling (no backend yet) ---------- */
  function initForms() {
    qsa("[data-lead-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var btn = form.querySelector("button[type=submit]");
        var success = form.parentElement.querySelector("[data-form-success]") || form.querySelector("[data-form-success]");
        if (btn) {
          var original = btn.textContent;
          btn.disabled = true;
          btn.textContent = "Жіберілуде…";
          setTimeout(function () {
            btn.disabled = false;
            btn.textContent = original;
            form.reset();
            form.style.display = "none";
            if (success) success.classList.add("show");
          }, 900);
        }
      });
    });
  }

  /* ---------- reveal on scroll ---------- */
  function initReveals() {
    var targets = qsa(".reveal, .reveal-stagger");
    if (!targets.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -20px 0px" });
    targets.forEach(function (t) {
      // progressive enhancement: only hide once JS confirms it can reveal later,
      // so content stays visible if JS fails or IO never fires.
      t.classList.add("pre");
      io.observe(t);
    });
  }

  /* ---------- count-up stats ---------- */
  function initCountUp() {
    var nums = qsa("[data-count-to]");
    if (!nums.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        var el = entry.target;
        var to = parseFloat(el.getAttribute("data-count-to"));
        var suffix = el.getAttribute("data-count-suffix") || "";
        var duration = 1400;
        var start = null;
        function step(ts) {
          if (!start) start = ts;
          var progress = Math.min((ts - start) / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * to) + suffix;
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* =========================================================
     Infinite carousel (autoplay + manual arrows, seamless loop)
     ========================================================= */
  function UUCarousel(root) {
    this.root = root;
    this.viewport = root.querySelector(".car-viewport");
    this.track = root.querySelector(".car-track");
    this.originals = qsa(".car-slide", this.track);
    this.perViewCfg = {
      base: parseInt(root.getAttribute("data-per-view") || "1", 10),
      md: parseInt(root.getAttribute("data-per-view-md") || root.getAttribute("data-per-view") || "1", 10),
      lg: parseInt(root.getAttribute("data-per-view-lg") || root.getAttribute("data-per-view-md") || "1", 10),
    };
    this.autoplayMs = parseInt(root.getAttribute("data-autoplay") || "0", 10);
    this.timer = null;
    this.index = 0;
    this.perView = 1;
    this.animating = false;
    this.init();
  }

  UUCarousel.prototype.getPerView = function () {
    var w = window.innerWidth;
    if (w >= 1024) return this.perViewCfg.lg;
    if (w >= 768) return this.perViewCfg.md;
    return this.perViewCfg.base;
  };

  UUCarousel.prototype.init = function () {
    var self = this;
    this.perView = this.getPerView();
    this.buildClones();
    this.setSizes();
    this.index = this.perView; // first real slide
    this.jumpTo(this.index, false);

    var prev = this.root.querySelector(".car-prev");
    var next = this.root.querySelector(".car-next");
    if (prev) prev.addEventListener("click", function () { self.go(-1); self.resetAutoplay(); });
    if (next) next.addEventListener("click", function () { self.go(1); self.resetAutoplay(); });

    this.track.addEventListener("transitionend", function () { self.settle(); });

    this.root.addEventListener("mouseenter", function () { self.stopAutoplay(); });
    this.root.addEventListener("mouseleave", function () { self.startAutoplay(); });
    this.root.addEventListener("focusin", function () { self.stopAutoplay(); });
    this.root.addEventListener("focusout", function () { self.startAutoplay(); });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        var newPerView = self.getPerView();
        var realIndex = self.realIndex();
        if (newPerView !== self.perView) {
          self.destroyClones();
          self.perView = newPerView;
          self.buildClones();
        }
        self.setSizes();
        self.index = realIndex + self.perView;
        self.jumpTo(self.index, false);
      }, 160);
    });

    this.buildDots();
    this.startAutoplay();
  };

  UUCarousel.prototype.buildClones = function () {
    var n = this.originals.length;
    var pv = Math.min(this.perView, n);
    for (var i = 0; i < pv; i++) {
      var headClone = this.originals[i].cloneNode(true);
      headClone.setAttribute("data-clone", "tail");
      this.track.appendChild(headClone);
    }
    for (var j = n - 1; j >= n - pv; j--) {
      var tailClone = this.originals[j].cloneNode(true);
      tailClone.setAttribute("data-clone", "head");
      this.track.insertBefore(tailClone, this.track.firstChild);
    }
    this.slides = qsa(".car-slide", this.track);
  };

  UUCarousel.prototype.destroyClones = function () {
    qsa("[data-clone]", this.track).forEach(function (el) { el.remove(); });
    this.slides = qsa(".car-slide", this.track);
  };

  UUCarousel.prototype.setSizes = function () {
    var width = this.viewport.getBoundingClientRect().width / this.perView;
    this.slideWidth = width;
    this.slides.forEach(function (s) { s.style.width = width + "px"; });
    this.track.style.width = width * this.slides.length + "px";
  };

  UUCarousel.prototype.realIndex = function () {
    var n = this.originals.length;
    var pv = this.perView;
    var i = this.index - pv;
    return ((i % n) + n) % n;
  };

  UUCarousel.prototype.jumpTo = function (index, animate) {
    this.track.style.transition = animate ? "" : "none";
    this.track.style.transform = "translateX(" + (-index * this.slideWidth) + "px)";
    if (!animate) {
      // force reflow so the next transition re-enables cleanly
      void this.track.offsetHeight;
      this.track.style.transition = "";
    }
    this.updateDots();
  };

  UUCarousel.prototype.go = function (dir) {
    if (this.animating) return;
    this.animating = true;
    this.index += dir;
    this.jumpTo(this.index, true);
  };

  UUCarousel.prototype.settle = function () {
    this.animating = false;
    var n = this.originals.length;
    var total = n + this.perView * 2;
    if (this.index >= n + this.perView) {
      this.index = this.index - n;
      this.jumpTo(this.index, false);
    } else if (this.index < this.perView) {
      this.index = this.index + n;
      this.jumpTo(this.index, false);
    }
  };

  UUCarousel.prototype.buildDots = function () {
    var self = this;
    var dotsWrap = this.root.querySelector("[data-car-dots]");
    if (!dotsWrap) return;
    dotsWrap.innerHTML = "";
    this.dots = [];
    for (var i = 0; i < this.originals.length; i++) {
      var d = document.createElement("button");
      d.className = "car-dot";
      d.setAttribute("aria-label", "Slide " + (i + 1));
      (function (idx) {
        d.addEventListener("click", function () {
          self.index = idx + self.perView;
          self.jumpTo(self.index, true);
          self.resetAutoplay();
        });
      })(i);
      dotsWrap.appendChild(d);
      this.dots.push(d);
    }
    this.updateDots();
  };

  UUCarousel.prototype.updateDots = function () {
    if (!this.dots) return;
    var real = this.realIndex();
    this.dots.forEach(function (d, i) { d.classList.toggle("active", i === real); });
  };

  UUCarousel.prototype.startAutoplay = function () {
    if (!this.autoplayMs) return;
    var self = this;
    this.stopAutoplay();
    this.timer = setInterval(function () { self.go(1); }, this.autoplayMs);
  };
  UUCarousel.prototype.stopAutoplay = function () { if (this.timer) clearInterval(this.timer); };
  UUCarousel.prototype.resetAutoplay = function () { this.startAutoplay(); };

  function initCarousels() {
    qsa("[data-carousel]").forEach(function (el) {
      if (el.querySelector(".car-slide")) new UUCarousel(el);
    });
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    includePartials(function () {
      initNav();
      initFloatingCta();
      initPopup();
      initForms();
    });
    initReveals();
    initCountUp();
    initCarousels();
  });
})();
