// dashboard.js
(function () {
  'use strict';

  const API_BASE_URL = 'http://localhost:5191/api';

  let token = localStorage.getItem('authToken');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  const mustChangePassword = localStorage.getItem('mustChangePassword') === '1';

  async function apiFetch(path, options) {
    const url = API_BASE_URL + path;
    options = options || {};
    const headers = Object.assign(
      {},
      options.headers || {},
      { Authorization: 'Bearer ' + token }
    );

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const resp = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body
    });

    if (resp.status === 204) return null;

    let data = null;
    try { data = await resp.json(); } catch {}

    if (!resp.ok) {
      const msg = (data && (data.message || data.error)) || 'Erro ao comunicar com o servidor.';
      throw new Error(msg);
    }
    return data;
  }

  // ================== DADOS EM MEMÓRIA ==================
  let alunos = [];
  let professores = [];
  let notasProfessor = [];
  let turmas = [];
  let matriculasPendentes = [];

  // ================== INFO DO USUÁRIO ==================
  const usuario = localStorage.getItem('usuarioLogado') || '';
  const roleRaw = localStorage.getItem('tipoUsuario') || '';
  const roleLower = roleRaw.toLowerCase();

  const isAdmin = roleLower === 'administrador';
  const isProfessor = roleLower === 'professor';
  const isAluno = roleLower === 'aluno';

  const nomeUsuario = document.getElementById('nomeUsuario');
  if (nomeUsuario) nomeUsuario.textContent = usuario;

  // ================== TEMA ==================
  const body = document.body;
  const switchTema = document.getElementById('switchTema');
  const labelTema = document.getElementById('labelTema');
  let tema = localStorage.getItem('tema') || 'light';
  aplicarTema(tema);

  if (switchTema) {
    switchTema.addEventListener('change', function () {
      const novo = switchTema.checked ? 'dark' : 'light';
      aplicarTema(novo);
      localStorage.setItem('tema', novo);
    });
  }

  function aplicarTema(nome) {
    body.setAttribute('data-bs-theme', nome);
    if (labelTema) labelTema.textContent = (nome === 'dark') ? 'Modo escuro' : 'Modo claro';
    if (switchTema) switchTema.checked = (nome === 'dark');
  }

  // ================== LOGOUT ==================
  const btnSair = document.getElementById('btnSair');
  if (btnSair) {
    btnSair.addEventListener('click', function () {
      localStorage.removeItem('usuarioLogado');
      localStorage.removeItem('tipoUsuario');
      localStorage.removeItem('authToken');
      window.location.href = 'index.html';
    });
  }

  // ================== MODAL TROCA DE SENHA (PRIMEIRO ACESSO) ==================
  const modalTrocaSenhaEl = document.getElementById('modalTrocaSenha');
  let modalTrocaSenha;
  if (modalTrocaSenhaEl && window.bootstrap) {
    modalTrocaSenha = new bootstrap.Modal(modalTrocaSenhaEl);
  }

  if (mustChangePassword && modalTrocaSenha) {
    setTimeout(() => {
      modalTrocaSenha.show();
    }, 500);
  }

  const btnSalvarNovaSenha = document.getElementById('btnSalvarNovaSenha');
  const fbTrocaSenha = document.getElementById('fbTrocaSenha');

  if (btnSalvarNovaSenha) {
    btnSalvarNovaSenha.addEventListener('click', async () => {
      if (fbTrocaSenha) {
        fbTrocaSenha.textContent = '';
        fbTrocaSenha.className = 'small mt-1';
      }

      const nova = (document.getElementById('novaSenha')?.value || '').trim();
      const conf = (document.getElementById('confirmaNovaSenha')?.value || '').trim();

      if (!nova || nova.length < 6) {
        fbTrocaSenha.textContent = 'A nova senha deve ter pelo menos 6 caracteres.';
        fbTrocaSenha.classList.add('text-danger');
        return;
      }
      if (nova !== conf) {
        fbTrocaSenha.textContent = 'As senhas não coincidem.';
        fbTrocaSenha.classList.add('text-danger');
        return;
      }

      try {
        await apiFetch('/Auth/alterar-senha-primeiro-acesso', {
          method: 'POST',
          body: JSON.stringify({ novaSenha: nova })
        });

        fbTrocaSenha.textContent = 'Senha alterada com sucesso!';
        fbTrocaSenha.classList.add('text-success');

        localStorage.setItem('mustChangePassword', '0');

        setTimeout(() => {
          modalTrocaSenha.hide();
        }, 800);
      } catch (err) {
        console.error(err);
        fbTrocaSenha.textContent = err.message || 'Erro ao alterar senha.';
        fbTrocaSenha.classList.add('text-danger');
      }
    });
  }

  // ================== MODAIS GERAIS (LISTAGEM + CALENDÁRIO) ==================
  const modalDetalhesEl = document.getElementById('modalDetalhes');
  const modalEditarPessoaEl = document.getElementById('modalEditarPessoa');
  const modalConfirmacaoEl = document.getElementById('modalConfirmacao');
  const modalEventoEl = document.getElementById('modalEvento');

  let modalDetalhes;
  let modalEditarPessoa;
  let modalConfirmacao;
  let modalEvento;

  if (window.bootstrap) {
    if (modalDetalhesEl) modalDetalhes = new bootstrap.Modal(modalDetalhesEl);
    if (modalEditarPessoaEl) modalEditarPessoa = new bootstrap.Modal(modalEditarPessoaEl);
    if (modalConfirmacaoEl) modalConfirmacao = new bootstrap.Modal(modalConfirmacaoEl);
    if (modalEventoEl) modalEvento = new bootstrap.Modal(modalEventoEl);
  }

  const modalDetalhesTitulo = document.getElementById('modalDetalhesTitulo');
  const modalDetalhesConteudo = document.getElementById('modalDetalhesConteudo');

  const modalEditarPessoaTitulo = document.getElementById('modalEditarPessoaTitulo');
  const edicaoPessoaIdInput = document.getElementById('edicaoPessoaId');
  const edicaoNomeInput = document.getElementById('edicaoNome');
  const edicaoEmailInput = document.getElementById('edicaoEmail');
  const edicaoRAInput = document.getElementById('edicaoRA');
  const edicaoTurmaInput = document.getElementById('edicaoTurma');
  const edicaoDisciplinaInput = document.getElementById('edicaoDisciplina');
  const grupoEdicaoAluno = document.getElementById('grupoEdicaoAluno');
  const grupoEdicaoProfessor = document.getElementById('grupoEdicaoProfessor');
  const fbEdicaoPessoa = document.getElementById('fbEdicaoPessoa');
  const btnSalvarEdicaoPessoa = document.getElementById('btnSalvarEdicaoPessoa');

  const modalConfirmacaoTitulo = document.getElementById('modalConfirmacaoTitulo');
  const modalConfirmacaoMensagem = document.getElementById('modalConfirmacaoMensagem');
  const btnConfirmarExclusao = document.getElementById('btnConfirmarExclusao');

  const eventoIdInput = document.getElementById('eventoId');
  const eventoTituloInput = document.getElementById('eventoTitulo');
  const eventoDataInicioInput = document.getElementById('eventoDataInicio');
  const eventoDataFimInput = document.getElementById('eventoDataFim');
  const fbEvento = document.getElementById('fbEvento');
  const btnSalvarEvento = document.getElementById('btnSalvarEvento');
  const btnExcluirEvento = document.getElementById('btnExcluirEvento');

  let tipoEdicaoPessoa = null;
  let confirmacaoContexto = null;
  let eventoSelecionado = null;

  // Modal de cadastro de aluno a partir da matrícula pendente
  const modalCadastroAlunoMatriculaEl = document.getElementById('modalCadastroAlunoMatricula');
  let modalCadastroAlunoMatricula;
  if (window.bootstrap && modalCadastroAlunoMatriculaEl) {
    modalCadastroAlunoMatricula = new bootstrap.Modal(modalCadastroAlunoMatriculaEl);
  }

  const cadMatIdInput       = document.getElementById('cadMatId');
  const cadMatNomeInput     = document.getElementById('cadMatNome');
  const cadMatEmailInput    = document.getElementById('cadMatEmail');
  const cadMatDataNascInput = document.getElementById('cadMatDataNasc');
  const cadMatRAInput       = document.getElementById('cadMatRA');
  const cadMatTurmaInput    = document.getElementById('cadMatTurma');
  const fbCadastroMatricula = document.getElementById('fbCadastroMatricula');
  const btnSalvarCadastroMatricula = document.getElementById('btnSalvarCadastroMatricula');

  let matriculaSelecionada = null;

  // ================== PERMISSÕES DE SEÇÕES ==================
  function configurarVisibilidadeSecoes() {
    const esconder = [];
    if (isAdmin) {
      esconder.push('sec-calendario', 'sec-notificacoes', 'sec-notas');
    } else if (isProfessor) {
      esconder.push(
        'sec-cadastro',
        'sec-notificacoes'
      );
    } else {
      esconder.push('sec-cadastro', 'sec-notas');
    }

    esconder.forEach(id => {
      const link = document.querySelector(`#menu .nav-link[data-section="${id}"]`);
      if (link && link.parentElement) link.parentElement.style.display = 'none';
      const sec = document.getElementById(id);
      if (sec) sec.classList.add('d-none');
    });

    const ativo = document.querySelector('#menu .nav-link.active');
    if (ativo && esconder.includes(ativo.getAttribute('data-section'))) {
      ativo.classList.remove('active');
      const homeLink = document.querySelector('#menu .nav-link[data-section="sec-home"]');
      if (homeLink) {
        homeLink.classList.add('active');
        document.querySelectorAll('.sec').forEach(s => s.classList.add('d-none'));
        const sh = document.getElementById('sec-home');
        if (sh) sh.classList.remove('d-none');
      }
    }

    const wrapFiltroTurmaGraficos = document.getElementById('wrapFiltroTurmaGraficos');
    if (wrapFiltroTurmaGraficos) {
      wrapFiltroTurmaGraficos.classList.toggle('d-none', !isAdmin);
    }

    const blocoMatriculas = document.getElementById('blocoMatriculasPendentes');
    if (blocoMatriculas) {
      blocoMatriculas.classList.toggle('d-none', !isAdmin);
    }
  }

  configurarVisibilidadeSecoes();

  // ================== HOME ==================
  function montarHome() {
    const container = document.getElementById('homeCards');
    if (!container) return;
    container.innerHTML = '';

    const descricoes = {
      'sec-listagem': 'Veja a listagem de alunos e professores cadastrados.',
      'sec-cadastro': 'Cadastre novos alunos e professores no sistema.',
      'sec-graficos': isAluno
        ? 'Veja seus gráficos de desempenho (em breve).'
        : (isProfessor ? 'Veja médias por turma da sua disciplina.' : 'Visualize o desempenho das turmas.'),
      'sec-calendario': 'Consulte o calendário escolar e eventos.',
      'sec-notas': 'Lance e gerencie as notas dos alunos.',
      'sec-notificacoes': 'Veja notificações de eventos (opcional).'
    };

    document.querySelectorAll('#menu .nav-link').forEach(link => {
      const secId = link.getAttribute('data-section');
      if (secId === 'sec-home') return;
      if (link.parentElement && link.parentElement.style.display === 'none') return;

      const titulo = (link.textContent || '').trim();
      const col = document.createElement('div');
      col.className = 'col-12 col-md-6';
      col.innerHTML = `
        <div class="card h-100 shadow-sm">
          <div class="card-body d-flex flex-column">
            <h6 class="card-title mb-1">${titulo}</h6>
            <p class="card-text small text-body-secondary mb-3">
              ${descricoes[secId] || `Acesse a seção "${titulo}".`}
            </p>
            <button type="button" class="btn btn-sm btn-primary mt-auto" data-go-section="${secId}">Abrir</button>
          </div>
        </div>`;
      container.appendChild(col);
    });

    container.addEventListener('click', e => {
      const btn = e.target.closest('button[data-go-section]');
      if (!btn) return;
      const alvo = btn.getAttribute('data-go-section');
      const link = document.querySelector(`#menu .nav-link[data-section="${alvo}"]`);
      if (link) {
        link.click();
        const homeLink = document.querySelector('#menu .nav-link[data-section="sec-home"]');
        if (homeLink) homeLink.classList.remove('active');
      }
    });
  }

  montarHome();

  // ================== NAVEGAÇÃO ==================
  const linksMenu = document.querySelectorAll('#menu .nav-link');
  let calendar;
  let calendarRendered = false;

  linksMenu.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      linksMenu.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const alvo = link.getAttribute('data-section');
      document.querySelectorAll('.sec').forEach(s => s.classList.add('d-none'));
      const sec = document.getElementById(alvo);
      if (sec) sec.classList.remove('d-none');

      if (alvo === 'sec-calendario' && calendar) {
        setTimeout(() => {
          if (!calendarRendered) {
            calendar.render();
            calendarRendered = true;
          } else {
            calendar.updateSize();
          }
        }, 0);
      }

      if (alvo === 'sec-graficos') {
        atualizarGraficos();
      }
      if (alvo === 'sec-notas') {
        atualizarNotas();
      }
      if (alvo === 'sec-cadastro') {
        atualizarMatriculasPendentes();
      }
    });
  });

  (function () {
    const homeLink = document.querySelector('#menu .nav-link[data-section="sec-home"]');
    if (!homeLink) return;
    document.querySelectorAll('.sec').forEach(s => s.classList.add('d-none'));
    const home = document.getElementById('sec-home');
    if (home) home.classList.remove('d-none');
    linksMenu.forEach(l => l.classList.remove('active'));
    homeLink.classList.add('active');
  })();

  // ================== CADASTRO ALUNO/PROFESSOR ==================
  let tipoCadastroAtual = 'aluno';
  const btnTipoAluno = document.getElementById('btnTipoAluno');
  const btnTipoProfessor = document.getElementById('btnTipoProfessor');
  const tituloCadastro = document.getElementById('tituloCadastro');
  const grupoCadastroAluno = document.getElementById('grupoCadastroAluno');
  const grupoCadastroProfessor = document.getElementById('grupoCadastroProfessor');

  function atualizarTipoCadastro() {
    if (tituloCadastro) {
      tituloCadastro.textContent = tipoCadastroAtual === 'aluno'
        ? 'Cadastrar Aluno'
        : 'Cadastrar Professor';
    }
    if (btnTipoAluno && btnTipoProfessor) {
      if (tipoCadastroAtual === 'aluno') {
        btnTipoAluno.classList.add('btn-primary', 'active');
        btnTipoAluno.classList.remove('btn-outline-primary');
        btnTipoProfessor.classList.remove('btn-primary', 'active');
        btnTipoProfessor.classList.add('btn-outline-primary');
      } else {
        btnTipoProfessor.classList.add('btn-primary', 'active');
        btnTipoProfessor.classList.remove('btn-outline-primary');
        btnTipoAluno.classList.remove('btn-primary', 'active');
        btnTipoAluno.classList.add('btn-outline-primary');
      }
    }
    if (grupoCadastroAluno) grupoCadastroAluno.classList.toggle('d-none', tipoCadastroAtual !== 'aluno');
    if (grupoCadastroProfessor) grupoCadastroProfessor.classList.toggle('d-none', tipoCadastroAtual !== 'professor');
  }

  if (btnTipoAluno) {
    btnTipoAluno.addEventListener('click', () => {
      tipoCadastroAtual = 'aluno';
      atualizarTipoCadastro();
    });
  }
  if (btnTipoProfessor) {
    btnTipoProfessor.addEventListener('click', () => {
      tipoCadastroAtual = 'professor';
      atualizarTipoCadastro();
    });
  }
  atualizarTipoCadastro();

  const formCadastro = document.getElementById('formCadastro');
  const fbCadastro = document.getElementById('fbCadastro');

  function setFb(el, msg, erro) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'small mt-1 ' + (erro ? 'text-danger' : 'text-success');
  }

  if (formCadastro) {
    formCadastro.addEventListener('submit', async e => {
      e.preventDefault();
      const nome  = (document.getElementById('cadNome').value || '').trim();
      const email = (document.getElementById('cadEmail').value || '').trim();

      if (!nome || !email) {
        setFb(fbCadastro, 'Preencha nome e e-mail.', true);
        return;
      }

      try {
        if (tipoCadastroAtual === 'aluno') {
          const ra    = (document.getElementById('cadRA').value || '').trim();
          const turma = (document.getElementById('cadTurma').value || '').trim();
          if (!ra || !turma) {
            setFb(fbCadastro, 'Preencha RA e Turma para o aluno.', true);
            return;
          }

          const body = JSON.stringify({ nome, email, ra, turma });
          const novo = await apiFetch('/Alunos', {
            method: 'POST',
            body
          });
          alunos.push(novo);
          setFb(fbCadastro, 'Aluno cadastrado com sucesso!', false);
        } else {
          const disc = (document.getElementById('cadDisc').value || '').trim();
          if (!disc) {
            setFb(fbCadastro, 'Selecione a disciplina do professor.', true);
            return;
          }

          const body = JSON.stringify({ nome, email, disciplina: disc });
          const novo = await apiFetch('/Professores', {
            method: 'POST',
            body
          });
          professores.push(novo);
          setFb(fbCadastro, 'Professor cadastrado! Um e-mail será enviado com a disciplina atribuída.', false);
        }

        formCadastro.reset();
        tipoCadastroAtual = 'aluno';
        atualizarTipoCadastro();
        atualizarFiltros();
        atualizarListagens();
        atualizarTurmasNotas();
        atualizarGraficos();
      } catch (err) {
        console.error(err);
        setFb(fbCadastro, err.message || 'Erro ao salvar cadastro.', true);
      }
    });
  }

  // ================== LISTAGEM ==================
  const selTurma = document.getElementById('selTurma');
  const selDisciplina = document.getElementById('selDisciplina');
  const filtroTurmaWrap = document.getElementById('filtroTurmaWrap');
  const filtroDiscWrap = document.getElementById('filtroDiscWrap');
  const inpBuscaNome = document.getElementById('buscaNome');
  const tbodyAlunos = document.getElementById('tbodyAlunos');
  const tbodyProfessores = document.getElementById('tbodyProfessores');

  if (selTurma) selTurma.addEventListener('change', atualizarListagens);
  if (selDisciplina) selDisciplina.addEventListener('change', atualizarListagens);
  if (inpBuscaNome) inpBuscaNome.addEventListener('input', atualizarListagens);

  const tabsListagem = document.querySelectorAll('#tabsListagem .nav-link');
  tabsListagem.forEach(tab => {
    tab.addEventListener('click', () => {
      tabsListagem.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('show', 'active'));
      const alvo = document.getElementById(tab.getAttribute('data-target'));
      if (alvo) alvo.classList.add('show', 'active');

      const alunosAtivo = tab.getAttribute('data-target') === 'tab-alunos';
      if (filtroTurmaWrap) filtroTurmaWrap.classList.toggle('d-none', !alunosAtivo);
      if (filtroDiscWrap) filtroDiscWrap.classList.toggle('d-none', alunosAtivo);

      atualizarListagens();
    });
  });

  if (isAdmin) {
    document.querySelectorAll('.th-acoes').forEach(th => th.classList.remove('d-none'));
  }

  function atualizarFiltros() {
    const setTurmas = new Set(alunos.map(a => (a.turma || '').trim()).filter(Boolean));
    turmas = Array.from(setTurmas).sort();

    if (selTurma) {
      const atual = selTurma.value || '__todas__';
      let opts = '<option value="__todas__">Todas</option>';
      turmas.forEach(t => opts += `<option>${t}</option>`);
      selTurma.innerHTML = opts;
      selTurma.value = atual;
    }

    const setDisc = new Set(professores.map(p => (p.disciplina || p.disc || '').trim()).filter(Boolean));
    const disciplinas = Array.from(setDisc).sort();

    if (selDisciplina) {
      const atual = selDisciplina.value || '__todas__';
      let opts = '<option value="__todas__">Todas</option>';
      disciplinas.forEach(d => opts += `<option>${d}</option>`);
      selDisciplina.innerHTML = opts;
      selDisciplina.value = atual;
    }

    const selTurmaGraficos = document.getElementById('selTurmaGraficos');
    if (selTurmaGraficos) {
      const atual = selTurmaGraficos.value || '__todas__';
      let opts = '<option value="__todas__">Todas</option>';
      turmas.forEach(t => opts += `<option>${t}</option>`);
      selTurmaGraficos.innerHTML = opts;
      selTurmaGraficos.value = atual;
    }
  }

  function atualizarListagens() {
    const termo = (inpBuscaNome && inpBuscaNome.value || '').toLowerCase().trim();

    if (tbodyAlunos) {
      const filtroT = selTurma ? (selTurma.value || '__todas__') : '__todas__';
      tbodyAlunos.innerHTML = '';
      alunos.forEach(a => {
        if (termo && !(a.nome || '').toLowerCase().includes(termo)) return;
        if (filtroT !== '__todas__' && (a.turma || '') !== filtroT) return;

        const tr = document.createElement('tr');
        const detalhes = `<button class="btn btn-sm btn-outline-info" data-acao="detalhes-aluno" data-id="${a.id}">Detalhes</button>`;
        let acoes = '';
        if (isAdmin) {
          acoes = `
            <button class="btn btn-sm btn-outline-secondary me-1" data-acao="edit-aluno" data-id="${a.id}">Editar</button>
            <button class="btn btn-sm btn-outline-danger" data-acao="del-aluno" data-id="${a.id}">Excluir</button>`;
        }
        tr.innerHTML = `
          <td>${a.nome}</td>
          <td>${a.email}</td>
          <td>${a.turma || '—'}</td>
          <td>${detalhes}</td>
          ${isAdmin ? `<td>${acoes}</td>` : ''}`;
        tbodyAlunos.appendChild(tr);
      });
    }

    if (tbodyProfessores) {
      const filtroD = selDisciplina ? (selDisciplina.value || '__todas__') : '__todas__';
      tbodyProfessores.innerHTML = '';
      professores.forEach(p => {
        const disc = p.disciplina || p.disc || '';
        if (termo && !(p.nome || '').toLowerCase().includes(termo)) return;
        if (filtroD !== '__todas__' && disc !== filtroD) return;

        const tr = document.createElement('tr');
        const detalhes = `<button class="btn btn-sm btn-outline-info" data-acao="detalhes-prof" data-id="${p.id}">Detalhes</button>`;
        let acoes = '';
        if (isAdmin) {
          acoes = `
            <button class="btn btn-sm btn-outline-secondary me-1" data-acao="edit-prof" data-id="${p.id}">Editar</button>
            <button class="btn btn-sm btn-outline-danger" data-acao="del-prof" data-id="${p.id}">Excluir</button>`;
        }
        tr.innerHTML = `
          <td>${p.nome}</td>
          <td>${p.email}</td>
          <td>${disc || '—'}</td>
          <td>${detalhes}</td>
          ${isAdmin ? `<td>${acoes}</td>` : ''}`;
        tbodyProfessores.appendChild(tr);
      });
    }
  }

  // ========= Handlers da listagem (detalhes/editar/excluir) =========
  function abrirModalDetalhesPessoa(tipo, pessoa) {
    if (!modalDetalhes || !modalDetalhesTitulo || !modalDetalhesConteudo) return;

    if (tipo === 'aluno') {
      modalDetalhesTitulo.textContent = 'Detalhes do aluno';
      modalDetalhesConteudo.innerHTML = `
        <dl class="row mb-0">
          <dt class="col-sm-3">Nome</dt><dd class="col-sm-9">${pessoa.nome}</dd>
          <dt class="col-sm-3">E-mail</dt><dd class="col-sm-9">${pessoa.email}</dd>
          <dt class="col-sm-3">RA</dt><dd class="col-sm-9">${pessoa.ra || '—'}</dd>
          <dt class="col-sm-3">Turma</dt><dd class="col-sm-9">${pessoa.turma || '—'}</dd>
        </dl>`;
    } else {
      const disc = pessoa.disciplina || pessoa.disc || '—';
      modalDetalhesTitulo.textContent = 'Detalhes do professor';
      modalDetalhesConteudo.innerHTML = `
        <dl class="row mb-0">
          <dt class="col-sm-3">Nome</dt><dd class="col-sm-9">${pessoa.nome}</dd>
          <dt class="col-sm-3">E-mail</dt><dd class="col-sm-9">${pessoa.email}</dd>
          <dt class="col-sm-3">Disciplina</dt><dd class="col-sm-9">${disc}</dd>
        </dl>`;
    }

    modalDetalhes.show();
  }

  function abrirModalEditarPessoa(tipo, pessoa) {
    if (!modalEditarPessoa || !edicaoPessoaIdInput || !edicaoNomeInput || !edicaoEmailInput) return;
    tipoEdicaoPessoa = tipo;

    if (fbEdicaoPessoa) {
      fbEdicaoPessoa.textContent = '';
      fbEdicaoPessoa.className = 'small mt-2';
    }

    edicaoPessoaIdInput.value = pessoa.id;
    edicaoNomeInput.value = pessoa.nome || '';
    edicaoEmailInput.value = pessoa.email || '';

    if (tipo === 'aluno') {
      if (modalEditarPessoaTitulo) modalEditarPessoaTitulo.textContent = 'Editar aluno';
      if (grupoEdicaoAluno) grupoEdicaoAluno.classList.remove('d-none');
      if (grupoEdicaoProfessor) grupoEdicaoProfessor.classList.add('d-none');

      if (edicaoRAInput) edicaoRAInput.value = pessoa.ra || '';
      if (edicaoTurmaInput) edicaoTurmaInput.value = pessoa.turma || '';
    } else {
      const disc = pessoa.disciplina || pessoa.disc || '';
      if (modalEditarPessoaTitulo) modalEditarPessoaTitulo.textContent = 'Editar professor';
      if (grupoEdicaoAluno) grupoEdicaoAluno.classList.add('d-none');
      if (grupoEdicaoProfessor) grupoEdicaoProfessor.classList.remove('d-none');

      if (edicaoDisciplinaInput) edicaoDisciplinaInput.value = disc;
    }

    modalEditarPessoa.show();
  }

  if (btnSalvarEdicaoPessoa) {
    btnSalvarEdicaoPessoa.addEventListener('click', async () => {
      if (!tipoEdicaoPessoa || !edicaoPessoaIdInput) return;

      const id = parseInt(edicaoPessoaIdInput.value, 10);
      const nome = (edicaoNomeInput?.value || '').trim();
      const email = (edicaoEmailInput?.value || '').trim();

      if (fbEdicaoPessoa) {
        fbEdicaoPessoa.textContent = '';
        fbEdicaoPessoa.className = 'small mt-2';
      }

      if (!nome || !email) {
        if (fbEdicaoPessoa) {
          fbEdicaoPessoa.textContent = 'Preencha nome e e-mail.';
          fbEdicaoPessoa.classList.add('text-danger');
        }
        return;
      }

      try {
        if (tipoEdicaoPessoa === 'aluno') {
          const ra = (edicaoRAInput?.value || '').trim();
          const turma = (edicaoTurmaInput?.value || '').trim();
          if (!ra || !turma) {
            if (fbEdicaoPessoa) {
              fbEdicaoPessoa.textContent = 'Preencha RA e Turma.';
              fbEdicaoPessoa.classList.add('text-danger');
            }
            return;
          }

          const payload = { id, nome, email, turma, ra };
          await apiFetch(`/Alunos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });

          const idx = alunos.findIndex(a => a.id === id);
          if (idx >= 0) Object.assign(alunos[idx], payload);

          atualizarListagens();
          atualizarFiltros();
          atualizarTurmasNotas();
          atualizarGraficos();
        } else {
          const disciplina = (edicaoDisciplinaInput?.value || '').trim();
          if (!disciplina) {
            if (fbEdicaoPessoa) {
              fbEdicaoPessoa.textContent = 'Informe a disciplina.';
              fbEdicaoPessoa.classList.add('text-danger');
            }
            return;
          }

          const payload = { id, nome, email, disciplina };
          await apiFetch(`/Professores/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });

          const idx = professores.findIndex(p => p.id === id);
          if (idx >= 0) {
            professores[idx].nome = nome;
            professores[idx].email = email;
            professores[idx].disciplina = disciplina;
          }

          atualizarListagens();
          atualizarFiltros();
        }

        if (fbEdicaoPessoa) {
          fbEdicaoPessoa.textContent = 'Alterações salvas com sucesso.';
          fbEdicaoPessoa.classList.add('text-success');
        }

        setTimeout(() => {
          if (modalEditarPessoa) modalEditarPessoa.hide();
        }, 500);
      } catch (err) {
        console.error(err);
        if (fbEdicaoPessoa) {
          fbEdicaoPessoa.textContent = err.message || 'Erro ao salvar alterações.';
          fbEdicaoPessoa.classList.add('text-danger');
        }
      }
    });
  }

  if (btnConfirmarExclusao) {
    btnConfirmarExclusao.addEventListener('click', async () => {
      if (!confirmacaoContexto) return;

      const ctx = confirmacaoContexto;
      confirmacaoContexto = null;

      try {
        if (ctx.tipo === 'aluno') {
          await apiFetch(`/Alunos/${ctx.id}`, { method: 'DELETE' });
          alunos = alunos.filter(a => a.id !== ctx.id);
          atualizarListagens();
          atualizarFiltros();
          atualizarTurmasNotas();
          atualizarGraficos();
        } else if (ctx.tipo === 'professor') {
          await apiFetch(`/Professores/${ctx.id}`, { method: 'DELETE' });
          professores = professores.filter(p => p.id !== ctx.id);
          atualizarListagens();
          atualizarFiltros();
        }
      } catch (err) {
        console.error(err);
        alert(err.message || 'Erro ao realizar exclusão.');
      } finally {
        if (modalConfirmacao) modalConfirmacao.hide();
      }
    });
  }

  if (tbodyAlunos) {
    tbodyAlunos.addEventListener('click', async e => {
      const btn = e.target.closest('button[data-acao]');
      if (!btn) return;
      const acao = btn.dataset.acao;
      const id = parseInt(btn.dataset.id, 10);
      if (!id) return;

      const aluno = alunos.find(a => a.id === id);
      if (!aluno) return;

      if (acao === 'detalhes-aluno') {
        abrirModalDetalhesPessoa('aluno', aluno);
      }

      if (acao === 'edit-aluno') {
        if (!isAdmin) return;
        abrirModalEditarPessoa('aluno', aluno);
      }

      if (acao === 'del-aluno') {
        if (!isAdmin || !modalConfirmacaoTitulo || !modalConfirmacaoMensagem || !modalConfirmacao) return;
        confirmacaoContexto = { tipo: 'aluno', id: aluno.id };
        modalConfirmacaoTitulo.textContent = 'Excluir aluno';
        modalConfirmacaoMensagem.textContent = `Tem certeza que deseja excluir o aluno "${aluno.nome}"? Esta ação não poderá ser desfeita.`;
        modalConfirmacao.show();
      }
    });
  }

  if (tbodyProfessores) {
    tbodyProfessores.addEventListener('click', async e => {
      const btn = e.target.closest('button[data-acao]');
      if (!btn) return;
      const acao = btn.dataset.acao;
      const id = parseInt(btn.dataset.id, 10);
      if (!id) return;

      const prof = professores.find(p => p.id === id);
      if (!prof) return;

      if (acao === 'detalhes-prof') {
        abrirModalDetalhesPessoa('professor', prof);
      }

      if (acao === 'edit-prof') {
        if (!isAdmin) return;
        abrirModalEditarPessoa('professor', prof);
      }

      if (acao === 'del-prof') {
        if (!isAdmin || !modalConfirmacaoTitulo || !modalConfirmacaoMensagem || !modalConfirmacao) return;
        confirmacaoContexto = { tipo: 'professor', id: prof.id };
        modalConfirmacaoTitulo.textContent = 'Excluir professor';
        modalConfirmacaoMensagem.textContent = `Tem certeza que deseja excluir o professor "${prof.nome}"? Esta ação não poderá ser desfeita.`;
        modalConfirmacao.show();
      }
    });
  }

  // ================== NOTAS (PROFESSOR) ==================
  const selTurmaNotas = document.getElementById('selTurmaNotas');
  const tbodyNotas = document.getElementById('tbodyNotas');

  function atualizarTurmasNotas() {
    if (!selTurmaNotas) return;
    const atual = selTurmaNotas.value || '__selecione__';
    let opts = '<option value="__selecione__">Selecione...</option>';
    turmas.forEach(t => opts += `<option>${t}</option>`);
    selTurmaNotas.innerHTML = opts;
    selTurmaNotas.value = atual;
  }

  if (selTurmaNotas) {
    selTurmaNotas.addEventListener('change', atualizarNotas);
  }

  function media(array) {
    if (!array || !array.length) return null;
    const s = array.reduce((acc, v) => acc + v, 0);
    return s / array.length;
  }

  function atualizarNotas() {
    if (!tbodyNotas) return;
    const turma = selTurmaNotas ? (selTurmaNotas.value || '__selecione__') : '__selecione__';
    tbodyNotas.innerHTML = '';

    if (!isProfessor) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" class="text-center text-body-secondary">
        Somente professores podem lançar notas.
      </td>`;
      tbodyNotas.appendChild(tr);
      return;
    }

    if (turma === '__selecione__') {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" class="text-center text-body-secondary">
        Selecione uma turma para lançar notas.
      </td>`;
      tbodyNotas.appendChild(tr);
      return;
    }

    const alunosTurma = alunos.filter(a => a.turma === turma);
    if (!alunosTurma.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" class="text-center text-body-secondary">
        Nenhum aluno encontrado nesta turma.
      </td>`;
      tbodyNotas.appendChild(tr);
      return;
    }

    alunosTurma.forEach(a => {
      const notasAluno = notasProfessor.filter(n => n.alunoId === a.id);
      const chips = notasAluno.map(n => `
        <span class="badge text-bg-secondary me-1 mb-1">
          ${Number(n.valor).toFixed(1)}
          <button type="button"
                  class="btn btn-sm btn-link text-white p-0 ms-1"
                  data-acao="rem-nota"
                  data-id="${n.id}"
                  title="Remover">×</button>
        </span>`).join('') || '<span class="text-body-secondary">— sem notas —</span>';

      const mediaAluno = media(notasAluno.map(n => Number(n.valor)));

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.nome}</td>
        <td>${a.ra}</td>
        <td>${a.turma || '—'}</td>
        <td>${chips}</td>
        <td>
          <div class="input-group input-group-sm" style="max-width:180px;">
            <input type="number" class="form-control form-control-sm"
                   min="0" max="10" step="0.1"
                   placeholder="Ex.: 7.5"
                   data-acao="nova-nota-input"
                   data-aluno-id="${a.id}">
            <button class="btn btn-primary btn-add-nota"
                    data-acao="add-nota"
                    data-aluno-id="${a.id}">Adicionar</button>
          </div>
        </td>
        <td>${mediaAluno == null ? '—' : mediaAluno.toFixed(2)}</td>`;
      tbodyNotas.appendChild(tr);
    });
  }

  if (tbodyNotas) {
    tbodyNotas.addEventListener('click', async e => {
      const btn = e.target.closest('button');
      if (!btn || !btn.dataset.acao) return;
      const acao = btn.dataset.acao;

      if (acao === 'add-nota') {
        if (!isProfessor) return;

        const alunoId = parseInt(btn.dataset.alunoId, 10);
        const inp = tbodyNotas.querySelector(`input[data-acao="nova-nota-input"][data-aluno-id="${alunoId}"]`);
        const val = parseFloat((inp && inp.value || '').replace(',', '.'));
        if (isNaN(val) || val < 0 || val > 10) {
          alert('Informe uma nota válida entre 0 e 10.');
          return;
        }

        try {
          const body = JSON.stringify({ alunoId, valor: val });
          const nova = await apiFetch('/Notas', { method: 'POST', body });
          notasProfessor.push(nova);
          if (inp) inp.value = '';
          atualizarNotas();
          atualizarGraficos();
        } catch (err) {
          console.error(err);
          alert(err.message || 'Erro ao lançar nota.');
        }
      }

      if (acao === 'rem-nota') {
        if (!isProfessor) return;
        const id = parseInt(btn.dataset.id, 10);
        if (!confirm('Remover esta nota?')) return;

        try {
          await apiFetch(`/Notas/${id}`, { method: 'DELETE' });
          notasProfessor = notasProfessor.filter(n => n.id !== id);
          atualizarNotas();
          atualizarGraficos();
        } catch (err) {
          console.error(err);
          alert(err.message || 'Erro ao remover nota.');
        }
      }
    });
  }

  // ================== GRÁFICOS ==================
  let chartNotas;

  async function atualizarGraficos() {
  const canvas = document.getElementById('chartNotas');
  const msg = document.getElementById('grafMsg');
  const titulo = document.getElementById('tituloGraficos');
  const subtitulo = document.getElementById('subtituloGraficos');
  const selTurmaGraficos = document.getElementById('selTurmaGraficos');

  if (!canvas) return;
  if (chartNotas) {
    chartNotas.destroy();
    chartNotas = null;
  }
  if (msg) msg.textContent = '';
  if (subtitulo) subtitulo.textContent = '';

  let labels = [];
  let dados = [];
  let tipo = 'bar';           // sempre gráfico de colunas
  let labelDataset = '';

  try {
    // ===== GRÁFICO DO ALUNO =====
    if (isAluno) {
      if (titulo) titulo.textContent = 'Médias por disciplina (suas notas)';

      // Descobre o aluno logado
      const aluno = await apiFetch('/Alunos/me');
      if (!aluno || !aluno.id) {
        if (msg) msg.textContent = 'Não foi possível identificar o aluno logado para o gráfico.';
        return;
      }

      // Usa o endpoint de gráfico do aluno
      const resp = await apiFetch(`/Notas/grafico-aluno/${aluno.id}`);
      const dadosApi = resp || [];
      if (!dadosApi.length) {
        if (msg) msg.textContent = 'Ainda não há notas lançadas para você.';
        return;
      }

      labels = dadosApi.map(x => x.disciplina);
      dados  = dadosApi.map(x => Number(x.media).toFixed(2));
      tipo = 'bar';
      labelDataset = 'Média por disciplina';
      if (subtitulo) {
        subtitulo.textContent = 'Cada coluna representa a sua média em cada disciplina.';
      }
    }

    // ===== GRÁFICO DO PROFESSOR =====
    if (isProfessor) {
      if (titulo) titulo.textContent = 'Médias por turma (sua disciplina)';
      const resp = await apiFetch('/Notas/grafico-professor');
      const dadosApi = resp || [];
      if (!dadosApi.length) {
        if (msg) msg.textContent = 'Ainda não há notas lançadas na sua disciplina.';
        return;
      }

      labels = dadosApi.map(x => x.turma);
      dados  = dadosApi.map(x => Number(x.media).toFixed(2));
      tipo = 'bar'; // agora em colunas
      labelDataset = 'Média das turmas';
      if (subtitulo) {
        subtitulo.textContent = 'Cada coluna representa a média da turma na sua disciplina.';
      }
    }

    // ===== GRÁFICO DO ADMIN =====
    if (isAdmin) {
      if (!turmas.length) {
        if (msg) msg.textContent = 'Nenhuma turma cadastrada.';
        if (titulo) titulo.textContent = 'Gráficos de Desempenho';
        return;
      }

      let turmaSelecionada =
        (selTurmaGraficos && selTurmaGraficos.value && selTurmaGraficos.value !== '__todas__')
          ? selTurmaGraficos.value
          : turmas[0];

      if (titulo) titulo.textContent = `Desempenho da turma ${turmaSelecionada}`;
      const resp = await apiFetch(`/Notas/grafico-admin?turma=${encodeURIComponent(turmaSelecionada)}`);
      const dadosApi = resp || [];
      if (!dadosApi.length) {
        if (msg) msg.textContent = 'Ainda não há notas lançadas para essa turma.';
        return;
      }

      labels = dadosApi.map(x => x.disciplina);
      dados  = dadosApi.map(x => Number(x.media).toFixed(2));
      tipo = 'bar';
      labelDataset = 'Média por disciplina';
      if (subtitulo) {
        subtitulo.textContent = 'Cada coluna representa a média da turma em cada disciplina.';
      }
    }

    if (!labels.length) {
      if (msg) msg.textContent = 'Sem dados para exibir.';
      return;
    }

    // Aqui estava o erro antigo: agora usamos "tipo"
    chartNotas = new Chart(canvas, {
      type: tipo,
      data: {
        labels,
        datasets: [{
          label: labelDataset,
          data: dados
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: 10
          }
        }
      }
    });

    if (msg && !msg.textContent) {
      msg.textContent = 'Passe o mouse sobre as colunas para ver os valores.';
    }
  } catch (err) {
    console.error(err);
    if (msg) msg.textContent = err.message || 'Erro ao carregar dados do gráfico.';
  }
}


  const selTurmaGraficos = document.getElementById('selTurmaGraficos');
  if (selTurmaGraficos) {
    selTurmaGraficos.addEventListener('change', atualizarGraficos);
  }

  // ================== CALENDÁRIO ==================
  const calEl = document.getElementById('calendario');

  function limparFormularioEvento() {
    if (eventoIdInput) eventoIdInput.value = '';
    if (eventoTituloInput) eventoTituloInput.value = '';
    if (eventoDataInicioInput) eventoDataInicioInput.value = '';
    if (eventoDataFimInput) eventoDataFimInput.value = '';
    if (fbEvento) {
      fbEvento.textContent = '';
      fbEvento.className = 'small mt-1';
    }
  }

  function abrirModalEventoCriar(dataDefault) {
    if (!modalEvento) return;
    limparFormularioEvento();

    const tituloModal = modalEventoEl?.querySelector('.modal-title');
    if (tituloModal) tituloModal.textContent = 'Adicionar evento';

    if (eventoDataInicioInput && dataDefault) {
      eventoDataInicioInput.value = dataDefault;
    }

    if (btnExcluirEvento) btnExcluirEvento.classList.add('d-none');
    eventoSelecionado = null;
    modalEvento.show();
  }

  function abrirModalEventoEditar(ev) {
    if (!modalEvento || !ev) return;
    limparFormularioEvento();

    const tituloModal = modalEventoEl?.querySelector('.modal-title');
    if (tituloModal) tituloModal.textContent = 'Editar evento';

    if (eventoIdInput) eventoIdInput.value = ev.id || '';
    if (eventoTituloInput) eventoTituloInput.value = ev.title || '';

    const startStr = ev.startStr ? ev.startStr.substring(0, 10) : '';
    const endStr = ev.endStr ? ev.endStr.substring(0, 10) : '';

    if (eventoDataInicioInput) eventoDataInicioInput.value = startStr;
    if (eventoDataFimInput) eventoDataFimInput.value = endStr;

    if (btnExcluirEvento) btnExcluirEvento.classList.remove('d-none');

    eventoSelecionado = ev;
    modalEvento.show();
  }

  if (calEl && window.FullCalendar) {
    calendar = new FullCalendar.Calendar(calEl, {
      initialView: 'dayGridMonth',
      height: 'auto',
      headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
      selectable: false,
      editable: isProfessor || isAdmin,
      events: [],
      eventClick: function (info) {
        if (!isProfessor && !isAdmin) return;
        abrirModalEventoEditar(info.event);
      }
    });

    let btnAddEvento = document.getElementById('btnAddEvento');
    if (!isProfessor && !isAdmin && btnAddEvento) {
      btnAddEvento.classList.add('d-none');
    }

    if (btnAddEvento && (isProfessor || isAdmin)) {
      btnAddEvento.addEventListener('click', () => {
        abrirModalEventoCriar();
      });
    }

    if (btnSalvarEvento) {
      btnSalvarEvento.addEventListener('click', async () => {
        if (!isProfessor && !isAdmin) return;

        if (fbEvento) {
          fbEvento.textContent = '';
          fbEvento.className = 'small mt-1';
        }

        const idStr = (eventoIdInput?.value || '').trim();
        const titulo = (eventoTituloInput?.value || '').trim();
        const dataInicio = (eventoDataInicioInput?.value || '').trim();
        const dataFim = (eventoDataFimInput?.value || '').trim();

        if (!titulo || !dataInicio) {
          if (fbEvento) {
            fbEvento.textContent = 'Preencha pelo menos título e data de início.';
            fbEvento.classList.add('text-danger');
          }
          return;
        }

        const payload = {
          id: idStr ? parseInt(idStr, 10) : 0,
          titulo,
          dataInicio,
          dataFim: dataFim || null
        };

        try {
          if (!idStr) {
            const criado = await apiFetch('/Eventos', {
              method: 'POST',
              body: JSON.stringify(payload)
            });
            calendar.addEvent({
              id: String(criado.id),
              title: criado.titulo,
              start: criado.dataInicio,
              end: criado.dataFim
            });
          } else {
            const idNum = parseInt(idStr, 10);
            await apiFetch(`/Eventos/${idNum}`, {
              method: 'PUT',
              body: JSON.stringify(payload)
            });

            const ev = calendar.getEventById(String(idNum));
            if (ev) {
              ev.setProp('title', titulo);
              ev.setStart(dataInicio);
              ev.setEnd(dataFim || null);
            }
          }

          if (fbEvento) {
            fbEvento.textContent = 'Evento salvo com sucesso.';
            fbEvento.classList.add('text-success');
          }

          setTimeout(() => {
            if (modalEvento) modalEvento.hide();
          }, 500);
        } catch (err) {
          console.error(err);
          if (fbEvento) {
            fbEvento.textContent = err.message || 'Erro ao salvar evento.';
            fbEvento.classList.add('text-danger');
          }
        }
      });
    }

    if (btnExcluirEvento) {
      btnExcluirEvento.addEventListener('click', async () => {
        if (!isProfessor && !isAdmin) return;
        const idStr = (eventoIdInput?.value || '').trim();
        if (!idStr) return;

        if (!confirm('Tem certeza que deseja excluir este evento?')) return;

        const idNum = parseInt(idStr, 10);

        try {
          await apiFetch(`/Eventos/${idNum}`, { method: 'DELETE' });
          const ev = calendar.getEventById(String(idNum));
          if (ev) ev.remove();

          if (fbEvento) {
            fbEvento.textContent = 'Evento excluído com sucesso.';
            fbEvento.classList.add('text-success');
          }

          setTimeout(() => {
            if (modalEvento) modalEvento.hide();
          }, 500);
        } catch (err) {
          console.error(err);
          if (fbEvento) {
            fbEvento.textContent = err.message || 'Erro ao excluir evento.';
            fbEvento.classList.add('text-danger');
          }
        }
      });
    }

    (async function carregarEventos() {
      try {
        const lista = await apiFetch('/Eventos');
        (lista || []).forEach(ev => {
          calendar.addEvent({
            id: String(ev.id),
            title: ev.titulo,
            start: ev.dataInicio,
            end: ev.dataFim
          });
        });
      } catch (err) {
        console.error('Erro ao carregar eventos', err);
      }
    })();
  }

  // ================== MATRÍCULAS PENDENTES ==================
  function formatarDataString(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR');
  }

  function atualizarMatriculasPendentes() {
    const tbody = document.getElementById('tbodyMatriculasPendentesCadastro');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!isAdmin) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" class="text-center text-body-secondary">
        Apenas administradores podem ver as matrículas pendentes.
      </td>`;
      tbody.appendChild(tr);
      return;
    }

    if (!matriculasPendentes.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" class="text-center text-body-secondary">
        Nenhuma matrícula pendente.
      </td>`;
      tbody.appendChild(tr);
      return;
    }

    matriculasPendentes.forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${m.nome}</td>
        <td>${m.email}</td>
        <td>${formatarDataString(m.dataNascimento)}</td>
        <td>${formatarDataString(m.criadoEm)}</td>
        <td>${m.status ?? 'Pendente'}</td>
        <td>
          <button
            class="btn btn-sm btn-success"
            data-acao="cad-matricula"
            data-id="${m.id}">
            Cadastrar
          </button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  // Clique no botão "Cadastrar" da lista de matrículas pendentes
  const tbodyMatriculasPendentesCadastro = document.getElementById('tbodyMatriculasPendentesCadastro');
  if (tbodyMatriculasPendentesCadastro) {
    tbodyMatriculasPendentesCadastro.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-acao="cad-matricula"]');
      if (!btn) return;
      if (!isAdmin || !modalCadastroAlunoMatricula) return;

      const id = parseInt(btn.dataset.id, 10);
      if (!id) return;

      const mat = matriculasPendentes.find(m => m.id === id);
      if (!mat) return;

      matriculaSelecionada = mat;

      // Preenche campos que vêm da solicitação e bloqueia edição
      if (cadMatIdInput)       cadMatIdInput.value       = mat.id;
      if (cadMatNomeInput)     cadMatNomeInput.value     = mat.nome || '';
      if (cadMatEmailInput)    cadMatEmailInput.value    = mat.email || '';

      if (cadMatDataNascInput) {
        // converte para yyyy-MM-dd para o input date
        if (mat.dataNascimento) {
          const d = new Date(mat.dataNascimento);
          if (!isNaN(d.getTime())) {
            cadMatDataNascInput.value = d.toISOString().substring(0, 10);
          } else {
            cadMatDataNascInput.value = '';
          }
        } else {
          cadMatDataNascInput.value = '';
        }
      }

      if (cadMatRAInput)    cadMatRAInput.value = '';
      if (cadMatTurmaInput) cadMatTurmaInput.value = '';

      if (fbCadastroMatricula) {
        fbCadastroMatricula.textContent = '';
        fbCadastroMatricula.className = 'small mt-1';
      }

      modalCadastroAlunoMatricula.show();
    });
  }

  if (btnSalvarCadastroMatricula) {
    btnSalvarCadastroMatricula.addEventListener('click', async () => {
      if (!isAdmin || !matriculaSelecionada) return;

      if (fbCadastroMatricula) {
        fbCadastroMatricula.textContent = '';
        fbCadastroMatricula.className = 'small mt-1';
      }

      const ra    = (cadMatRAInput?.value || '').trim();
      const turma = (cadMatTurmaInput?.value || '').trim();

      if (!ra || !turma) {
        if (fbCadastroMatricula) {
          fbCadastroMatricula.textContent = 'Preencha RA e Turma para concluir o cadastro.';
          fbCadastroMatricula.classList.add('text-danger');
        }
        return;
      }

      try {
        // 1) Cria o aluno
        const bodyAluno = JSON.stringify({
          nome: matriculaSelecionada.nome,
          email: matriculaSelecionada.email,
          ra,
          turma,
          dataNascimento: matriculaSelecionada.dataNascimento
        });

        await apiFetch('/Alunos', {
          method: 'POST',
          body: bodyAluno
        });

        // 2) Marca a matrícula como Aprovada
        const bodyResposta = JSON.stringify({
          id: matriculaSelecionada.id,
          aprovar: true,
          observacao: null
        });

        await apiFetch('/Matriculas/responder', {
          method: 'POST',
          body: bodyResposta
        });

        // Remove da lista em memória e atualiza tabela
        matriculasPendentes = matriculasPendentes.filter(m => m.id !== matriculaSelecionada.id);
        matriculaSelecionada = null;

        atualizarMatriculasPendentes();
        atualizarFiltros();
        atualizarListagens();

        if (fbCadastroMatricula) {
          fbCadastroMatricula.textContent = 'Aluno cadastrado com sucesso e matrícula aprovada.';
          fbCadastroMatricula.classList.add('text-success');
        }

        setTimeout(() => {
          if (modalCadastroAlunoMatricula) modalCadastroAlunoMatricula.hide();
        }, 700);
      } catch (err) {
        console.error(err);
        if (fbCadastroMatricula) {
          fbCadastroMatricula.textContent = err.message || 'Erro ao cadastrar aluno a partir da matrícula.';
          fbCadastroMatricula.classList.add('text-danger');
        }
      }
    });
  }



  // ================== CARREGAMENTO INICIAL ==================
  async function carregarDadosIniciais() {
    try {
      const [alunosApi, profsApi, notasProfApi, turmasApi, matsApi] = await Promise.all([
        apiFetch('/Alunos'),
        apiFetch('/Professores'),
        isProfessor ? apiFetch('/Notas/professor') : Promise.resolve([]),
        apiFetch('/Alunos/turmas'),
        isAdmin ? apiFetch('/Matriculas/pendentes') : Promise.resolve([])
      ]);

      alunos = alunosApi || [];
      professores = profsApi || [];
      notasProfessor = notasProfApi || [];
      turmas = turmasApi || [];
      matriculasPendentes = matsApi || [];

      atualizarFiltros();
      atualizarListagens();
      atualizarTurmasNotas();
      if (isProfessor) atualizarNotas();
      if (isAdmin || isProfessor) atualizarGraficos();
      if (isAdmin) atualizarMatriculasPendentes();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao carregar dados iniciais.');
    }
  }

  carregarDadosIniciais();
})();
