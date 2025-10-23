(function () {
  // --- Sessão mínima ---
  const usuario = localStorage.getItem('usuarioLogado');
  document.getElementById('nomeUsuario').textContent = usuario;

  // >>> NOVO: checa tipo do usuário
  const tipoUsuario = localStorage.getItem('tipoUsuario'); // 'administrador' | 'aluno' | 'professor'
  const menuCadastroLink = document.querySelector('#menu .nav-link[data-section="sec-cadastro"]');
  const secCadastro = document.getElementById('sec-cadastro');

  const isAdmin = (tipoUsuario === 'administrador');

  if (!isAdmin) {
    // Esconde o item de menu e a seção
    if (menuCadastroLink) menuCadastroLink.parentElement.style.display = 'none';
    if (secCadastro) secCadastro.classList.add('d-none');

    // Se, por algum motivo, o "Cadastro" estava ativo, muda para Listagem
    const linkAtivo = document.querySelector('#menu .nav-link.active');
    if (linkAtivo && linkAtivo.getAttribute('data-section') === 'sec-cadastro') {
      linkAtivo.classList.remove('active');
      const fallback = document.querySelector('#menu .nav-link[data-section="sec-listagem"]') 
                       || document.querySelector('#menu .nav-link'); // primeiro que existir
      if (fallback) {
        fallback.classList.add('active');
        document.querySelectorAll('.sec').forEach(s => s.classList.add('d-none'));
        const alvoId = fallback.getAttribute('data-section');
        if (alvoId) document.getElementById(alvoId).classList.remove('d-none');
      }
    }
  }

  // --- Tema claro/escuro (mesmo do login) ---
  const body = document.body;
  const switchTema = document.getElementById('switchTema');
  const labelTema = document.getElementById('labelTema');
  const temaSalvo = localStorage.getItem('tema') || 'light';
  aplicarTema(temaSalvo);

  switchTema.addEventListener('change', () => {
    const novoTema = switchTema.checked ? 'dark' : 'light';
    aplicarTema(novoTema);
    localStorage.setItem('tema', novoTema);
  });

  function aplicarTema(nomeTema) {
    body.setAttribute('data-bs-theme', nomeTema);
    labelTema.textContent = nomeTema === 'dark' ? 'Modo escuro' : 'Modo claro';
    switchTema.checked = nomeTema === 'dark';
  }

  // --- Sair ---
  document.getElementById('btnSair').addEventListener('click', () => {
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('tipoUsuario');
    window.location.href = 'index.html';
  });

  // --- Navegação entre seções (SPA simples) ---
  const links = document.querySelectorAll('#menu .nav-link');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const alvo = link.getAttribute('data-section');
      document.querySelectorAll('.sec').forEach(sec => sec.classList.add('d-none'));
      document.getElementById(alvo).classList.remove('d-none');
    });
  });

  // =============== CADASTRO (mock com LocalStorage) ===============
  const KEY_ALUNOS = 'alunos';
  const KEY_PROFS  = 'professores';
  const alunos = JSON.parse(localStorage.getItem(KEY_ALUNOS) || '[]');
  const professores = JSON.parse(localStorage.getItem(KEY_PROFS) || '[]');

  // Salvar aluno
  document.getElementById('formAluno').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = value('#alunoNome'), email = value('#alunoEmail'), ra = value('#alunoRA');
    const fb = document.getElementById('fbAluno');
    if (!nome || !email || !ra) return setFb(fb, 'Preencha todos os campos.', true);

    alunos.push({ nome, email, ra });
    localStorage.setItem(KEY_ALUNOS, JSON.stringify(alunos));
    e.target.reset();
    setFb(fb, 'Aluno cadastrado!', false);
    renderTabelas();
  });

  // Salvar professor
  document.getElementById('formProfessor').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = value('#profNome'), email = value('#profEmail'), depto = value('#profDepto');
    const fb = document.getElementById('fbProfessor');
    if (!nome || !email || !depto) return setFb(fb, 'Preencha todos os campos.', true);

    professores.push({ nome, email, depto });
    localStorage.setItem(KEY_PROFS, JSON.stringify(professores));
    e.target.reset();
    setFb(fb, 'Professor cadastrado!', false);
    renderTabelas();
  });

  function value(sel){ return (document.querySelector(sel).value || '').trim(); }
  function setFb(el, msg, erro){
    el.textContent = msg;
    el.className = 'small mt-1 ' + (erro ? 'text-danger' : 'text-success');
  }

  // =============== LISTAGEM + FILTRO ===============
  const filtro = document.getElementById('filtro');
  filtro.addEventListener('input', renderTabelas);

  // Tabs simples (Alunos/Professores)
  document.querySelectorAll('#tabsListagem .nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tabsListagem .nav-link').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('show','active'));
      document.getElementById(btn.dataset.target).classList.add('show','active');
    });
  });

  function renderTabelas(){
    const q = (filtro.value || '').toLowerCase();

    // alunos
    const tbA = document.getElementById('tbodyAlunos');
    tbA.innerHTML = '';
    alunos
      .filter(a => !q || a.nome.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
      .forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${a.nome}</td><td>${a.email}</td><td>${a.ra}</td>`;
        tbA.appendChild(tr);
      });

    // professores
    const tbP = document.getElementById('tbodyProfessores');
    tbP.innerHTML = '';
    professores
      .filter(p => !q || p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
      .forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.nome}</td><td>${p.email}</td><td>${p.depto}</td>`;
        tbP.appendChild(tr);
      });
  }

  // =============== GRÁFICOS (Chart.js simples) ===============
  const ctx = document.getElementById('chartNotas');
  if (ctx && window.Chart) {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Cálculo', 'Algoritmos', 'Física', 'BD', 'EDO'],
        datasets: [{ label: 'Média da Turma', data: [7.5, 8.2, 6.9, 8.0, 7.2] }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true, suggestedMax: 10 } } }
    });
  }

  // =============== CALENDÁRIO (FullCalendar simples) ===============
  const calEl = document.getElementById('calendario');
  if (calEl && window.FullCalendar) {
    const cal = new FullCalendar.Calendar(calEl, {
      initialView: 'dayGridMonth',
      height: 'auto',
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
      events: [
        { title: 'Aula Algoritmos', start: new Date().toISOString().slice(0,10) },
        { title: 'Prova de Cálculo', start: addDays(5) },
        { title: 'Entrega Trabalho Física', start: addDays(10) }
      ]
    });
    cal.render();
  }
  function addDays(n){ const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }

  // =============== NOTIFICAÇÕES (simples) ===============
  const listaNotificacoes = document.getElementById('listaNotificacoes');
  document.getElementById('btnNovaNotificacao').addEventListener('click', () => {
    const id = 'toast-'+Date.now();
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center show border';
    toast.role = 'alert';
    toast.id = id;
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">Nova notificação de exemplo às ${new Date().toLocaleTimeString()}</div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
      </div>`;
    listaNotificacoes.prepend(toast);
  });

  // --- Inicializa listagens na primeira carga ---
  renderTabelas();
})();
