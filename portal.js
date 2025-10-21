// ===== Sessão e Tema =====
const dados = localStorage.getItem('usuarioLogado');
if (!dados) window.location.replace('index.html');
const { usuario, tipo } = JSON.parse(dados);
document.getElementById('saudacao').textContent = `Bem-vindo(a), ${usuario}`;
document.getElementById('perfilLinha').textContent = `Logado como: ${usuario} — perfil: ${tipo}`;
document.getElementById('logout').onclick = () => {
  localStorage.removeItem('usuarioLogado');
  location.replace('index.html');
};

// tema persistente
const themeKey = 'portalTheme';
const savedTheme = localStorage.getItem(themeKey) || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('toggleTheme').onclick = (e) => {
  e.preventDefault();
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(themeKey, next);
};

// Sidebar mobile
const sb = document.getElementById('sidebar');
function toggleSidebar() { sb.classList.toggle('open'); }
document.getElementById('btnMenu').onclick = toggleSidebar;
window.toggleSidebar = toggleSidebar; // usado no botão flutuante

// ===== Navegação =====
document.querySelectorAll('.nav a[data-target]').forEach(a => {
  a.addEventListener('click', (ev) => {
    ev.preventDefault();
    document.querySelectorAll('.nav a').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    document.querySelectorAll('.content').forEach(sec => sec.classList.remove('active'));
    document.getElementById(a.dataset.target).classList.add('active');
    sb.classList.remove('open');
  });
});

// ===== Estado (LocalStorage) =====
const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
};
const alunosKey = 'alunos';
const profsKey = 'professores';
const notifKey = 'notificacoes';
const calKey = 'calEventos';

// seeds
if (!store.get(alunosKey)) store.set(alunosKey, [
  { nome: 'Ana Souza', ra: '120001', curso: 'ADS', 'turma': '2A' },
  { nome: 'Bruno Lima', ra: '120045', curso: 'Eng. Comp.', 'turma': '3B' },
  { nome: 'Carla Nunes', ra: '119998', curso: 'Sistemas', 'turma': '1A' }
]);
if (!store.get(profsKey)) store.set(profsKey, [
  { nome: 'Marcos Vieira', matricula: '50010', departamento: 'Computação', email: 'marcos@faculdade.br' },
  { nome: 'Patrícia Gomes', matricula: '50020', departamento: 'Gestão', email: 'patricia@faculdade.br' }
]);
if (!store.get(notifKey)) store.set(notifKey, []);
if (!store.get(calKey)) store.set(calKey, {});

// ===== DASHBOARD: KPIs + Chart =====
function atualizarKPIs() {
  const alunos = store.get(alunosKey, []);
  const profs = store.get(profsKey, []);
  const ocup = 75 + Math.round(Math.random() * 20); // demo
  document.getElementById('kpiAlunos').textContent = alunos.length;
  document.getElementById('kpiProfs').textContent = profs.length;
  document.getElementById('kpiOcup').textContent = ocup + '%';
  document.getElementById('kpiAlunosVar').textContent = '↑ 3 novos este mês';
  document.getElementById('kpiProfsVar').textContent = '— estável';
  document.getElementById('kpiOcupVar').textContent = '↑ variação sazonal';
}

// canvas chart (sem libs)
const ctx = document.getElementById('chart').getContext('2d');
const meses = ['Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function dadosSerie(turma, indicador) {
  const base = indicador === 'nota' ? 60 : 80;
  const amp  = indicador === 'nota' ? 25 : 15;
  const seed = (turma.charCodeAt(0)+turma.charCodeAt(1)+turma.charCodeAt(2))%7;
  const arr = meses.map((_,i)=> Math.round(base + Math.sin((i+seed)/1.6)*amp + (Math.random()*6-3)));
  return arr.map(v=> indicador==='nota'? Math.max(0, Math.min(100,v)) : Math.max(60, Math.min(100,v)));
}

