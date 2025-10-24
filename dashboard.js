(function () {
  // --- Sessão mínima ---
  const usuario = localStorage.getItem('usuarioLogado');
  document.getElementById('nomeUsuario').textContent = usuario || '';

  // Tipo de usuário: 'administrador' | 'aluno' | 'professor'
  const tipoUsuario = localStorage.getItem('tipoUsuario');
  const isAdmin = (tipoUsuario === 'administrador');

  // Referências úteis
  const menuCadastroLink = document.querySelector('#menu .nav-link[data-section="sec-cadastro"]');
  const secCadastro = document.getElementById('sec-cadastro');

  // Apenas administradores veem "Cadastro"
  if (isAdmin) {
    // Itens de menu a esconder
    const itensOcultar = ['sec-graficos', 'sec-calendario', 'sec-notificacoes'];

    itensOcultar.forEach(id => {
      // Esconde o item do menu
      const link = document.querySelector(`#menu .nav-link[data-section="${id}"]`);
      if (link) link.parentElement.style.display = 'none';

      // Esconde a seção correspondente
      const sec = document.getElementById(id);
      if (sec) sec.classList.add('d-none');
    });

    // Garante que uma aba visível permaneça ativa
    const ativo = document.querySelector('#menu .nav-link.active');
    if (ativo && itensOcultar.includes(ativo.getAttribute('data-section'))) {
      ativo.classList.remove('active');
      const fallback = document.querySelector('#menu .nav-link[data-section="sec-listagem"]');
      if (fallback) {
        fallback.classList.add('active');
        document.querySelectorAll('.sec').forEach(s => s.classList.add('d-none'));
        document.getElementById('sec-listagem').classList.remove('d-none');
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

  // ===================== DADOS (LocalStorage) =====================
  const KEY_ALUNOS = 'alunos';
  const KEY_PROFS  = 'professores';
  const alunos = JSON.parse(localStorage.getItem(KEY_ALUNOS) || '[]');
  const professores = JSON.parse(localStorage.getItem(KEY_PROFS) || '[]');

  // Salvar aluno
  const formAluno = document.getElementById('formAluno');
  if (formAluno) {
    formAluno.addEventListener('submit', (e) => {
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
  }

  // Salvar professor
  const formProf = document.getElementById('formProfessor');
  if (formProf) {
    formProf.addEventListener('submit', (e) => {
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
  }

  function value(sel){ return (document.querySelector(sel).value || '').trim(); }
  function setFb(el, msg, erro){
    el.textContent = msg;
    el.className = 'small mt-1 ' + (erro ? 'text-danger' : 'text-success');
  }

  // ===================== LISTAGEM + FILTRO =====================
  const filtro = document.getElementById('filtro');
  if (filtro) filtro.addEventListener('input', renderTabelas);

  // Tabs simples (Alunos/Professores)
  document.querySelectorAll('#tabsListagem .nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tabsListagem .nav-link').forEach(b => b.classList.remove('active'));
      btn.addEventListener('click', () => {});
      btn.classList.add('active');
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('show','active'));
      document.getElementById(btn.dataset.target).classList.add('show','active');
    });
  });

  // Mostra coluna "Ações" apenas para admin
  if (isAdmin) {
    document.querySelectorAll('.th-acoes').forEach(th => th.classList.remove('d-none'));
  }

  function renderTabelas(){
    const q = (filtro?.value || '').toLowerCase();

    // --- alunos
    const tbA = document.getElementById('tbodyAlunos');
    if (tbA) {
      tbA.innerHTML = '';
      alunos
        .map((a, i) => ({...a, i}))
        .filter(a => !q || a.nome.toLowerCase().includes(q) || a.email.toLowerCase().includes(q))
        .forEach(a => {
          const tr = document.createElement('tr');
          let acaoTd = '';
          if (isAdmin) {
            acaoTd = `
              <td>
                <button class="btn btn-sm btn-outline-secondary me-1 btn-editar" data-tipo="aluno" data-idx="${a.i}">Editar</button>
                <button class="btn btn-sm btn-outline-danger btn-excluir" data-tipo="aluno" data-idx="${a.i}">Excluir</button>
              </td>`;
          }
          tr.innerHTML = `<td>${a.nome}</td><td>${a.email}</td><td>${a.ra}</td>${acaoTd}`;
          tbA.appendChild(tr);
        });
    }

    // --- professores
    const tbP = document.getElementById('tbodyProfessores');
    if (tbP) {
      tbP.innerHTML = '';
      professores
        .map((p, i) => ({...p, i}))
        .filter(p => !q || p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
        .forEach(p => {
          const tr = document.createElement('tr');
          let acaoTd = '';
          if (isAdmin) {
            acaoTd = `
              <td>
                <button class="btn btn-sm btn-outline-secondary me-1 btn-editar" data-tipo="professor" data-idx="${p.i}">Editar</button>
                <button class="btn btn-sm btn-outline-danger btn-excluir" data-tipo="professor" data-idx="${p.i}">Excluir</button>
              </td>`;
          }
          tr.innerHTML = `<td>${p.nome}</td><td>${p.email}</td><td>${p.depto}</td>${acaoTd}`;
          tbP.appendChild(tr);
        });
    }
  }

  // ===================== AÇÕES (Editar / Excluir) =====================
  // Delegação de eventos na seção de listagem
  const secListagem = document.getElementById('sec-listagem');

  if (secListagem) {
    secListagem.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      if (!isAdmin && (btn.classList.contains('btn-editar') || btn.classList.contains('btn-excluir'))) {
        return; // segurança extra
      }

      const tipo = btn.dataset.tipo;     // 'aluno' | 'professor'
      const idx = Number(btn.dataset.idx);

      // EXCLUIR
      if (btn.classList.contains('btn-excluir')) {
        const nomeEnt = tipo === 'aluno' ? alunos[idx]?.nome : professores[idx]?.nome;
        if (confirm(`Excluir ${tipo} "${nomeEnt}"?`)) {
          if (tipo === 'aluno') {
            alunos.splice(idx, 1);
            localStorage.setItem(KEY_ALUNOS, JSON.stringify(alunos));
          } else {
            professores.splice(idx, 1);
            localStorage.setItem(KEY_PROFS, JSON.stringify(professores));
          }
          renderTabelas();
        }
        return;
      }

      // EDITAR -> abre modal preenchido
      if (btn.classList.contains('btn-editar')) {
        abrirModalEditar(tipo, idx);
      }
    });
  }

  // --- Modal: abrir, preencher, salvar ---
  const modalEl = document.getElementById('modalEditar');
  const formModal = document.getElementById('formModalEditar');
  let modal;

  function abrirModalEditar(tipo, idx) {
    document.getElementById('modalTipo').value = tipo;
    document.getElementById('modalIndex').value = String(idx);

    const titulo = document.getElementById('modalTitulo');
    const grupoAluno = document.getElementById('grupoAluno');
    const grupoProfessor = document.getElementById('grupoProfessor');

    if (tipo === 'aluno') {
      titulo.textContent = 'Editar Aluno';
      grupoAluno.classList.remove('d-none');
      grupoProfessor.classList.add('d-none');

      const a = alunos[idx];
      document.getElementById('mAlunoNome').value  = a?.nome  || '';
      document.getElementById('mAlunoEmail').value = a?.email || '';
      document.getElementById('mAlunoRA').value    = a?.ra    || '';
    } else {
      titulo.textContent = 'Editar Professor';
      grupoProfessor.classList.remove('d-none');
      grupoAluno.classList.add('d-none');

      const p = professores[idx];
      document.getElementById('mProfNome').value  = p?.nome  || '';
      document.getElementById('mProfEmail').value = p?.email || '';
      document.getElementById('mProfDepto').value = p?.depto || '';
    }

    modal = modal || new bootstrap.Modal(modalEl);
    modal.show();
  }

  if (formModal) {
    formModal.addEventListener('submit', (e) => {
      e.preventDefault();
      const tipo = document.getElementById('modalTipo').value;
      const idx  = Number(document.getElementById('modalIndex').value);

      if (tipo === 'aluno') {
        const nome  = document.getElementById('mAlunoNome').value.trim();
        const email = document.getElementById('mAlunoEmail').value.trim();
        const ra    = document.getElementById('mAlunoRA').value.trim();
        if (!nome || !email || !ra) return;

        alunos[idx] = { nome, email, ra };
        localStorage.setItem(KEY_ALUNOS, JSON.stringify(alunos));
      } else {
        const nome  = document.getElementById('mProfNome').value.trim();
        const email = document.getElementById('mProfEmail').value.trim();
        const depto = document.getElementById('mProfDepto').value.trim();
        if (!nome || !email || !depto) return;

        professores[idx] = { nome, email, depto };
        localStorage.setItem(KEY_PROFS, JSON.stringify(professores));
      }

      modal?.hide();
      renderTabelas();
    });
  }

  // ===================== GRÁFICOS (Chart.js simples) =====================
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

  // ===================== CALENDÁRIO (FullCalendar simples) =====================
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

  // ===================== NOTIFICAÇÕES (simples) =====================
  const listaNotificacoes = document.getElementById('listaNotificacoes');
  const btnNovaNotificacao = document.getElementById('btnNovaNotificacao');
  if (btnNovaNotificacao) {
    btnNovaNotificacao.addEventListener('click', () => {
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
  }

  // --- Inicializa listagens na primeira carga ---
  renderTabelas();
})();

