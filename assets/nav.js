// The menu button on narrow screens (issue #73). Below the lg breakpoint (761 px) the masthead
// shows the logo and this button, and the button opens the links as a list. Without JavaScript
// the button stays hidden and the links show as before, so every page can still be reached.
const mast = document.querySelector('.mast');
const button = mast?.querySelector('.menu-toggle');
if (button) {
  const wide = matchMedia('(min-width: 761px)');
  const setOpen = (open) => {
    mast.classList.toggle('menu-open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  mast.classList.add('has-menu');
  button.hidden = false;
  button.addEventListener('click', () => setOpen(!mast.classList.contains('menu-open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mast.classList.contains('menu-open')) {
      setOpen(false);
      button.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!mast.contains(e.target)) setOpen(false);
  });
  wide.addEventListener('change', () => setOpen(false));
}