function desenharGrafico() {
  const turma = document.getElementById('serieSelect').value;
  const indicador = document.getElementById('indicadorSelect').value;

  ctx.clearRect(0,0,ctx.canvas.width, ctx.canvas.height);
  const w = ctx.canvas.width, h = ctx.canvas.height, padding = 32;
  const valores = dadosSerie(turma, indicador);
  const min = Math.min(...valores), max = Math.max(...valores);
  const yMin = Math.floor((min-5)/5)*5, yMax = Math.ceil((max+5)/5)*5;

  // eixos
  ctx.lineWidth = 1; ctx.globalAlpha = .8;
  ctx.beginPath(); ctx.moveTo(padding, padding/2); ctx.lineTo(padding, h-padding); ctx.lineTo(w-padding/2, h-padding);
  ctx.strokeStyle = '#8884'; ctx.stroke();

  // grid + labels
  ctx.fillStyle = 'currentColor'; ctx.font='12px system-ui';
  const steps = 5;
  for (let i=0;i<=steps;i++){
    const y = h-padding - (i/steps)*(h-1.5*padding);
    const val = Math.round(yMin + (i/steps)*(yMax-yMin));
    ctx.fillText(val, 6, y+4);
    ctx.beginPath(); ctx.moveTo(padding,y); ctx.lineTo(w-padding/2,y); ctx.strokeStyle='#8882'; ctx.stroke();
  }
  meses.forEach((m,i)=>{
    const x = padding + (i/(meses.length-1))*(w-1.5*padding);
    ctx.fillText(m, x-8, h-10);
  });

  // linha
  ctx.beginPath();
  valores.forEach((v,i)=>{
    const x = padding + (i/(meses.length-1))*(w-1.5*padding);
    const y = h-padding - ((v-yMin)/(yMax-yMin))*(h-1.5*padding);
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.lineWidth = 2;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary');
  ctx.stroke();

  // pontos
  valores.forEach((v,i)=>{
    const x = padding + (i/(meses.length-1))*(w-1.5*padding);
    const y = h-padding - ((v-yMin)/(yMax-yMin))*(h-1.5*padding);
    ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2);
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--primary-2'); ctx.fill();
  });
}
document.getElementById('serieSelect').onchange = desenharGrafico;
document.getElementById('indicadorSelect').onchange = desenharGrafico;

// ===== CADASTROS (validação) =====
function valida(form){
  let ok = true;
  form.querySelectorAll('input,select,textarea').forEach(el=>{
    const box = form.querySelector(`[data-error-for="${el.name}"]`);
    if(box) box.textContent = '';
    if(el.hasAttribute('required') && !el.value.trim()){
      if(box) box.textContent = 'Obrigatório'; ok=false;
    }
    if(ok && el.pattern){
      const re = new RegExp(el.pattern);
      if(!re.test(el.value.trim())){ if(box) box.textContent = 'Formato inválido'; ok=false; }
    }
    if(ok && el.type==='email'){
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if(!re.test(el.value.trim())){ if(box) box.textContent = 'E-mail inválido'; ok=false; }
    }
  });
  return ok;
}

document.getElementById('formAluno').addEventListener('submit',(e)=>{
  e.preventDefault();
  const f = e.currentTarget;
  if(!valida(f)) return;
  const novo = { nome:f.nome.value.trim(), ra:f.ra.value.trim(), curso:f.curso.value, turma:f.turma.value.trim().toUpperCase() };
  const lista = store.get(alunosKey, []);
  if(lista.some(a=>a.ra===novo.ra)){ f.querySelector('[data-error-for="ra"]').textContent='RA já cadastrado'; return; }
  lista.push(novo); store.set(alunosKey, lista);
  f.reset(); renderAlunos(); atualizarKPIs(); alert('Aluno cadastrado!');
});

document.getElementById('formProfessor').addEventListener('submit',(e)=>{
  e.preventDefault();
  const f = e.currentTarget;
  if(!valida(f)) return;
  const novo = { nome:f.nome.value.trim(), matricula:f.matricula.value.trim(), departamento:f.departamento.value, email:f.email.value.trim() };
  const lista = store.get(profsKey, []);
  if(lista.some(p=>p.matricula===novo.matricula)){ f.querySelector('[data-error-for="matricula"]').textContent='Matrícula já cadastrada'; return; }
  lista.push(novo); store.set(profsKey, lista);
  f.reset(); renderProfs(); atualizarKPIs(); alert('Professor cadastrado!');
});

// ===== LISTAGENS + FILTROS =====
function renderAlunos(){
  const q = document.getElementById('qAluno').value.toLowerCase();
  const c = document.getElementById('fCurso').value;
  const t = document.getElementById('fTurma').value;
  const body = document.getElementById('tbAlunos');
  body.innerHTML = '';
  store.get(alunosKey, []).filter(a=>{
    const hit = (a.nome.toLowerCase().includes(q) || a.ra.includes(q));
    const fc = !c || a.curso===c;
    const ft = !t || a.turma===t;
    return hit && fc && ft;
  }).forEach((a,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${a.nome}</td><td>${a.ra}</td><td>${a.curso}</td><td>${a.turma}</td>
                    <td class="row-actions"><button class="btn" data-del-a="${i}">Excluir</button></td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll('[data-del-a]').forEach(btn=>{
    btn.onclick = ()=>{
      const idx = +btn.dataset.delA;
      const arr = store.get(alunosKey, []);
      arr.splice(idx,1); store.set(alunosKey, arr); renderAlunos(); atualizarKPIs();
    };
  });
}
function renderProfs(){
  const q = document.getElementById('qProf').value.toLowerCase();
  const d = document.getElementById('fDepto').value;
  const body = document.getElementById('tbProfs');
  body.innerHTML = '';
  store.get(profsKey, []).filter(p=>{
    const hit = (p.nome.toLowerCase().includes(q) || p.matricula.includes(q));
    const fd = !d || p.departamento===d;
    return hit && fd;
  }).forEach((p,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.nome}</td><td>${p.matricula}</td><td>${p.departamento}</td><td>${p.email}</td>
                    <td class="row-actions"><button class="btn" data-del-p="${i}">Excluir</button></td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll('[data-del-p]').forEach(btn=>{
    btn.onclick = ()=>{
      const idx = +btn.dataset.delP;
      const arr = store.get(profsKey, []);
      arr.splice(idx,1); store.set(profsKey, arr); renderProfs(); atualizarKPIs();
    };
  });
}
['qAluno','fCurso','fTurma'].forEach(id=> document.getElementById(id).oninput = renderAlunos);
['qProf','fDepto'].forEach(id=> document.getElementById(id).oninput = renderProfs);

// ===== NOTIFICAÇÕES =====
function renderNotif(){
  const box = document.getElementById('listaNotif');
  const arr = store.get(notifKey, []);
  box.innerHTML = arr.length? '' : '<p class="muted">Nenhuma notificação ainda.</p>';
  arr.slice().reverse().forEach((n,idx)=>{
    const div = document.createElement('div');
    div.className='card';
    div.innerHTML = `<strong>${n.titulo} <span class="pill">${n.tipo}</span></strong>
                     <div class="muted" style="margin:6px 0">${new Date(n.data).toLocaleString()}</div>
                     <div>${n.mensagem}</div>
                     <div class="row-actions" style="margin-top:8px">
                       <button class="btn" data-rm="${arr.length-1-idx}">Remover</button>
                     </div>`;
    box.appendChild(div);
  });
  document.getElementById('badgeNotif').textContent = arr.length + (arr.length===1?' notificação':' notificações');
  box.querySelectorAll('[data-rm]').forEach(b=>{
    b.onclick=()=>{
      const i = +b.dataset.rm;
      const a = store.get(notifKey, []);
      a.splice(i,1); store.set(notifKey,a); renderNotif();
    };
  });
}
document.getElementById('formNotif').addEventListener('submit',(e)=>{
  e.preventDefault();
  const f = e.currentTarget;
  const novo = { titulo: f.titulo.value.trim() || 'Sem título', tipo: f.tipo.value, mensagem: f.mensagem.value.trim(), data: new Date().toISOString() };
  if(!novo.mensagem){ alert('Escreva a mensagem.'); return; }
  const arr = store.get(notifKey, []); arr.push(novo); store.set(notifKey, arr); f.reset(); renderNotif();
});

// ===== CALENDÁRIO =====
const mesTitulo = document.getElementById('mesTitulo');
const calGrid = document.getElementById('calGrid');
let ref = new Date();

function ymd(d){ return d.toISOString().slice(0,10); }
function eventosDia(diaStr){ const all = store.get(calKey, {}); return all[diaStr]||[]; }
function salvarEvento(diaStr, evt){ const all = store.get(calKey, {}); all[diaStr] = (all[diaStr]||[]).concat(evt); store.set(calKey, all); }
function deletarEvento(diaStr, idx){ const all = store.get(calKey, {}); (all[diaStr]||[]).splice(idx,1); store.set(calKey, all); }

function renderCalendario(){
  const ano = ref.getFullYear(), mes = ref.getMonth();
  mesTitulo.textContent = ref.toLocaleDateString('pt-BR', {month:'long', year:'numeric'});
  calGrid.innerHTML = '';
  const primeiro = new Date(ano, mes, 1);
  const inicioGrid = new Date(primeiro); inicioGrid.setDate(primeiro.getDate() - ((primeiro.getDay()+6)%7)); // segunda
  for(let i=0;i<42;i++){
    const d = new Date(inicioGrid); d.setDate(inicioGrid.getDate()+i);
    const cell = document.createElement('div'); cell.className='cal-cell';
    if(d.getMonth()!==mes) cell.style.opacity=.6;
    cell.innerHTML = `<div class="cal-day">${d.toLocaleDateString('pt-BR',{weekday:'short', day:'2-digit'})}</div>`;
    const key = ymd(d);
    const evts = eventosDia(key);
    evts.forEach((e,idx)=>{
      const pill = document.createElement('span'); pill.className='pill'; pill.textContent = e.tag+': '+e.t;
      pill.title='Clique para remover'; pill.style.cursor='pointer';
      pill.onclick = ()=>{ if(confirm('Remover evento?')){ deletarEvento(key, idx); renderCalendario(); } };
      cell.appendChild(pill);
    });
    cell.onclick = ()=>{
      const t = prompt('Novo evento para '+key+' (deixe vazio para cancelar):'); if(!t) return;
      const tag = prompt('Categoria (Provas/Trabalhos/Eventos):','Eventos') || 'Eventos';
      salvarEvento(key, {t, tag}); renderCalendario();
    };
    calGrid.appendChild(cell);
  }
}
document.getElementById('prevMes').onclick = ()=>{ ref.setMonth(ref.getMonth()-1); renderCalendario(); };
document.getElementById('proxMes').onclick = ()=>{ ref.setMonth(ref.getMonth()+1); renderCalendario(); };

// ===== Inicialização =====
function init(){
  atualizarKPIs();
  // ajustar canvas ao tamanho do container
  const canvas = document.getElementById('chart');
  function resize(){ canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; desenharGrafico(); }
  resize(); window.addEventListener('resize', resize);
  desenharGrafico();
  renderAlunos(); renderProfs();
  renderNotif();
  renderCalendario();
}
init();