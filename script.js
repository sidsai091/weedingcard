/* ============================================
   Muhammad Siddiq & Wan Fatin Nabilah
   Kad Jemputan Perkahwinan
   ============================================ */

(function () {
  'use strict';

  // Kira detik menuju majlis akad nikah (bukan kenduri).
  var WEDDING_DATE = new Date('2026-09-05T11:00:00+08:00');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Curtain ---------- */

  var curtain = $('#curtain');
  var openBtn = $('#openBtn');
  var music   = $('#musicBtn');

  document.body.classList.add('is-locked');

  function openInvitation() {
    curtain.classList.add('is-open');
    document.body.classList.remove('is-locked');
    music.classList.add('is-visible');

    // Remove from the a11y tree and tab order once the panels finish sliding
    // apart (matches the 1.1s panel transition in style.css; instant under
    // prefers-reduced-motion, where that transition collapses to ~0).
    window.setTimeout(function () {
      curtain.setAttribute('hidden', '');
    }, reduceMotion ? 0 : 1100);
  }

  openBtn.addEventListener('click', openInvitation);

  /* ---------- Nav ---------- */

  var nav         = $('#nav');
  var navToggle   = $('#navToggle');
  var navMenu     = $('#navMenu');
  var navBackdrop = $('#navBackdrop');

  function closeMenu() {
    navMenu.classList.remove('is-open');
    navBackdrop.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  navToggle.addEventListener('click', function () {
    var open = navMenu.classList.toggle('is-open');
    navBackdrop.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  });

  // Close the drawer after picking a destination, or by tapping the backdrop.
  $$('.nav__menu a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });
  navBackdrop.addEventListener('click', closeMenu);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeMenu(); }
  });

  /* ---------- Scroll state + active link ---------- */

  var sections = $$('main section[id]');
  var navLinks = $$('.nav__menu a');
  var ticking  = false;

  function onScroll() {
    nav.classList.toggle('is-stuck', window.scrollY > 60);

    // Highlight whichever section covers the upper third of the viewport.
    var mark = window.scrollY + window.innerHeight / 3;
    var currentId = '';

    sections.forEach(function (section) {
      if (section.offsetTop <= mark) { currentId = section.id; }
    });

    navLinks.forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('href') === '#' + currentId);
    });

    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });

  onScroll();

  /* ---------- Reveal on scroll ---------- */

  var revealables = $$('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    revealables.forEach(function (el, i) {
      // Stagger siblings so grids cascade instead of popping in at once.
      el.style.transitionDelay = (i % 3) * 90 + 'ms';
      observer.observe(el);
    });
  }

  /* ---------- Agenda carousel (Akad Nikah / Kenduri) ---------- */

  var agendaTrack = $('#agendaTrack');

  if (agendaTrack) {
    var agendaCards = $$('.agenda__card', agendaTrack);
    var agendaDots   = $$('.agenda__dot', $('#agendaDots'));
    var agendaPrev   = $('#agendaPrev');
    var agendaNext   = $('#agendaNext');
    var agendaTicking = false;

    function goToAgenda(index) {
      index = Math.max(0, Math.min(index, agendaCards.length - 1));
      agendaTrack.scrollTo({
        left: agendaCards[index].offsetLeft,
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    }

    function currentAgendaIndex() {
      // Whichever card's start has scrolled closest to the track's left edge.
      var pos = agendaTrack.scrollLeft;
      var closest = 0;
      var best = Infinity;
      agendaCards.forEach(function (card, i) {
        var d = Math.abs(card.offsetLeft - pos);
        if (d < best) { best = d; closest = i; }
      });
      return closest;
    }

    function syncAgendaUI() {
      var index = currentAgendaIndex();

      agendaDots.forEach(function (dot, i) {
        var active = i === index;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', String(active));
      });

      agendaPrev.disabled = index === 0;
      agendaNext.disabled = index === agendaCards.length - 1;

      agendaTicking = false;
    }

    agendaTrack.addEventListener('scroll', function () {
      if (!agendaTicking) {
        window.requestAnimationFrame(syncAgendaUI);
        agendaTicking = true;
      }
    }, { passive: true });

    agendaDots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goToAgenda(i); });
    });

    agendaPrev.addEventListener('click', function () { goToAgenda(currentAgendaIndex() - 1); });
    agendaNext.addEventListener('click', function () { goToAgenda(currentAgendaIndex() + 1); });

    // Card widths depend on layout, so re-settle on the active card after resize.
    window.addEventListener('resize', function () { goToAgenda(currentAgendaIndex()); });

    syncAgendaUI();
  }

  /* ---------- Countdown ---------- */

  var cd = {
    days:    $('[data-days]'),
    hours:   $('[data-hours]'),
    minutes: $('[data-minutes]'),
    seconds: $('[data-seconds]')
  };

  function pad(n) { return String(n).padStart(2, '0'); }

  function tickCountdown() {
    var diff = WEDDING_DATE - new Date();

    if (diff <= 0) {
      cd.days.textContent = cd.hours.textContent =
      cd.minutes.textContent = cd.seconds.textContent = '00';
      window.clearInterval(timer);
      return;
    }

    var s = Math.floor(diff / 1000);
    cd.days.textContent    = pad(Math.floor(s / 86400));
    cd.hours.textContent   = pad(Math.floor(s / 3600) % 24);
    cd.minutes.textContent = pad(Math.floor(s / 60) % 60);
    cd.seconds.textContent = pad(s % 60);
  }

  tickCountdown();
  var timer = window.setInterval(tickCountdown, 1000);

  /* ---------- Music ---------- */

  // Drop an audio file next to this script and point `src` at it to enable sound.
  var audio = new Audio('audio/song.mp3');
  audio.loop = true;
  audio.volume = 0.35;

  music.addEventListener('click', function () {
    var playing = music.getAttribute('aria-pressed') === 'true';

    if (playing) {
      audio.pause();
      music.setAttribute('aria-pressed', 'false');
      return;
    }

    // Missing file or a blocked autoplay policy shouldn't break the toggle.
    var attempt = audio.play();
    if (attempt && typeof attempt.then === 'function') {
      attempt.then(function () {
        music.setAttribute('aria-pressed', 'true');
      }).catch(function () {
        music.setAttribute('aria-pressed', 'false');
      });
    } else {
      music.setAttribute('aria-pressed', 'true');
    }
  });
})();
