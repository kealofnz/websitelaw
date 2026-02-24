/* ═══════════════════════════════════════════
   DESPACHO JURÍDICO — app.js
   ═══════════════════════════════════════════ */

// ══════════════════════════════════════════════
//  CONFIGURACIÓN — Reemplaza con tu URL de Apps Script
// ══════════════════════════════════════════════
const TRAMITES_URL = "https://script.google.com/macros/s/AKfycbxpqWcXVSEl1U8n_wHs5vRWk0moV7ijV0jiSEYWy2pseFUXIep--4Ae99fpCrqJ87t9Hw/exec";  // Ej: https://script.google.com/macros/s/ABC.../exec
const AGENDA_URL   = "https://script.google.com/macros/s/AKfycbxpqWcXVSEl1U8n_wHs5vRWk0moV7ijV0jiSEYWy2pseFUXIep--4Ae99fpCrqJ87t9Hw/exec";  // Puede ser la misma URL con ?tab=Agenda
const CONTACTO_URL = "https://script.google.com/macros/s/AKfycbxpqWcXVSEl1U8n_wHs5vRWk0moV7ijV0jiSEYWy2pseFUXIep--4Ae99fpCrqJ87t9Hw/exec";  // Misma URL, usa doPost para recibir formularios

// ══════════════════════════════════════════════
//  DATOS DE DEMOSTRACIÓN
//  (se usan automáticamente si no hay URL configurada)
//  Columnas Excel → Nombre | Categoria | Descripcion | Requisitos
// ══════════════════════════════════════════════
const DEMO_TRAMITES = [
  {
    Nombre: "Constitución de Sociedad Mercantil",
    Categoria: "Mercantil",
    Descripcion: "Redacción y legalización de escritura pública para la constitución de una sociedad anónima o de responsabilidad limitada ante el Registro Mercantil.",
    Requisitos: "DPI de los socios, acta constitutiva borrador, depósito de capital inicial, comprobante de domicilio fiscal, nombre propuesto de la empresa."
  },
  {
    Nombre: "Demanda por Incumplimiento de Contrato",
    Categoria: "Civil",
    Descripcion: "Representación legal en procesos civiles derivados del incumplimiento de contratos de compraventa, arrendamiento o prestación de servicios.",
    Requisitos: "Copia del contrato original, evidencia del incumplimiento (correos, documentos), DPI del demandante, historial de pagos o comunicaciones."
  },
  {
    Nombre: "Despido Injustificado / Prestaciones Laborales",
    Categoria: "Laboral",
    Descripcion: "Gestión y presentación de demanda ante los tribunales laborales para reclamar prestaciones no pagadas, indemnización por despido o beneficios laborales.",
    Requisitos: "Carta de despido o constancia laboral, colillas de pago, DPI, contrato de trabajo (si existe), tiempo laborado."
  },
  {
    Nombre: "Proceso de Divorcio",
    Categoria: "Familiar",
    Descripcion: "Tramitación de divorcio por mutuo acuerdo o contencioso, incluyendo acuerdos de custodia, pensión alimenticia y reparto de bienes.",
    Requisitos: "Acta de matrimonio original, DPI de ambos cónyuges, actas de nacimiento de hijos (si aplica), inventario de bienes."
  },
  {
    Nombre: "Defensa Penal",
    Categoria: "Penal",
    Descripcion: "Asesoría y representación legal en procesos penales, desde la etapa preparatoria hasta el juicio oral, garantizando el debido proceso.",
    Requisitos: "Acta de imputación o acusación, DPI del imputado, relato de los hechos, información sobre testigos o pruebas de descargo."
  },
  {
    Nombre: "Registro de Marca Comercial",
    Categoria: "Mercantil",
    Descripcion: "Gestión integral del registro de marca, logotipo o nombre comercial ante la oficina de Propiedad Intelectual para proteger su identidad empresarial.",
    Requisitos: "Nombre o logo a registrar (archivo digital), descripción de productos/servicios, DPI o RUT del solicitante, comprobante de pago de tasas."
  },
];

