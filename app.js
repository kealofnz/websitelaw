/* ═══════════════════════════════════════════
   DESPACHO JURÍDICO — app.js
   ═══════════════════════════════════════════ */

// ══════════════════════════════════════════════
//  CONFIGURACIÓN
// ══════════════════════════════════════════════
const TRAMITES_URL = "https://script.google.com/macros/s/AKfycbxpqWcXVSEl1U8n_wHs5vRWk0moV7ijV0jiSEYWy2pseFUXIep--4Ae99fpCrqJ87t9Hw/exec";
const AGENDA_URL   = "https://script.google.com/macros/s/AKfycbxpqWcXVSEl1U8n_wHs5vRWk0moV7ijV0jiSEYWy2pseFUXIep--4Ae99fpCrqJ87t9Hw/exec";
const CONTACTO_URL = "https://script.google.com/macros/s/AKfycbxpqWcXVSEl1U8n_wHs5vRWk0moV7ijV0jiSEYWy2pseFUXIep--4Ae99fpCrqJ87t9Hw/exec";

const CARDS_PER_PAGE = 9;    // Trámites por página
const DESC_MAX_CHARS = 120;  // Caracteres antes de "Ver más" en descripción
const REQ_MAX_ITEMS  = 3;    // Requisitos visibles antes de "Ver más"

// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
let tramitesData        = [];
let agendaData          = [];
let tramitesFiltrados   = [];
let paginaActual        = 1;
let tramiteSeleccionado = '';

const CATEGORIA_ICONS = {
  Civil:     '⚖️',
  Laboral:   '👷',
  Mercantil: '🏢',
  Familiar:  '👨‍👩‍👧',
  Penal:     '🔒',
  default:   '📋'
};

// ══════════════════════════════════════════════
//  NAVEGACIÓN
// ══════════════════════════════════════════════
function showPage(id, anchor, event) {
  if (event) event.preventDefault();

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');

  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  if (anchor && anchor.classList) {
    anchor.classList.add('active');
  } else {
    const navLink = document.querySelector('.nav-links a[data-page="' + id + '"]');
    if (navLink) navLink.classList.add('active');
  }

  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo(0, 0);
  if (id === 'tramites' && tramitesData.length === 0) loadTramites();
  if (id === 'agenda'   && agendaData.length   === 0) loadAgenda();
}

function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}

// ══════════════════════════════════════════════
//  SKELETON LOADING
// ══════════════════════════════════════════════
function mostrarSkeleton(containerId, cantidad) {
  cantidad = cantidad || CARDS_PER_PAGE;
  var html = '';
  for (var i = 0; i < cantidad; i++) {
    html += '<div class="card skeleton-card">' +
      '<div class="skeleton-header">' +
        '<div class="skel skel-icon"></div>' +
        '<div class="skel skel-title"></div>' +
        '<div class="skel skel-badge"></div>' +
      '</div>' +
      '<div class="skel skel-line"></div>' +
      '<div class="skel skel-line short"></div>' +
      '<div class="skel skel-box"></div>' +
      '<div class="skel skel-btn"></div>' +
    '</div>';
  }
  document.getElementById(containerId).innerHTML = html;
}

// ══════════════════════════════════════════════
//  TRÁMITES — Carga
// ══════════════════════════════════════════════
async function loadTramites() {
  mostrarSkeleton('tramites-container');

  try {
    const res = await fetch(TRAMITES_URL + '?tab=Tramites');
    tramitesData = await res.json();
  } catch (e) {
    document.getElementById('tramites-container').innerHTML =
      '<div class="empty-state"><p>⚠️ No se pudo conectar con Google Sheets.<br>Verifique la URL en app.js.</p></div>';
    return;
  }

  // Poblar filtro de categorías dinámicamente
  const cats = [...new Set(tramitesData.map(t => t.Categoria).filter(Boolean))].sort();
  const sel  = document.getElementById('filterCategoria');
  sel.innerHTML = '<option value="">Todas las categorías</option>'
    + cats.map(c => '<option value="' + c + '">' + c + '</option>').join('');

  filtrarYPaginar();
}

