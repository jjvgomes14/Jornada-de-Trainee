(function () {
  // --- Sessão mínima ---
  const usuario = localStorage.getItem('usuarioLogado');
  document.getElementById('nomeUsuario').textContent = usuario || '';

  // Tipo de usuário
  const tipoUsuario = localStorage.getItem('tipoUsuario');
  const isAdmin = tipoUsuario === 'administrador';
  const isProfessor = tipoUsuario === 'professor';

  // --- Esconder/mostrar menus conforme tipo ---
  function ocultarMenus() {
    let itensOcultar = [];

    if (isAdmin) {
      // Admin: sem Gráficos, Calendário, Notificações e Notas
      itensOcultar = ['sec-graficos', 'sec-calendario', 'sec-notificacoes', 'sec-notas'];
    } else if (isProfessor) {
      // Professor: sem Cadastro e Notificações; vê Notas
      itensOcultar = ['sec-cadastro', 'sec-notificacoes'];
    } else {
      // Aluno: esconde Notas (uso do professor)
      itensOcultar = ['sec-notas'];
    }

    itensOcultar.forEach(id => {
      const link = document.querySelector(`#menu .nav-link[data-section="${id}"]`);
      if (link) link.parentElement.style.display = 'none';
      const sec = document.getElementById(id);
      if (sec) sec.classList.add('d-none');
    });

    // Corrigir aba ativa se foi ocultada
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
  ocultarMenus();

  // --- Tema claro/escuro ---
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

  // --- Navegação SPA ---
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
  const KEY_ALUNOS  = 'alunos';
  const KEY_PROFS   = 'professores';
  const KEY_EVENTOS = 'eventos';

  const alunos       = JSON.parse(localStorage.getItem(KEY_ALUNOS)  || '[]');
  const professores  = JSON.parse(localStorage.getItem(KEY_PROFS)   || '[]');
  const eventosStore = JSON.parse(localStorage.getItem(KEY_EVENTOS) || '[]'); // [{id,title,start,end,allDay}]

  // --- Cadastro: Alunos ---
  const formAluno = document.getElementById('formAluno');
  if (formAluno) {
    formAluno.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome  = value('#alunoNome');
      const email = value('#alunoEmail');
      const ra    = value('#alunoRA');
      const turma = value('#alunoTurma');
      const fb = document.getElementById('fbAluno');
      if (!nome || !email || !ra || !turma) return setFb(fb, 'Preencha todos os campos.', true);

      alunos.push({ nome, email, ra, turma, notas: [] });
      localStorage.setItem(KEY_ALUNOS, JSON.stringify(alunos));
      e.target.reset();
      setFb(fb, 'Aluno cadastrado!', false);
      popularFiltrosListagem();
      popularTurmasGraficos();
      popularTurmasNotas();
      renderTabelas();
      renderGraficoTurma();
      renderTabelaNotas();
    });
  }

  // --- Cadastro: Professores ---
  const formProf = document.getElementById('formProfessor');
  if (formProf) {
    formProf.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome  = value('#profNome');
      const email = value('#profEmail');
      const depto = value('#profDepto');
      const fb = document.getElementById('fbProfessor');
      if (!nome || !email || !depto) return setFb(fb, 'Preencha todos os campos.', true);

      professores.push({ nome, email, depto });
      localStorage.setItem(KEY_PROFS, JSON.stringify(professores));
      e.target.reset();
      setFb(fb, 'Professor cadastrado!', false);
      popularFiltrosListagem();
      renderTabelas();
    });
  }

  function value(sel){ return (document.querySelector(sel)?.value || '').trim(); }
  function setFb(el, msg, erro){
    el.textContent = msg;
    el.className = 'small mt-1 ' + (erro ? 'text-danger' : 'text-success');
  }

  // ===================== LISTAGEM + FILTROS (como definido) =====================
  const selTurma = document.getElementById('selTurma');
  const selDisc  = document.getElementById('selDisciplina');
  const filtroTurmaWrap = document.getElementById('filtroTurmaWrap');
  const filtroDiscWrap  = document.getElementById('filtroDiscWrap');

  if (selTurma) selTurma.addEventListener('change', renderTabelas);
  if (selDisc)  selDisc.addEventListener('change', renderTabelas);

  document.querySelectorAll('#tabsListagem .nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tabsListagem .nav-link').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('show','active'));
      document.getElementById(btn.dataset.target).classList.add('show','active');

      const alunosAtivo = (btn.dataset.target === 'tab-alunos');
      filtroTurmaWrap.classList.toggle('d-none', !alunosAtivo);
      filtroDiscWrap.classList.toggle('d-none', alunosAtivo);
    });
  });

  // Coluna "Ações" só para admin
  if (isAdmin) {
    document.querySelectorAll('.th-acoes').forEach(th => th.classList.remove('d-none'));
  }

  function popularFiltrosListagem() {
    // Turmas (alunos)
    if (selTurma) {
      const atual = selTurma.value || '__todas__';
      const turmas = Array.from(new Set(alunos.map(a => (a.turma || '').trim()).filter(Boolean))).sort();
      selTurma.innerHTML = `<option value="__todas__">Todas</option>` + turmas.map(t => `<option>${t}</option>`).join('');
      if (Array.from(selTurma.options).some(o => o.value === atual)) selTurma.value = atual;
    }
    // Disciplinas (professores)
    if (selDisc) {
      const atualD = selDisc.value || '__todas__';
      const discs = Array.from(new Set(professores.map(p => (p.depto || '').trim()).filter(Boolean))).sort();
      selDisc.innerHTML = `<option value="__todas__">Todas</option>` + discs.map(d => `<option>${d}</option>`).join('');
      if (Array.from(selDisc.options).some(o => o.value === atualD)) selDisc.value = atualD;
    }
  }

  function renderTabelas(){
    // --- alunos por Turma ---
    const tbA = document.getElementById('tbodyAlunos');
    if (tbA) {
      const turmaFiltro = selTurma?.value || '__todas__';
      tbA.innerHTML = '';
      alunos.map((a, i) => ({...a, i}))
        .filter(a => turmaFiltro === '__todas__' ? true : (a.turma || '') === turmaFiltro)
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
          tr.innerHTML = `
            <td>${a.nome}</td>
            <td>${a.email}</td>
            <td>${a.ra}</td>
            <td>${a.turma || '—'}</td>
            ${acaoTd}`;
          tbA.appendChild(tr);
        });
    }

    // --- professores por Disciplina ---
    const tbP = document.getElementById('tbodyProfessores');
    if (tbP) {
      const discFiltro = selDisc?.value || '__todas__';
      tbP.innerHTML = '';
      professores.map((p, i) => ({...p, i}))
        .filter(p => discFiltro === '__todas__' ? true : (p.depto || '') === discFiltro)
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
          tr.innerHTML = `<td>${p.nome}</td><td>${p.email}</td><td>${p.depto || '—'}</td>${acaoTd}`;
          tbP.appendChild(tr);
        });
    }
  }

  // ===================== AÇÕES (Editar / Excluir em Listagem) =====================
  const secListagem = document.getElementById('sec-listagem');
  if (secListagem) {
    secListagem.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      if (!isAdmin && (btn.classList.contains('btn-editar') || btn.classList.contains('btn-excluir'))) return;

      const tipo = btn.dataset.tipo;
      const idx  = Number(btn.dataset.idx);

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
          popularFiltrosListagem();
          popularTurmasGraficos();
          popularTurmasNotas();
          renderTabelas();
          renderGraficoTurma();
          renderTabelaNotas();
        }
        return;
      }

      if (btn.classList.contains('btn-editar')) abrirModalEditar(tipo, idx);
    });
  }

  // --- Modal editar (aluno/professor) ---
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
      document.getElementById('mAlunoNome').value   = a?.nome   || '';
      document.getElementById('mAlunoEmail').value  = a?.email  || '';
      document.getElementById('mAlunoRA').value     = a?.ra     || '';
      document.getElementById('mAlunoTurma').value  = a?.turma  || '';
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
        const nome   = document.getElementById('mAlunoNome').value.trim();
        const email  = document.getElementById('mAlunoEmail').value.trim();
        const ra     = document.getElementById('mAlunoRA').value.trim();
        const turma  = document.getElementById('mAlunoTurma').value.trim();
        if (!nome || !email || !ra || !turma) return;

        const notas = Array.isArray(alunos[idx].notas) ? alunos[idx].notas : [];
        alunos[idx] = { ...alunos[idx], nome, email, ra, turma, notas };
        localStorage.setItem(KEY_ALUNOS, JSON.stringify(alunos));
      } else {
        const nome  = document.getElementById('mProfNome').value.trim();
        const email = document.getElementById('mProfEmail').value.trim();
        const depto = document.getElementById('mProfDepto').value.trim();
        if (!nome || !email || !depto) return;

        professores[idx] = { ...professores[idx], nome, email, depto };
        localStorage.setItem(KEY_PROFS, JSON.stringify(professores));
      }

      modal?.hide();
      popularFiltrosListagem();
      popularTurmasGraficos();
      popularTurmasNotas();
      renderTabelas();
      renderGraficoTurma();
      renderTabelaNotas();
    });
  }

  // ===================== GRÁFICOS (Média por Turma) =====================
  const selTurmaGraf = document.getElementById('selTurmaGraf');
  let chartNotas;
  if (selTurmaGraf) selTurmaGraf.addEventListener('change', renderGraficoTurma);

  function popularTurmasGraficos() {
    if (!selTurmaGraf) return;
    const atual = selTurmaGraf.value || '__selecione__';
    const turmas = Array.from(new Set(alunos.map(a => (a.turma || '').trim()).filter(Boolean))).sort();
    selTurmaGraf.innerHTML = `<option value="__selecione__">Selecione...</option>` + turmas.map(t => `<option>${t}</option>`).join('');
    if (Array.from(selTurmaGraf.options).some(o => o.value === atual)) selTurmaGraf.value = atual;
  }

  function media(arr) {
    if (!arr.length) return null;
    const soma = arr.reduce((s, x) => s + x, 0);
    return soma / arr.length;
  }

  function renderGraficoTurma() {
    const msg = document.getElementById('grafMsg');
    if (!document.getElementById('chartNotas')) return;

    const turma = selTurmaGraf?.value || '__selecione__';
    if (turma === '__selecione__') {
      if (msg) msg.textContent = 'Selecione uma turma para ver a média.';
      if (chartNotas) { chartNotas.destroy(); chartNotas = null; }
      return;
    }

    const notasTurma = alunos
      .filter(a => (a.turma || '') === turma)
      .flatMap(a => Array.isArray(a.notas) ? a.notas.filter(n => typeof n === 'number') : []);

    const m = media(notasTurma);
    if (m == null) {
      if (msg) msg.textContent = 'Nenhuma nota encontrada nesta turma.';
      if (chartNotas) { chartNotas.destroy(); chartNotas = null; }
      return;
    }
    if (msg) msg.textContent = `Turma ${turma} — Média calculada sobre ${notasTurma.length} nota(s).`;

    const ctx = document.getElementById('chartNotas');
    const data = {
      labels: ['Média da Turma'],
      datasets: [{ label: `Turma ${turma}`, data: [Number(m.toFixed(2))] }]
    };
    const options = { responsive: true, scales: { y: { beginAtZero: true, suggestedMax: 10 } } };

    if (chartNotas) {
      chartNotas.data = data;
      chartNotas.options = options;
      chartNotas.update();
    } else {
      chartNotas = new Chart(ctx, { type: 'bar', data, options });
    }
  }

  // ===================== CALENDÁRIO (Professor CRUD) =====================
  const calEl = document.getElementById('calendario');
  if (calEl && window.FullCalendar) {
    const calHint = document.getElementById('calHint');
    if (isProfessor) {
      if (calHint) calHint.textContent = 'Clique em um dia para adicionar; arraste para mover; clique no evento para editar/excluir.';
    } else {
      if (calHint) calHint.textContent = 'Visualização somente leitura.';
    }

    const calendar = new FullCalendar.Calendar(calEl, {
      initialView: 'dayGridMonth',
      height: 'auto',
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
      selectable: !!isProfessor,
      editable:   !!isProfessor,
      events: eventosStore,
      dateClick: (info) => {
        if (!isProfessor) return;
        const title = prompt('Título do evento:');
        if (!title) return;
        const ev = { id: 'ev-' + Date.now(), title, start: info.dateStr, allDay: true };
        calendar.addEvent(ev);
        salvarEventos(calendar);
      },
      eventClick: (info) => {
        if (!isProfessor) return;
        const ev = info.event;
        const acao = prompt('Editar título (deixe vazio para excluir):', ev.title);
        if (acao === null) return;
        if (acao === '') {
          if (confirm('Excluir este evento?')) {
            ev.remove();
            salvarEventos(calendar);
          }
        } else {
          ev.setProp('title', acao);
          salvarEventos(calendar);
        }
      },
      eventDrop: () => { if (isProfessor) salvarEventos(calendar); },
      eventResize: () => { if (isProfessor) salvarEventos(calendar); },
      select: (sel) => {
        if (!isProfessor) return;
        const title = prompt('Título do evento (intervalo selecionado):');
        if (!title) return;
        const ev = { id: 'ev-' + Date.now(), title, start: sel.startStr, end: sel.endStr, allDay: true };
        calendar.addEvent(ev);
        salvarEventos(calendar);
      }
    });
    calendar.render();

    function salvarEventos(cal) {
      const arr = cal.getEvents().map(e => ({
        id: e.id,
        title: e.title,
        start: e.startStr || e.start?.toISOString(),
        end:   e.endStr   || (e.end ? e.end.toISOString() : null),
        allDay: e.allDay
      }));
      localStorage.setItem(KEY_EVENTOS, JSON.stringify(arr));
    }
  }

  // ===================== NOTAS (novo p/ professor) =====================
  const selTurmaNotas = document.getElementById('selTurmaNotas');
  const tbodyNotas = document.getElementById('tbodyNotas');

  if (selTurmaNotas) selTurmaNotas.addEventListener('change', renderTabelaNotas);

  function popularTurmasNotas() {
    if (!selTurmaNotas) return;
    const atual = selTurmaNotas.value || '__selecione__';
    const turmas = Array.from(new Set(alunos.map(a => (a.turma || '').trim()).filter(Boolean))).sort();
    selTurmaNotas.innerHTML = `<option value="__selecione__">Selecione...</option>` + turmas.map(t => `<option>${t}</option>`).join('');
    if (Array.from(selTurmaNotas.options).some(o => o.value === atual)) selTurmaNotas.value = atual;
  }

  function mediaAluno(notas) {
    const arr = (Array.isArray(notas) ? notas : []).filter(n => typeof n === 'number');
    if (!arr.length) return null;
    return arr.reduce((s,x)=>s+x,0)/arr.length;
  }

  function renderTabelaNotas() {
    if (!tbodyNotas) return;
    const turma = selTurmaNotas?.value || '__selecione__';
    tbodyNotas.innerHTML = '';

    if (turma === '__selecione__') return;

    alunos
      .map((a, i) => ({ ...a, i }))
      .filter(a => (a.turma || '') === turma)
      .forEach(a => {
        const notas = Array.isArray(a.notas) ? a.notas : [];
        const media = mediaAluno(notas);
        const tr = document.createElement('tr');

        // chips das notas com botão de remover
        const chips = notas.map((n, idxNota) =>
          `<span class="badge text-bg-secondary me-1 mb-1">
             ${Number(n).toFixed(1)}
             <button type="button" class="btn btn-sm btn-link text-white p-0 ms-1 btn-rem-nota" data-aidx="${a.i}" data-nidx="${idxNota}" title="Remover">×</button>
           </span>`
        ).join(' ');

        tr.innerHTML = `
          <td>${a.nome}</td>
          <td>${a.ra}</td>
          <td>${a.turma}</td>
          <td>${chips || '<span class="text-body-secondary">— sem notas —</span>'}</td>
          <td>
            <div class="input-group input-group-sm" style="max-width: 180px;">
              <input type="number" class="form-control form-control-sm inp-nova-nota" min="0" max="10" step="0.1" placeholder="Ex.: 7.5" data-aidx="${a.i}">
              <button class="btn btn-primary btn-add-nota" data-aidx="${a.i}">Adicionar</button>
            </div>
          </td>
          <td>${media == null ? '—' : media.toFixed(2)}</td>
        `;
        tbodyNotas.appendChild(tr);
      });
  }

  // Delegação de eventos para adicionar/remover notas
  if (tbodyNotas) {
    tbodyNotas.addEventListener('click', (e) => {
      const add = e.target.closest('.btn-add-nota');
      const rem = e.target.closest('.btn-rem-nota');

      if (add) {
        if (!isProfessor) return; // segurança extra
        const aidx = Number(add.dataset.aidx);
        const inp = tbodyNotas.querySelector(`.inp-nova-nota[data-aidx="${aidx}"]`);
        const val = parseFloat((inp?.value || '').replace(',', '.'));
        if (isNaN(val) || val < 0 || val > 10) {
          alert('Informe uma nota válida entre 0 e 10.');
          return;
        }
        const arr = Array.isArray(alunos[aidx].notas) ? alunos[aidx].notas : (alunos[aidx].notas = []);
        arr.push(Number(val));
        localStorage.setItem(KEY_ALUNOS, JSON.stringify(alunos));
        inp.value = '';
        renderTabelaNotas();
        // Atualiza gráfico se turma selecionada lá for a mesma
        popularTurmasGraficos();
        renderGraficoTurma();
      }

      if (rem) {
        if (!isProfessor) return;
        const aidx = Number(rem.dataset.aidx);
        const nidx = Number(rem.dataset.nidx);
        const arr = Array.isArray(alunos[aidx].notas) ? alunos[aidx].notas : [];
        arr.splice(nidx, 1);
        localStorage.setItem(KEY_ALUNOS, JSON.stringify(alunos));
        renderTabelaNotas();
        popularTurmasGraficos();
        renderGraficoTurma();
      }
    });
  }

  // ===================== Notificações (demo) =====================
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
          <div class="toast-body">Nova notificação às ${new Date().toLocaleTimeString()}</div>
          <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
        </div>`;
      listaNotificacoes.prepend(toast);
    });
  }

  // --- Inicialização ---
  popularFiltrosListagem();
  renderTabelas();
  popularTurmasGraficos();
  renderGraficoTurma();
  popularTurmasNotas();
  renderTabelaNotas();
})();