const DEMO_AGENDA = [
  { Fecha:"2025-03-01", Hora:"09:00", Cliente:"María González",  Tipo:"Consulta",  Abogado:"Lic. Hernández", Estado:"Confirmada" },
  { Fecha:"2025-03-01", Hora:"11:30", Cliente:"Roberto Mejía",   Tipo:"Audiencia", Abogado:"Lic. Ramírez",   Estado:"Pendiente"  },
  { Fecha:"2025-03-03", Hora:"10:00", Cliente:"Empresa S.A.",    Tipo:"Reunión",   Abogado:"Lic. Hernández", Estado:"Confirmada" },
  { Fecha:"2025-03-04", Hora:"14:00", Cliente:"Carlos Medina",   Tipo:"Audiencia", Abogado:"Lic. Hernández", Estado:"Confirmada" },
  { Fecha:"2025-03-06", Hora:"09:30", Cliente:"Nuevo Cliente",   Tipo:"Consulta",  Abogado:"Lic. Ramírez",   Estado:"Pendiente"  },
];

// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
let tramitesData        = [];
let agendaData          = [];
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
//  NAVIGATION
// ══════════════════════════════════════════════
function showPage(id, anchor) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');

  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  if (anchor) anchor.classList.add('active');

  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo(0, 0);

  if (id === 'tramites' && tramitesData.length === 0) loadTramites();
  if (id === 'agenda'   && agendaData.length   === 0) loadAgenda();
}

function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}

// ══════════════════════════════════════════════
//  TRÁMITES — Carga y renderizado
// ══════════════════════════════════════════════
async function loadTramites() {
  const container = document.getElementById('tramites-container');
  container.innerHTML = '<div class="empty-state"><span class="spinner"></span> Cargando...</div>';

  if (!TRAMITES_URL) {
    tramitesData = DEMO_TRAMITES;
  } else {
    try {
      const res = await fetch(TRAMITES_URL + '?tab=Tramites');
      tramitesData = await res.json();
    } catch (e) {
      tramitesData = DEMO_TRAMITES;
    }
  }

  // Poblar filtro de categorías dinámicamente
  const cats = [...new Set(tramitesData.map(t => t.Categoria).filter(Boolean))].sort();
  const sel  = document.getElementById('filterCategoria');
  sel.innerHTML = '<option value="">Todas las categorías</option>'
    + cats.map(c => `<option value="${c}">${c}</option>`).join('');

  updateStats();
  renderTramites();
}