// ══════════════════════════════════════════════
//  TRÁMITES — Filtrar, paginar y renderizar
// ══════════════════════════════════════════════
function filtrarYPaginar() {
  const q   = document.getElementById('searchTramites').value.toLowerCase();
  const cat = document.getElementById('filterCategoria').value;

  tramitesFiltrados = tramitesData.filter(function(t) {
    const text = (t.Nombre + t.Categoria + t.Descripcion + t.Requisitos).toLowerCase();
    return (!q || text.includes(q)) && (!cat || t.Categoria === cat);
  });

  paginaActual = 1;
  renderTramites();
  renderPaginacion();
}

function renderTramites() {
  const container  = document.getElementById('tramites-container');
  const inicio     = (paginaActual - 1) * CARDS_PER_PAGE;
  const pagina     = tramitesFiltrados.slice(inicio, inicio + CARDS_PER_PAGE);

  if (!pagina.length) {
    container.innerHTML =
      '<div class="empty-state">' +
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="opacity:.2;margin-bottom:1rem">' +
          '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>' +
        '</svg>' +
        '<p>No se encontraron trámites</p>' +
      '</div>';
    return;
  }

  container.innerHTML = pagina.map(function(t, i) {
    return buildCard(t, inicio + i);
  }).join('');

  container.querySelectorAll('.tramite-card').forEach(function(card, i) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(14px)';
    setTimeout(function() {
      card.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
      card.style.opacity    = '1';
      card.style.transform  = 'translateY(0)';
    }, i * 60);
  });
}

