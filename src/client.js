'use strict';
const data = JSON.parse(document.getElementById('siteData').textContent);
const { lang, phone, messages: m } = data;
const $ = (id) => document.getElementById(id);
const wa = (text) => `https://wa.me/${phone}${text ? '?text=' + encodeURIComponent(text) : ''}`;
let activeCategory = 'all',
  modalIndex = 0,
  lastFocused = null,
  scrollY = 0;
const visibleCards = () => [...document.querySelectorAll('.cake-card')].filter((c) => !c.hidden);

function setMenu(open) {
  $('mainNav').classList.toggle('open', open);
  $('menuToggle').setAttribute('aria-expanded', String(open));
  $('menuToggle').setAttribute('aria-label', open ? data.ui.closeMenu : data.ui.menu);
}
function openModal(id) {
  lastFocused = document.activeElement;
  scrollY = window.scrollY;
  $(id).hidden = false;
  document.body.style.overflow = 'hidden';
  for (const child of document.body.children)
    if (!child.contains($(id)) && child.tagName !== 'SCRIPT') child.inert = true;
  $(id).querySelector('.modal-close').focus();
}
function closeModal(id) {
  $(id).hidden = true;
  document.body.style.overflow = '';
  for (const child of document.body.children) child.inert = false;
  if (lastFocused?.isConnected) lastFocused.focus({ preventScroll: true });
  window.scrollTo({ top: scrollY, behavior: 'instant' });
}
function updateImage() {
  const card = visibleCards()[modalIndex];
  if (!card) return;
  const link = card.querySelector('.cake-photo');
  $('modalImage').src = link.href;
  $('modalImage').alt = card.querySelector('img').alt;
  $('modalCaption').textContent = link.dataset.title;
  $('modalOrder').href = card.querySelector('a[target="_blank"]').href;
}
function changeImage(delta) {
  const count = visibleCards().length;
  modalIndex = (modalIndex + delta + count) % count;
  updateImage();
}
function minDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const d = Object.fromEntries(
    parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  );
  return new Date(Date.UTC(Number(d.year), Number(d.month) - 1, Number(d.day) + 4))
    .toISOString()
    .slice(0, 10);
}
function formError(key, field) {
  $('formError').textContent = m[key];
  const el = $('orderForm').elements[field];
  el.setAttribute('aria-invalid', 'true');
  el.setAttribute('aria-describedby', 'formError');
  el.focus();
}
function handleOrder(event) {
  event.preventDefault();
  const form = event.currentTarget,
    fd = new FormData(form);
  const get = (key) => String(fd.get(key) || '').trim();
  const name = get('name'),
    telephone = get('phone'),
    occasion = get('occasion'),
    date = get('date'),
    design = get('design'),
    servings = get('servings');
  const file = $('referenceFile').files[0];
  $('formError').textContent = '';
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  for (const field of ['name', 'phone', 'occasion', 'date', 'design'])
    if (!get(field)) return formError('invalidRequired', field);
  if (!/^\+?[0-9]{8,15}$/.test(telephone.replace(/[\s().-]/g, '')))
    return formError('invalidPhone', 'phone');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < minDate() || !form.elements.date.validity.valid)
    return formError('invalidDate', 'date');
  if (
    servings &&
    (!Number.isInteger(Number(servings)) || Number(servings) < 1 || Number(servings) > 1000)
  )
    return formError('invalidServings', 'servings');
  if (file && file.size > 10 * 1024 * 1024) return formError('photoTooLarge', 'reference');
  const occasionKey = {
    birthday: 'occasionBirthday',
    wedding: 'occasionWedding',
    engagement: 'occasionEngagement',
    romance: 'occasionRomance',
    other: 'occasionOther',
  }[occasion];
  if (!occasionKey) return formError('invalidRequired', 'occasion');
  const lines = [
    m.messageIntro,
    '',
    `• ${m.nameLabel}: ${name}`,
    `• ${m.phoneLabel}: ${telephone}`,
    `• ${m.occasionLabel}: ${m[occasionKey]}`,
    `• ${m.dateLabel}: ${date.split('-').reverse().join('/')}`,
  ];
  if (servings) lines.push(`• ${m.servingsLabel}: ${servings}`);
  if (get('flavor')) lines.push(`• ${m.flavorLabel}: ${get('flavor')}`);
  lines.push(`• ${m.designLabel}: ${design}`);
  if (fd.has('newDesign')) lines.push(`• ${m.originalLabel}: ${m.yes}`);
  if (file) lines.push(`• ${m.photoLabel}: ${m.photoValue}`);
  lines.push(m.messageOutro);
  const message = lines.join('\n');
  $('reviewText').textContent = message;
  $('photoReminder').hidden = !file;
  $('confirmWhatsApp').href = wa(message);
  openModal('reviewModal');
}

