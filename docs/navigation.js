/* eCuisine Foods navigation: keep dropdowns exclusive and dismiss them predictably. */
(() => {
  const menus = [...document.querySelectorAll('.main-nav .nav-dropdown')];
  if (!menus.length) return;
  menus.forEach(menu => {
    menu.addEventListener('toggle', () => {
      if (!menu.open) return;
      menus.forEach(other => { if (other !== menu) other.open = false; });
    });
    menu.querySelectorAll('.nav-menu a').forEach(link => {
      link.addEventListener('click', () => { menus.forEach(item => item.open = false); });
    });
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.main-nav')) menus.forEach(menu => menu.open = false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      menus.forEach(menu => menu.open = false);
      const active = document.activeElement;
      if (active && active.closest('.nav-dropdown')) active.closest('.nav-dropdown').querySelector('summary')?.focus();
    }
  });
})();