function buildCard(t, idx) {
  const icon = CATEGORIA_ICONS[t.Categoria] || CATEGORIA_ICONS.default;

  const desc      = (t.Descripcion || '').trim();
  const descCorta = desc.length > DESC_MAX_CHARS;
  var descHTML    = '';
  if (desc) {
    const texto = descCorta ? desc.substring(0, DESC_MAX_CHARS) + '…' : desc;
    const boton = descCorta
      ? '<button class="btn-ver-mas" onclick="abrirDetalle(' + idx + ')">Ver más</button>'
      : '';
    descHTML = '<p class="card-desc">' + texto + boton + '</p>';
  }

  const reqs      = t.Requisitos ? t.Requisitos.split(',').map(function(r) { return r.trim(); }).filter(Boolean) : [];
  const reqCortos = reqs.length > REQ_MAX_ITEMS;
  var reqHTML     = '';
  if (reqs.length) {
    const items = reqs.slice(0, REQ_MAX_ITEMS).map(function(r) { return '<li>' + r + '</li>'; }).join('');
    const masBtn = reqCortos
      ? '<button class="btn-ver-mas" onclick="abrirDetalle(' + idx + ')">+' + (reqs.length - REQ_MAX_ITEMS) + ' más…</button>'
      : '';
    reqHTML =
      '<div class="card-requisitos">' +
        '<div class="meta-label" style="margin-bottom:.45rem">📎 Requisitos</div>' +
        '<ul>' + items + '</ul>' +
        masBtn +
      '</div>';
  }

  const nombreEscaped = t.Nombre.replace(/'/g, "\\'");

   return (
     '<div class="card tramite-card">' +
       '<div class="card-body">' +
         '<div class="card-header" style="align-items:center;margin-bottom:0;">' +
           '<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">' +
             '<span class="card-icon">' + icon + '</span>' +
             '<div class="card-title">' + t.Nombre + '</div>' +
           '</div>' +
           (t.Categoria ? '<span class="badge badge-active">' + t.Categoria + '</span>' : '') +
         '</div>' +
         descHTML +
         reqHTML +
       '</div>' +
       '<div class="card-actions">' +
         '<button class="btn btn-ghost-sm" onclick="abrirDetalle(' + idx + ')">Ver detalle</button>' +
         '<button class="btn btn-primary btn-sm" onclick="abrirModal(\'' + nombreEscaped + '\')">Solicitar →</button>' +
       '</div>' +
     '</div>'
   );
}

// ══════════════════════════════════════════════
//  PAGINACIÓN
// ══════════════════════════════════════════════
function renderPaginacion() {
  const total = Math.ceil(tramitesFiltrados.length / CARDS_PER_PAGE);
  const el    = document.getElementById('paginacion');

  if (total <= 1) { el.innerHTML = ''; return; }

  const info = '<span class="pag-info">Página ' + paginaActual + ' de ' + total +
    ' &nbsp;·&nbsp; ' + tramitesFiltrados.length + ' trámites</span>';

  const prev = '<button class="pag-btn" onclick="irPagina(' + (paginaActual - 1) + ')"' +
    (paginaActual === 1 ? ' disabled' : '') + '>← Anterior</button>';

  const next = '<button class="pag-btn" onclick="irPagina(' + (paginaActual + 1) + ')"' +
    (paginaActual === total ? ' disabled' : '') + '>Siguiente →</button>';

  const rango = paginasVisibles(paginaActual, total);
  var nums = '';
  if (rango[0] > 1) nums += '<button class="pag-num" onclick="irPagina(1)">1</button>';
  if (rango[0] > 2) nums += '<span class="pag-dots">…</span>';
  rango.forEach(function(n) {
    nums += '<button class="pag-num' + (n === paginaActual ? ' active' : '') +
      '" onclick="irPagina(' + n + ')">' + n + '</button>';
  });
  if (rango[rango.length - 1] < total - 1) nums += '<span class="pag-dots">…</span>';
  if (rango[rango.length - 1] < total)
    nums += '<button class="pag-num" onclick="irPagina(' + total + ')">' + total + '</button>';

  el.innerHTML = '<div class="paginacion-wrap">' + prev + nums + next + '</div>' + info;
}

function paginasVisibles(actual, total) {
  const delta = 2;
  const rango = [];
  for (var i = Math.max(1, actual - delta); i <= Math.min(total, actual + delta); i++) {
    rango.push(i);
  }
  return rango;
}

function irPagina(n) {
  const total = Math.ceil(tramitesFiltrados.length / CARDS_PER_PAGE);
  if (n < 1 || n > total) return;
  paginaActual = n;
  renderTramites();
  renderPaginacion();
  document.getElementById('tramites-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ══════════════════════════════════════════════
//  MODAL — Ver detalle completo
// ══════════════════════════════════════════════
function abrirDetalle(idx) {
  const t = tramitesFiltrados[idx];
  if (!t) return;
  const icon = CATEGORIA_ICONS[t.Categoria] || CATEGORIA_ICONS.default;
  const reqs = t.Requisitos
    ? t.Requisitos.split(',').map(function(r) { return r.trim(); }).filter(Boolean)
    : [];

  const nombreEscaped = t.Nombre.replace(/'/g, "\\'");

  var html =
    '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:1.2rem;flex-wrap:wrap;">' +
      '<span style="font-size:1.6rem;line-height:1.3">' + icon + '</span>' +
      '<h2 style="font-family:Arial,sans-serif;font-size:1.05rem;font-weight:600;color:var(--text);flex:1;line-height:1.4">' + t.Nombre + '</h2>' +
      (t.Categoria ? '<span class="badge badge-active">' + t.Categoria + '</span>' : '') +
    '</div>';

  if (t.Descripcion) {
    html +=
      '<div class="detalle-seccion">' +
        '<div class="meta-label" style="margin-bottom:.5rem">Descripción</div>' +
        '<p style="font-family:Arial,sans-serif;font-size:.86rem;color:var(--muted);line-height:1.8">' + t.Descripcion + '</p>' +
      '</div>';
  }

  if (reqs.length) {
    html +=
      '<div class="detalle-seccion">' +
        '<div class="meta-label" style="margin-bottom:.6rem">📎 Requisitos necesarios</div>' +
        '<ul style="font-family:Arial,sans-serif;font-size:.84rem;color:var(--text);padding-left:1.1rem;line-height:2.1">' +
          reqs.map(function(r) { return '<li>' + r + '</li>'; }).join('') +
        '</ul>' +
      '</div>';
  }

  html +=
    '<div style="margin-top:1.5rem;padding-top:1.2rem;border-top:1px solid var(--border)">' +
      '<button class="btn btn-primary" style="width:100%;justify-content:center;padding:.85rem"' +
        ' onclick="cerrarDetalle();abrirModal(\'' + nombreEscaped + '\')">' +
        'Solicitar este trámite →' +
      '</button>' +
    '</div>';

  document.getElementById('detalle-content').innerHTML = html;
  document.getElementById('modal-detalle').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarDetalle() {
  document.getElementById('modal-detalle').classList.remove('open');
  document.body.style.overflow = '';
}

// ══════════════════════════════════════════════
//  MODAL — Solicitar trámite (formulario)
// ══════════════════════════════════════════════
function abrirModal(nombre) {
  tramiteSeleccionado = nombre;
  document.getElementById('modal-titulo').textContent = nombre;
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function cerrarModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

async function enviarSolicitudTramite() {
  const nombre  = document.getElementById('m-nombre').value.trim();
  const email   = document.getElementById('m-email').value.trim();
  const tel     = document.getElementById('m-tel').value.trim();
  const mensaje = document.getElementById('m-mensaje').value.trim();

  if (!nombre || !email) { alert('Por favor complete nombre y correo.'); return; }

  const payload = {
    nombre, email,
    telefono: tel,
    tipo:     tramiteSeleccionado,
    mensaje:  mensaje || '(Sin comentarios adicionales)'
  };

  if (CONTACTO_URL) {
    try { await fetch(CONTACTO_URL, { method: 'POST', body: JSON.stringify(payload) }); }
    catch (e) {}
  }

  ['m-nombre', 'm-email', 'm-tel', 'm-mensaje'].forEach(function(id) {
    document.getElementById(id).value = '';
  });

  cerrarModal();
  showToast('✓ Solicitud enviada correctamente');
}

// ══════════════════════════════════════════════
//  AGENDA — Carga y renderizado
// ══════════════════════════════════════════════
async function loadAgenda() {
  const tbody = document.getElementById('agenda-tbody');
  var skRows  = '';
  for (var i = 0; i < 5; i++) {
    skRows += '<tr class="skeleton-row">';
    for (var j = 0; j < 6; j++) {
      skRows += '<td><div class="skel skel-line" style="margin:0;width:' + (60 + Math.random() * 30) + '%"></div></td>';
    }
    skRows += '</tr>';
  }
  tbody.innerHTML = skRows;

  try {
    const res = await fetch(AGENDA_URL + '?tab=Agenda');
    agendaData = await res.json();
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">⚠️ No se pudo conectar con Google Sheets.</td></tr>';
    return;
  }

  renderAgenda();
}

function renderAgenda() {
  const q    = document.getElementById('searchAgenda').value.toLowerCase();
  const tipo = document.getElementById('filterTipo').value;

  const list = agendaData.filter(function(a) {
    const text = (a.Cliente + a.Tipo + a.Abogado).toLowerCase();
    return (!q || text.includes(q)) && (!tipo || a.Tipo === tipo);
  });

  const tbody = document.getElementById('agenda-tbody');

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">Sin citas encontradas</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(function(a) {
    return '<tr>' +
      '<td>' + formatDate(a.Fecha) + '</td>' +
      '<td>' + a.Hora + '</td>' +
      '<td>' + a.Cliente + '</td>' +
      '<td>' + a.Tipo + '</td>' +
      '<td>' + a.Abogado + '</td>' +
      '<td><span class="badge ' + (a.Estado === 'Confirmada' ? 'badge-active' : 'badge-pending') + '">' + a.Estado + '</span></td>' +
    '</tr>';
  }).join('');
}

// ══════════════════════════════════════════════
//  FORMULARIO DE CONTACTO
// ══════════════════════════════════════════════
async function enviarFormulario() {
  const nombre  = document.getElementById('c-nombre').value.trim();
  const email   = document.getElementById('c-email').value.trim();
  const tel     = document.getElementById('c-tel').value.trim();
  const tipo    = document.getElementById('c-tipo').value;
  const mensaje = document.getElementById('c-mensaje').value.trim();

  if (!nombre || !email || !mensaje) {
    alert('Por favor complete los campos obligatorios.');
    return;
  }

  const payload = { nombre, email, telefono: tel, tipo, mensaje };

  if (CONTACTO_URL) {
    try { await fetch(CONTACTO_URL, { method: 'POST', body: JSON.stringify(payload) }); }
    catch (e) {}
  }

  ['c-nombre', 'c-email', 'c-tel', 'c-mensaje'].forEach(function(id) {
    document.getElementById(id).value = '';
  });

  showToast('✓ Solicitud enviada correctamente');
}

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg || '✓ Operación exitosa';
  t.style.display = 'block';
  setTimeout(function() { t.style.display = 'none'; }, 3500);
}

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) cerrarModal();
  });
  document.getElementById('modal-detalle').addEventListener('click', function(e) {
    if (e.target === this) cerrarDetalle();
  });
});
