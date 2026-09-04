(function () {
  'use strict';

  // Mobile nav toggle
  var toggle = document.getElementById('menu-toggle');
  var nav = document.getElementById('main-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Scroll reveal animations
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // Header background on scroll
  var header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.style.boxShadow = window.scrollY > 20 ? '0 4px 20px rgba(0,0,0,0.4)' : 'none';
    }, { passive: true });
  }

  // Footer year
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Contact form: client-side UX validation + honeypot spam guard.
  // Actual submission and data handling is delegated entirely to Formspree;
  // this page never stores or transmits form data anywhere else.
  var form = document.querySelector('.contact-form');
  var status = document.getElementById('form-status');

  if (form && status) {
    form.addEventListener('submit', function (e) {
      // Honeypot: if the hidden field got filled, silently drop the submission.
      var honeypot = form.querySelector('#company');
      if (honeypot && honeypot.value.trim() !== '') {
        e.preventDefault();
        return;
      }

      if (!form.checkValidity()) {
        e.preventDefault();
        status.textContent = 'Revisá los campos obligatorios antes de enviar.';
        return;
      }

      status.textContent = 'Enviando...';
    });
  }
})();
