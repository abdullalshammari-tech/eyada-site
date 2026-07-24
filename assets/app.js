/* EYADA — site behaviour. No dependencies, no tracking, no network calls. */
(function () {
  "use strict";

  /* Current year in the footer */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* Highlight the section currently in view in the header nav */
  var links = Array.prototype.slice.call(
    document.querySelectorAll('.nav a[href^="#"]')
  );
  if (!links.length || !("IntersectionObserver" in window)) return;

  var byId = {};
  var targets = [];
  links.forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    var section = document.getElementById(id);
    if (section) {
      byId[id] = a;
      targets.push(section);
    }
  });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove("is-active"); });
        var active = byId[entry.target.id];
        if (active) active.classList.add("is-active");
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );

  targets.forEach(function (t) { observer.observe(t); });
})();