document.documentElement.classList.replace('no-js', 'js');
$('menuToggle').addEventListener('click', () =>
  setMenu($('menuToggle').getAttribute('aria-expanded') !== 'true'),
);
document
  .querySelectorAll('.nav-links a')
  .forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.querySelectorAll('[data-filter]').forEach((button) =>
  button.addEventListener('click', () => {
    activeCategory = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((b) => {
      const active = b.dataset.filter === activeCategory;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('.cake-card').forEach((card) => {
      card.hidden = activeCategory !== 'all' && card.dataset.category !== activeCategory;
    });
  }),
);
document.querySelectorAll('.cake-photo').forEach((link) =>
  link.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    modalIndex = visibleCards().indexOf(link.closest('.cake-card'));
    updateImage();
    openModal('imageModal');
  }),
);
$('closeImage').onclick = () => closeModal('imageModal');
$('closeReview').onclick = () => closeModal('reviewModal');
$('prevImage').onclick = () => changeImage(-1);
$('nextImage').onclick = () => changeImage(1);
document.querySelectorAll('.modal-backdrop').forEach((modal) =>
  modal.addEventListener('mousedown', (e) => {
    if (e.target === modal) closeModal(modal.id);
  }),
);
document.addEventListener('keydown', (e) => {
  const modal = [...document.querySelectorAll('.modal-backdrop')].find((el) => !el.hidden);
  if (e.key === 'Escape') {
    if (modal) closeModal(modal.id);
    else {
      setMenu(false);
      if (document.activeElement.closest('.nav-links')) $('menuToggle').focus();
    }
  }
  if (!modal) return;
  if (e.key === 'Tab') {
    const focusable = [
      ...modal.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]'),
    ].filter((el) => !el.disabled && el.getClientRects().length);
    const first = focusable[0],
      last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  if (modal.id === 'imageModal') {
    if (e.key === 'ArrowRight') changeImage(lang === 'ar' ? -1 : 1);
    if (e.key === 'ArrowLeft') changeImage(lang === 'ar' ? 1 : -1);
  }
});
$('orderForm').addEventListener('submit', handleOrder);
$('referenceFile').addEventListener('change', (e) => {
  $('uploadText').textContent = e.target.files[0]?.name || m.uploadText;
});
const dateField = $('orderForm').elements.date;
dateField.min = minDate();
dateField.addEventListener('focus', () => {
  dateField.min = minDate();
});
$('confirmWhatsApp').addEventListener('click', () => closeModal('reviewModal'));
let startX = null;
$('modalImage').addEventListener(
  'touchstart',
  (e) => {
    startX = e.changedTouches[0].screenX;
  },
  { passive: true },
);
$('modalImage').addEventListener(
  'touchend',
  (e) => {
    if (startX !== null) {
      const dx = e.changedTouches[0].screenX - startX;
      if (Math.abs(dx) > 45) changeImage(dx < 0 ? 1 : -1);
    }
    startX = null;
  },
  { passive: true },
);