function renderTramites() {
  const q   = document.getElementById('searchTramites').value.toLowerCase();
  const cat = document.getElementById('filterCategoria').value;

  const list = tramitesData.filter(t => {
    const text = (t.Nombre + t.Categoria + t.Descripcion + t.Requisitos).toLowerCase();
    return (!q || text.includes(q)) && (!cat || t.Categoria === cat);
  });

  const container = document.getElementById('tramites-container');

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2
                   M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p>No se encontraron trámites</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map(t => {
    const icon    = CATEGORIA_ICONS[t.Categoria] || CATEGORIA_ICONS.default;
    const reqList = t.Requisitos
      ? t.Requisitos.split(',').map(r => `<li style="margin-bottom:3px">${r.trim()}</li>`).join('')
      : '';

    return `
    <div class="card" style="display:flex;flex-direction:column;gap:1rem;">
      <div class="card-header" style="align-items:center;">
        <div style="display:flex;align-items:center;gap:10px;flex:1;">
          <span style="font-size:1.4rem;line-height:1;">${icon}</span>
          <div class="card-title" style="font-size:.93rem;line-height:1.4;">${t.Nombre}</div>
        </div>
        ${t.Categoria ? `<span class="badge badge-active" style="flex-shrink:0;">${t.Categoria}</span>` : ''}
      </div>

      ${t.Descripcion ? `<p style="font-family:Arial,sans-serif;font-size:.82rem;color:var(--muted);line-height:1.65;margin:0;">${t.Descripcion}</p>` : ''}

      ${reqList ? `
      <div style="background:var(--surface2);border-radius:7px;padding:.85rem 1rem;">
        <div class="meta-label" style="margin-bottom:.5rem;">📎 Requisitos</div>
        <ul style="font-family:Arial,sans-serif;font-size:.8rem;color:var(--text);padding-left:1rem;margin:0;line-height:1.7;">
          ${reqList}
        </ul>
      </div>` : ''}

      <button class="btn btn-primary" style="align-self:flex-start;margin-top:auto;"
        onclick="abrirModal('${t.Nombre.replace(/'/g, "\\'")}')">
        Solicitar este trámite →
      </button>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════
//  MODAL — Solicitar trámite
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

  if (!nombre || !email) {
    alert('Por favor complete nombre y correo.');
    return;
  }

  const payload = {
    nombre,
    email,
    telefono: tel,
    tipo:     tramiteSeleccionado,
    mensaje:  mensaje || '(Sin comentarios adicionales)'
  };

  if (CONTACTO_URL) {
    try { await fetch(CONTACTO_URL, { method: 'POST', body: JSON.stringify(payload) }); }
    catch (e) { /* silencioso */ }
  }

  ['m-nombre', 'm-email', 'm-tel', 'm-mensaje'].forEach(id => {
    document.getElementById(id).value = '';
  });

  cerrarModal();
  showToast('✓ Solicitud de "' + tramiteSeleccionado.substring(0, 30) + '..." enviada');
}

// ══════════════════════════════════════════════
//  AGENDA — Carga y renderizado
// ══════════════════════════════════════════════
async function loadAgenda() {
  const tbody = document.getElementById('agenda-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem"><span class="spinner"></span> Cargando...</td></tr>';

  if (!AGENDA_URL) {
    agendaData = DEMO_AGENDA;
  } else {
    try {
      const res = await fetch(AGENDA_URL + '?tab=Agenda');
      agendaData = await res.json();
    } catch (e) {
      agendaData = DEMO_AGENDA;
    }
  }

  renderAgenda();
}

function renderAgenda() {
  const q    = document.getElementById('searchAgenda').value.toLowerCase();
  const tipo = document.getElementById('filterTipo').value;

  const list = agendaData.filter(a => {
    const text = (a.Cliente + a.Tipo + a.Abogado).toLowerCase();
    return (!q || text.includes(q)) && (!tipo || a.Tipo === tipo);
  });

  const tbody = document.getElementById('agenda-tbody');

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">Sin citas encontradas</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(a => `
    <tr>
      <td>${formatDate(a.Fecha)}</td>
      <td>${a.Hora}</td>
      <td>${a.Cliente}</td>
      <td>${a.Tipo}</td>
      <td>${a.Abogado}</td>
      <td><span class="badge ${a.Estado === 'Confirmada' ? 'badge-active' : 'badge-pending'}">${a.Estado}</span></td>
    </tr>
  `).join('');
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
    try {
      await fetch(CONTACTO_URL, { method: 'POST', body: JSON.stringify(payload) });
    } catch (e) { /* silencioso */ }
  }

  ['c-nombre', 'c-email', 'c-tel', 'c-mensaje'].forEach(id => {
    document.getElementById(id).value = '';
  });

  showToast('✓ Solicitud enviada correctamente');
}

// ══════════════════════════════════════════════
//  ESTADÍSTICAS (página Inicio)
// ══════════════════════════════════════════════
function updateStats() {
  document.getElementById('stat-tramites').textContent = tramitesData.length;
  document.getElementById('stat-citas').textContent    = agendaData.length || DEMO_AGENDA.length;

  const cats = new Set(tramitesData.map(t => t.Categoria).filter(Boolean));
  document.getElementById('stat-areas').textContent   = cats.size || '—';
}

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg || '✓ Operación exitosa';
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 3500);
}

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Cerrar modal al hacer clic fuera
  document.getElementById('modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) cerrarModal();
  });

  // Iniciar stats con datos demo
  updateStats();
});
