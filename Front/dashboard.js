(function () {
  'use strict';

  const API_BASE_URL = 'http://localhost:5191/api';

  // Autenticação
  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  const usuario = localStorage.getItem('usuarioLogado') || '';
  const roleRaw = localStorage.getItem('tipoUsuario') || '';
  const roleLower = roleRaw.toLowerCase();
  const mustChangePassword = localStorage.getItem('mustChangePassword') === '1';

  const isAdmin = roleLower === 'administrador';
  const isProfessor = roleLower === 'professor';
  const isAluno = roleLower === 'aluno';

  // Estado em memória
  const state = {
    alunos: [],
    professores: [],
    turmas: [],
    notasProfessor: [],
    matriculasPendentes: [],
    chartNotas: null,
    calendar: null,
    pessoaEdicao: null,       
    alvoExclusao: null,       
    matriculaCadastroAtual: null 
  };

  // Helpers
  async function api(path, options) {
    options = options || {};
    const headers = Object.assign(
      {},
      options.headers || {},
      { Authorization: 'Bearer ' + token }
    );

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const resp = await fetch(API_BASE_URL + path, {
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

  function setMsg(el, msg, tipo) {
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'small mt-1';
    if (!msg) return;
    if (tipo === 'erro') el.classList.add('text-danger');
    if (tipo === 'ok') el.classList.add('text-success');
  }

  // Média simples
  function media(valores) {
    if (!valores || !valores.length) return null;
    const soma = valores.reduce((a, v) => a + v, 0);
    return soma / valores.length;
  }

  // Elementos Básicos
  const nomeUsuarioSpan = document.getElementById('nomeUsuario');
  const btnSair = document.getElementById('btnSair');

  if (nomeUsuarioSpan) nomeUsuarioSpan.textContent = usuario;

  if (btnSair) {
    btnSair.addEventListener('click', () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('usuarioLogado');
      localStorage.removeItem('tipoUsuario');
      localStorage.removeItem('mustChangePassword');
      window.location.href = 'index.html';
    });
  }

  // Tema Claro/Escuro
  const switchTema = document.getElementById('switchTema');
  const labelTema = document.getElementById('labelTema');
  let tema = localStorage.getItem('tema') || 'light';

  function aplicarTema(nome) {
    tema = nome;
    document.body.setAttribute('data-bs-theme', nome);
    if (switchTema) switchTema.checked = nome === 'dark';
    if (labelTema) labelTema.textContent = nome === 'dark' ? 'Modo escuro' : 'Modo claro';
    localStorage.setItem('tema', nome);
  }

  aplicarTema(tema);

  if (switchTema) {
    switchTema.addEventListener('change', () => {
      aplicarTema(switchTema.checked ? 'dark' : 'light');
    });
  }

  // Modal troca de senha no 1º acesso
  const modalTrocaSenhaEl = document.getElementById('modalTrocaSenha');
  const btnSalvarNovaSenha = document.getElementById('btnSalvarNovaSenha');
  const fbTrocaSenha = document.getElementById('fbTrocaSenha');

  let modalTrocaSenha = null;
  if (modalTrocaSenhaEl && window.bootstrap) {
    modalTrocaSenha = new bootstrap.Modal(modalTrocaSenhaEl, { backdrop: 'static', keyboard: false });
  }

  async function salvarNovaSenha() {
    const nova = (document.getElementById('novaSenha')?.value || '').trim();
    const conf = (document.getElementById('confirmaNovaSenha')?.value || '').trim();
    setMsg(fbTrocaSenha, '');

    if (!nova || nova.length < 6) {
      setMsg(fbTrocaSenha, 'A nova senha deve ter pelo menos 6 caracteres.', 'erro');
      return;
    }
    if (nova !== conf) {
      setMsg(fbTrocaSenha, 'As senhas digitadas não conferem.', 'erro');
      return;
    }

    try {
      await api('/Auth/alterar-senha-primeiro-acesso', {
        method: 'POST',
        body: JSON.stringify({ novaSenha: nova })
      });

      localStorage.setItem('mustChangePassword', '0');
      setMsg(fbTrocaSenha, 'Senha alterada com sucesso!', 'ok');
      setTimeout(() => {
        if (modalTrocaSenha) modalTrocaSenha.hide();
      }, 800);
    } catch (err) {
      console.error(err);
      setMsg(fbTrocaSenha, err.message || 'Erro ao alterar senha.', 'erro');
    }
  }

  if (btnSalvarNovaSenha) {
    btnSalvarNovaSenha.addEventListener('click', salvarNovaSenha);
  }

  if (mustChangePassword && modalTrocaSenha) {
    modalTrocaSenha.show();
  }

  // Modais gerais
  const modalDetalhesEl = document.getElementById('modalDetalhes');
  const modalEditarPessoaEl = document.getElementById('modalEditarPessoa');
  const modalConfirmacaoEl = document.getElementById('modalConfirmacao');
  const modalEventoEl = document.getElementById('modalEvento');
  const modalCadAlunoMatEl = document.getElementById('modalCadastroAlunoMatricula');

  const modalDetalhes = modalDetalhesEl && window.bootstrap ? new bootstrap.Modal(modalDetalhesEl) : null;
  const modalEditarPessoa = modalEditarPessoaEl && window.bootstrap ? new bootstrap.Modal(modalEditarPessoaEl) : null;
  const modalConfirmacao = modalConfirmacaoEl && window.bootstrap ? new bootstrap.Modal(modalConfirmacaoEl) : null;
  const modalEvento = modalEventoEl && window.bootstrap ? new bootstrap.Modal(modalEventoEl) : null;
  const modalCadAlunoMat = modalCadAlunoMatEl && window.bootstrap ? new bootstrap.Modal(modalCadAlunoMatEl) : null;

  // Permissões dos usuários
  function configurarPermissoes() {
    const secoesPermitidas = new Set(['sec-home', 'sec-listagem', 'sec-graficos']); 
    if (isProfessor) {
      secoesPermitidas.add('sec-calendario');
      secoesPermitidas.add('sec-notas');
    }
    if (isAdmin) {
      secoesPermitidas.add('sec-cadastro');
    }
    if (isAluno){
      secoesPermitidas.add('sec-calendario');
      secoesPermitidas.add('sec-notificacoes');
    }

    // Menu
    document.querySelectorAll('#menu .nav-link').forEach(link => {
      const sec = link.getAttribute('data-section');
      const li = link.parentElement;
      const podeVer = sec && secoesPermitidas.has(sec);
      if (li) li.style.display = podeVer ? '' : 'none';
    });

    // Seções
    document.querySelectorAll('main .sec').forEach(sec => {
      const id = sec.id;
      const podeVer = secoesPermitidas.has(id);
      if (!podeVer) sec.classList.add('d-none');
    });

    // Colunas de ações (somente admin)
    document.querySelectorAll('.th-acoes').forEach(th => {
      th.classList.toggle('d-none', !isAdmin);
    });

    // Bloco de matrículas pendentes (apenas admin)
    const blocoMat = document.getElementById('blocoMatriculasPendentes');
    if (blocoMat) blocoMat.classList.toggle('d-none', !isAdmin);

    // Botão adicionar evento (apenas professor/admin)
    const btnAddEvento = document.getElementById('btnAddEvento');
    if (btnAddEvento) btnAddEvento.classList.toggle('d-none', !(isProfessor || isAdmin));

    // Filtro turma em gráficos (apenas admin)
    const wrapFiltroTurmaGraficos = document.getElementById('wrapFiltroTurmaGraficos');
    if (wrapFiltroTurmaGraficos) {
      wrapFiltroTurmaGraficos.classList.toggle('d-none', !isAdmin);
    }
  }

  // ================== HOME ==================
  const homeCards = document.getElementById('homeCards');

  function criarCardHome(idSecao, titulo, descricao, icone) {
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-lg-4';

    col.innerHTML = `
      <div class="card h-100 shadow-sm card-home" data-section="${idSecao}" role="button">
        <div class="card-body d-flex flex-column">
          <div class="d-flex align-items-center mb-2">
            <div class="fs-4 me-2">${icone || '📄'}</div>
            <h6 class="mb-0">${titulo}</h6>
          </div>
          <p class="small text-body-secondary mb-0 flex-grow-1">${descricao}</p>
        </div>
      </div>`;
    return col;
  }

  function montarHome() {
    if (!homeCards) return;
    homeCards.innerHTML = '';

    const items = [];

    items.push({
      idSecao: 'sec-listagem',
      titulo: 'Alunos e Professores',
      desc: 'Consulte os cadastros da escola.',
      icon: '👥'
    });

    if (isAdmin) {
      items.push({
        idSecao: 'sec-cadastro',
        titulo: 'Cadastro',
        desc: 'Cadastre novos alunos ou professores e aprove solicitações de matrícula.',
        icon: '📝'
      });
    }

    items.push({
      idSecao: 'sec-graficos',
      titulo: 'Gráficos de desempenho',
      desc: 'Visualize as médias por disciplina ou turma.',
      icon: '📊'
    });

    if (!isAdmin){
      items.push({
        idSecao: 'sec-calendario',
        titulo: 'Calendário escolar',
        desc: 'Veja provas, eventos e lembretes.',
        icon: '📅'
      });
    } 

    if (isProfessor) {
      items.push({
        idSecao: 'sec-notas',
        titulo: 'Notas',
        desc: 'Lance e gerencie notas de seus alunos.',
        icon: '✏️'
      });
    }

    if (isAluno){
      items.push({
        idSecao: 'sec-notificacoes',
        titulo: 'Notificações',
        desc: 'Visualize os eventos criados pelos professores.',
        icon: '🔔'
      });
    }

    items.forEach(it => {
      homeCards.appendChild(
        criarCardHome(it.idSecao, it.titulo, it.desc, it.icon)
      );
    });

    homeCards.addEventListener('click', e => {
      const card = e.target.closest('.card-home');
      if (!card) return;
      const sec = card.getAttribute('data-section');
      if (sec) mostrarSecao(sec);
    });
  }

  // Navegação
  const menuLinks = document.querySelectorAll('#menu .nav-link');

  function mostrarSecao(idSecao) {
    document.querySelectorAll('.sec').forEach(sec => {
      sec.classList.toggle('d-none', sec.id !== idSecao);
    });

    menuLinks.forEach(link => {
      const sec = link.getAttribute('data-section');
      link.classList.toggle('active', sec === idSecao);
    });

    if (idSecao === 'sec-graficos') {
      atualizarGraficos();
    }
    if (idSecao === 'sec-calendario') {
      initCalendario();
    }
    if (idSecao === 'sec-notas') {
      atualizarNotas();
    }
    if (idSecao === 'sec-cadastro' && isAdmin) {
      atualizarMatriculasPendentes();
    }
  }

  if (menuLinks.length) {
    menuLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const sec = link.getAttribute('data-section');
        if (sec) mostrarSecao(sec);
      });
    });
  }

  mostrarSecao('sec-home');

  // Cadastro de Professor (apenas)
  const btnTipoAluno = document.getElementById('btnTipoAluno');
  const btnTipoProfessor = document.getElementById('btnTipoProfessor');
  const tituloCadastro = document.getElementById('tituloCadastro');

  const formCadastro = document.getElementById('formCadastro');
  const cadNome = document.getElementById('cadNome');
  const cadEmail = document.getElementById('cadEmail');
  const cadDisc = document.getElementById('cadDisc');
  const fbCadastro = document.getElementById('fbCadastro');
  const grupoCadastroProfessor = document.getElementById('grupoCadastroProfessor');
  const blocoMatriculasPendentes = document.getElementById('blocoMatriculasPendentes');

  let tipoCadastroAtual = 'aluno';

  function atualizarTipoCadastro(tipo) {
    tipoCadastroAtual = tipo;

    if (tipo === 'aluno') {
      // Estilo dos botões
      if (btnTipoAluno) {
        btnTipoAluno.classList.remove('btn-outline-primary');
        btnTipoAluno.classList.add('btn-primary', 'active');
      }
      if (btnTipoProfessor) {
        btnTipoProfessor.classList.remove('btn-primary', 'active');
        btnTipoProfessor.classList.add('btn-outline-primary');
      }

      // Mostra só matrículas pendentes
      if (formCadastro) formCadastro.classList.add('d-none');
      if (grupoCadastroProfessor) grupoCadastroProfessor.classList.add('d-none');
      if (blocoMatriculasPendentes) blocoMatriculasPendentes.classList.remove('d-none');

      if (tituloCadastro) tituloCadastro.textContent = 'Matrículas pendentes';
    } else {
      // Estilo dos botões
      if (btnTipoProfessor) {
        btnTipoProfessor.classList.remove('btn-outline-primary');
        btnTipoProfessor.classList.add('btn-primary', 'active');
      }
      if (btnTipoAluno) {
        btnTipoAluno.classList.remove('btn-primary', 'active');
        btnTipoAluno.classList.add('btn-outline-primary');
      }

      // Mostra só o formulário de professor
      if (formCadastro) formCadastro.classList.remove('d-none');
      if (grupoCadastroProfessor) grupoCadastroProfessor.classList.remove('d-none');
      if (blocoMatriculasPendentes) blocoMatriculasPendentes.classList.add('d-none');

      if (tituloCadastro) tituloCadastro.textContent = 'Cadastrar Professor';
    }


    setMsg(fbCadastro, '');
  }

  // Clique nos botões de toggle
  if (btnTipoAluno) {
    btnTipoAluno.addEventListener('click', () => atualizarTipoCadastro('aluno'));
  }
  if (btnTipoProfessor) {
    btnTipoProfessor.addEventListener('click', () => atualizarTipoCadastro('professor'));
  }

  async function salvarCadastro(e) {
    e.preventDefault();
    setMsg(fbCadastro, '');

    // Se não estiver na aba Professor, não faz nada
    if (tipoCadastroAtual !== 'professor') return;

    const nome = (cadNome?.value || '').trim();
    const email = (cadEmail?.value || '').trim();
    const disciplina = (cadDisc?.value || '').trim();

    if (!nome || !email) {
      setMsg(fbCadastro, 'Informe nome e e-mail.', 'erro');
      return;
    }

    if (!disciplina) {
      setMsg(fbCadastro, 'Selecione a disciplina do professor.', 'erro');
      return;
    }

    try {
      const novo = await api('/Professores', {
        method: 'POST',
        body: JSON.stringify({ nome, email, disciplina })
      });

      state.professores.push(novo);

      if (formCadastro) formCadastro.reset();
      atualizarListagem();
      atualizarFiltroDisciplinas();
      setMsg(fbCadastro, 'Professor cadastrado com sucesso.', 'ok');
    } catch (err) {
      console.error(err);
      setMsg(fbCadastro, err.message || 'Erro ao salvar cadastro.', 'erro');
    }
  }

  if (formCadastro) {
    formCadastro.addEventListener('submit', salvarCadastro);
  }


  // ==============LISTAGEM=============
  const buscaNome = document.getElementById('buscaNome');
  const selTurma = document.getElementById('selTurma');
  const selDisciplina = document.getElementById('selDisciplina');
  const filtroTurmaWrap = document.getElementById('filtroTurmaWrap');
  const filtroDiscWrap = document.getElementById('filtroDiscWrap');

  const tabAlunosBtn = document.getElementById('tabAlunos');
  const tabProfBtn = document.getElementById('tabProfessores');

  const tbodyAlunos = document.getElementById('tbodyAlunos');
  const tbodyProfessores = document.getElementById('tbodyProfessores');

  let abaListagemAtual = 'alunos';

  function atualizarTurmasFiltros() {
    if (selTurma) {
      const atual = selTurma.value || '__todas__';
      let opts = '<option value="__todas__">Todas</option>';
      state.turmas.forEach(t => opts += `<option${t === atual ? ' selected' : ''}>${t}</option>`);
      selTurma.innerHTML = opts;
    }

    // Filtro de turma para notas
    const selTurmaNotas = document.getElementById('selTurmaNotas');
    if (selTurmaNotas) {
      const atual2 = selTurmaNotas.value || '__selecione__';
      let opts2 = '<option value="__selecione__">Selecione...</option>';
      state.turmas.forEach(t => opts2 += `<option${t === atual2 ? ' selected' : ''}>${t}</option>`);
      selTurmaNotas.innerHTML = opts2;
    }

    // Filtro de turma para gráficos (admin)
    const selTurmaGraficos = document.getElementById('selTurmaGraficos');
    if (selTurmaGraficos) {
      const atual3 = selTurmaGraficos.value || '__todas__';
      let opts3 = '<option value="__todas__">Todas</option>';
      state.turmas.forEach(t => opts3 += `<option${t === atual3 ? ' selected' : ''}>${t}</option>`);
      selTurmaGraficos.innerHTML = opts3;
    }
  }

  function atualizarFiltroDisciplinas() {
    if (!selDisciplina) return;
    const atual = selDisciplina.value || '__todas__';
    const disciplinas = Array.from(new Set(
      state.professores
        .map(p => p.disciplina)
        .filter(Boolean)
    ));
    let opts = '<option value="__todas__">Todas</option>';
    disciplinas.forEach(d => opts += `<option${d === atual ? ' selected' : ''}>${d}</option>`);
    selDisciplina.innerHTML = opts;
  }

  function atualizarListagem() {
    const termo = (buscaNome?.value || '').trim().toLowerCase();
    const turmaSel = selTurma ? selTurma.value : '__todas__';
    const discSel = selDisciplina ? selDisciplina.value : '__todas__';

    if (abaListagemAtual === 'alunos' && tbodyAlunos) {
      tbodyAlunos.innerHTML = '';
      const lista = state.alunos.filter(a => {
        const okNome = !termo || a.nome.toLowerCase().includes(termo);
        const okTurma = turmaSel === '__todas__' || a.turma === turmaSel;
        return okNome && okTurma;
      });

      if (!lista.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" class="text-center text-body-secondary">Nenhum aluno encontrado.</td>`;
        tbodyAlunos.appendChild(tr);
      } else {
        lista.forEach(a => {
          const tr = document.createElement('tr');
          let html = `
            <td>${a.nome}</td>
            <td>${a.email || '—'}</td>
            <td>${a.turma || '—'}</td>
            <td>
              <button class="btn btn-sm btn-outline-secondary" data-acao="detalhes" data-tipo="aluno" data-id="${a.id}">
                Detalhes
              </button>
            </td>`;
          if (isAdmin) {
            html += `
              <td>
                <button class="btn btn-sm btn-outline-primary me-1" data-acao="editar" data-tipo="aluno" data-id="${a.id}">Editar</button>
                <button class="btn btn-sm btn-outline-danger" data-acao="excluir" data-tipo="aluno" data-id="${a.id}">Excluir</button>
              </td>`;
          }
          tr.innerHTML = html;
          tbodyAlunos.appendChild(tr);
        });
      }
    }

    if (abaListagemAtual === 'professores' && tbodyProfessores) {
      tbodyProfessores.innerHTML = '';
      const listaP = state.professores.filter(p => {
        const okNome = !termo || p.nome.toLowerCase().includes(termo);
        const okDisc = discSel === '__todas__' || p.disciplina === discSel;
        return okNome && okDisc;
      });

      if (!listaP.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" class="text-center text-body-secondary">Nenhum professor encontrado.</td>`;
        tbodyProfessores.appendChild(tr);
      } else {
        listaP.forEach(p => {
          const tr = document.createElement('tr');
          let html = `
            <td>${p.nome}</td>
            <td>${p.email || '—'}</td>
            <td>${p.disciplina || '—'}</td>
            <td>
              <button class="btn btn-sm btn-outline-secondary" data-acao="detalhes" data-tipo="professor" data-id="${p.id}">
                Detalhes
              </button>
            </td>`;
          if (isAdmin) {
            html += `
              <td>
                <button class="btn btn-sm btn-outline-primary me-1" data-acao="editar" data-tipo="professor" data-id="${p.id}">Editar</button>
                <button class="btn btn-sm btn-outline-danger" data-acao="excluir" data-tipo="professor" data-id="${p.id}">Excluir</button>
              </td>`;
          }
          tr.innerHTML = html;
          tbodyProfessores.appendChild(tr);
        });
      }
    }
  }

  if (tabAlunosBtn) {
    tabAlunosBtn.addEventListener('click', () => {
      abaListagemAtual = 'alunos';
      if (filtroTurmaWrap) filtroTurmaWrap.classList.remove('d-none');
      if (filtroDiscWrap) filtroDiscWrap.classList.add('d-none');
      atualizarListagem();
    });
  }

  if (tabProfBtn) {
    tabProfBtn.addEventListener('click', () => {
      abaListagemAtual = 'professores';
      if (filtroTurmaWrap) filtroTurmaWrap.classList.add('d-none');
      if (filtroDiscWrap) filtroDiscWrap.classList.remove('d-none');
      atualizarFiltroDisciplinas();
      atualizarListagem();
    });
  }

  if (buscaNome) buscaNome.addEventListener('input', atualizarListagem);
  if (selTurma) selTurma.addEventListener('change', atualizarListagem);
  if (selDisciplina) selDisciplina.addEventListener('change', atualizarListagem);

  // ========= Handlers da listagem (detalhes/editar/excluir) =========
  const modalDetalhesTitulo = document.getElementById('modalDetalhesTitulo');
  const modalDetalhesConteudo = document.getElementById('modalDetalhesConteudo');
  const modalEditarPessoaTitulo = document.getElementById('modalEditarPessoaTitulo');
  const edicaoPessoaId = document.getElementById('edicaoPessoaId');
  const edicaoNome = document.getElementById('edicaoNome');
  const edicaoEmail = document.getElementById('edicaoEmail');
  const edicaoRA = document.getElementById('edicaoRA');
  const edicaoTurma = document.getElementById('edicaoTurma');
  const edicaoDisciplina = document.getElementById('edicaoDisciplina');
  const grupoEdicaoAluno = document.getElementById('grupoEdicaoAluno');
  const grupoEdicaoProfessor = document.getElementById('grupoEdicaoProfessor');
  const fbEdicaoPessoa = document.getElementById('fbEdicaoPessoa');
  const btnSalvarEdicaoPessoa = document.getElementById('btnSalvarEdicaoPessoa');

  const modalConfirmacaoTitulo = document.getElementById('modalConfirmacaoTitulo');
  const modalConfirmacaoMensagem = document.getElementById('modalConfirmacaoMensagem');
  const btnConfirmarExclusao = document.getElementById('btnConfirmarExclusao');

  function abrirDetalhes(tipo, id) {
    if (!modalDetalhes || !modalDetalhesConteudo || !modalDetalhesTitulo) return;

    let obj = null;
    if (tipo === 'aluno') obj = state.alunos.find(a => a.id === id);
    if (tipo === 'professor') obj = state.professores.find(p => p.id === id);
    if (!obj) return;

    modalDetalhesTitulo.textContent = tipo === 'aluno' ? 'Detalhes do aluno' : 'Detalhes do professor';

    let html = `<strong>Nome:</strong> ${obj.nome}<br>`;
    html += `<strong>E-mail:</strong> ${obj.email || '—'}<br>`;

    if (tipo === 'aluno') {
      html += `<strong>RA:</strong> ${obj.ra || '—'}<br>`;
      html += `<strong>Turma:</strong> ${obj.turma || '—'}<br>`;
    } else {
      html += `<strong>Disciplina:</strong> ${obj.disciplina || '—'}<br>`;
    }

    modalDetalhesConteudo.innerHTML = html;
    modalDetalhes.show();
  }

  function abrirEdicao(tipo, id) {
    if (!modalEditarPessoa || !modalEditarPessoaTitulo) return;

    let obj = null;
    if (tipo === 'aluno') obj = state.alunos.find(a => a.id === id);
    if (tipo === 'professor') obj = state.professores.find(p => p.id === id);
    if (!obj) return;

    state.pessoaEdicao = { tipo, id };
    if (edicaoPessoaId) edicaoPessoaId.value = String(id);
    if (edicaoNome) edicaoNome.value = obj.nome || '';
    if (edicaoEmail) edicaoEmail.value = obj.email || '';

    if (tipo === 'aluno') {
      if (edicaoRA) edicaoRA.value = obj.ra || '';
      if (edicaoTurma) edicaoTurma.value = obj.turma || '';
      if (grupoEdicaoAluno) grupoEdicaoAluno.classList.remove('d-none');
      if (grupoEdicaoProfessor) grupoEdicaoProfessor.classList.add('d-none');
      modalEditarPessoaTitulo.textContent = 'Editar aluno';
    } else {
      const disc = obj.disciplina || '';

      if (edicaoDisciplina) {
        // garante que a disciplina atual exista na lista do select
        let opt = Array.from(edicaoDisciplina.options)
          .find(o => o.value === disc || o.text === disc);

        if (!opt && disc) {
          const extra = new Option(disc, disc);
          edicaoDisciplina.add(extra);
        }

        edicaoDisciplina.value = disc;
      }

      if (grupoEdicaoProfessor) grupoEdicaoProfessor.classList.remove('d-none');
      if (grupoEdicaoAluno) grupoEdicaoAluno.classList.add('d-none');
      modalEditarPessoaTitulo.textContent = 'Editar professor';
    }

    setMsg(fbEdicaoPessoa, '');
    modalEditarPessoa.show();
  }


  async function salvarEdicaoPessoa() {
    if (!state.pessoaEdicao) return;
    const { tipo, id } = state.pessoaEdicao;

    const nome = (edicaoNome?.value || '').trim();
    const email = (edicaoEmail?.value || '').trim();
    if (!nome || !email) {
      setMsg(fbEdicaoPessoa, 'Informe nome e e-mail.', 'erro');
      return;
    }

    try {
      if (tipo === 'aluno') {
        const ra = (edicaoRA?.value || '').trim();
        const turma = (edicaoTurma?.value || '').trim();

        const body = { id, nome, email, ra, turma };

        // API não retorna corpo (204)
        await api(`/Alunos/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });

        // Atualiza o array em memória
        const idx = state.alunos.findIndex(a => a.id === id);
        if (idx >= 0) {
          state.alunos[idx] = {
            ...state.alunos[idx],
            ...body
          };
        }
      } else {
        const disciplina = (edicaoDisciplina?.value || '').trim();
        const body = { id, nome, email, disciplina };

        // API não retorna corpo (204)
        await api(`/Professores/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });

        // Atualiza o array em memória
        const idxP = state.professores.findIndex(p => p.id === id);
        if (idxP >= 0) {
          state.professores[idxP] = {
            ...state.professores[idxP],
            ...body
          };
        }
      }

      setMsg(fbEdicaoPessoa, 'Registro atualizado com sucesso.', 'ok');
      atualizarListagem();
      atualizarTurmasFiltros();
      atualizarFiltroDisciplinas();
      setTimeout(() => modalEditarPessoa && modalEditarPessoa.hide(), 600);
    } catch (err) {
      console.error(err);
      setMsg(fbEdicaoPessoa, err.message || 'Erro ao atualizar registro.', 'erro');
    }
  }


  if (btnSalvarEdicaoPessoa) {
    btnSalvarEdicaoPessoa.addEventListener('click', salvarEdicaoPessoa);
  }

  function abrirConfirmacaoExclusao(tipo, id) {
    if (!modalConfirmacao || !modalConfirmacaoMensagem || !modalConfirmacaoTitulo) return;
    state.alvoExclusao = { tipo, id };
    const obj = tipo === 'aluno'
      ? state.alunos.find(a => a.id === id)
      : state.professores.find(p => p.id === id);

    modalConfirmacaoTitulo.textContent = 'Confirmar exclusão';
    modalConfirmacaoMensagem.textContent = `Tem certeza que deseja excluir "${obj?.nome || ''}"? Esta ação não poderá ser desfeita.`;
    modalConfirmacao.show();
  }

  function abrirConfirmacaoExclusaoEvento() {
    if (!modalConfirmacao || !modalConfirmacaoMensagem || !modalConfirmacaoTitulo) return;

    const idStr = (eventoId?.value || '').trim();
    if (!idStr) return;

    const id = parseInt(idStr, 10);
    const titulo = (eventoTitulo?.value || '').trim() || 'este evento';

    // guarda o alvo para o botão "Confirmar"
    state.alvoExclusao = { tipo: 'evento', id };

    // 👉 fecha o modal de evento ANTES de abrir o de confirmação
    if (modalEvento) modalEvento.hide();

    modalConfirmacaoTitulo.textContent = 'Excluir evento';
    modalConfirmacaoMensagem.textContent =
      `Tem certeza que deseja excluir "${titulo}"? Esta ação não poderá ser desfeita.`;

    modalConfirmacao.show();
  }


  async function efetivarExclusao() {
    if (!state.alvoExclusao) return;
    const { tipo, id } = state.alvoExclusao;

    try {
      if (tipo === 'aluno') {
        await api(`/Alunos/${id}`, { method: 'DELETE' });
        state.alunos = state.alunos.filter(a => a.id !== id);
        atualizarListagem();
        atualizarTurmasFiltros();
        atualizarFiltroDisciplinas();
      } else if (tipo === 'professor') {
        await api(`/Professores/${id}`, { method: 'DELETE' });
        state.professores = state.professores.filter(p => p.id !== id);
        atualizarListagem();
        atualizarTurmasFiltros();
        atualizarFiltroDisciplinas();
      } else if (tipo === 'evento') {
        await api(`/Eventos/${id}`, { method: 'DELETE' });
        if (state.calendar) state.calendar.refetchEvents();
        // modalEvento já foi fechado lá em cima
      }

      if (modalConfirmacao) modalConfirmacao.hide();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao excluir registro.');
    }
  }


  if (btnConfirmarExclusao) {
    btnConfirmarExclusao.addEventListener('click', efetivarExclusao);
  }

  function anexarHandlersListagem(tbody, tipo) {
    if (!tbody) return;
    tbody.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const acao = btn.getAttribute('data-acao');
      const id = parseInt(btn.getAttribute('data-id') || '0', 10);
      const tipoBtn = btn.getAttribute('data-tipo') || tipo;

      if (!acao || !id) return;

      if (acao === 'detalhes') {
        abrirDetalhes(tipoBtn, id);
      }
      if (acao === 'editar' && isAdmin) {
        abrirEdicao(tipoBtn, id);
      }
      if (acao === 'excluir' && isAdmin) {
        abrirConfirmacaoExclusao(tipoBtn, id);
      }
    });
  }

  anexarHandlersListagem(tbodyAlunos, 'aluno');
  anexarHandlersListagem(tbodyProfessores, 'professor');

  // ================== NOTAS (PROFESSOR) ==================
  const selTurmaNotas = document.getElementById('selTurmaNotas');
  const tbodyNotas = document.getElementById('tbodyNotas');

  function atualizarNotas() {
    if (!tbodyNotas) return;
    const turma = selTurmaNotas ? (selTurmaNotas.value || '__selecione__') : '__selecione__';
    tbodyNotas.innerHTML = '';

    if (!isProfessor) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="3" class="text-center text-body-secondary">
        Somente professores podem lançar notas.
      </td>`;
      tbodyNotas.appendChild(tr);
      return;
    }

    if (turma === '__selecione__') {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="3" class="text-center text-body-secondary">
        Selecione uma turma para lançar notas.
      </td>`;
      tbodyNotas.appendChild(tr);
      return;
    }

    const alunosTurma = state.alunos.filter(a => a.turma === turma);
    if (!alunosTurma.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="3" class="text-center text-body-secondary">
        Nenhum aluno encontrado nesta turma.
      </td>`;
      tbodyNotas.appendChild(tr);
      return;
    }

    alunosTurma.forEach(a => {
      const notasAluno = state.notasProfessor.filter(n => n.alunoId === a.id);
      const chips = notasAluno.map(n => `
        <span class="badge text-bg-secondary me-1 mb-1">
          ${Number(n.valor).toFixed(1)}
          <button type="button"
                  class="btn btn-sm btn-link text-white p-0 ms-1"
                  data-acao="rem-nota"
                  data-id="${n.id}">
            ×
          </button>
        </span>`).join('') || '<span class="text-body-secondary">— sem notas —</span>';

      const mediaAluno = media(notasAluno.map(n => Number(n.valor)));

      const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${a.nome}</td>

          <td>
            ${chips}
          </td>

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

          <td class="text-center">
            ${mediaAluno == null ? '—' : mediaAluno.toFixed(2)}
          </td>
        `;
        tbodyNotas.appendChild(tr);
    });
  }

  if (selTurmaNotas) {
    selTurmaNotas.addEventListener('change', atualizarNotas);
  }

  if (tbodyNotas) {
    tbodyNotas.addEventListener('click', async e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const acao = btn.getAttribute('data-acao');

      if (acao === 'add-nota') {
        if (!isProfessor) return;
        const alunoId = parseInt(btn.getAttribute('data-aluno-id') || '0', 10);
        const inp = tbodyNotas.querySelector(`input[data-aluno-id="${alunoId}"]`);
        if (!alunoId || !inp) return;

        const valor = parseFloat(inp.value.replace(',', '.'));
        if (Number.isNaN(valor) || valor < 0 || valor > 10) {
          alert('Informe uma nota entre 0 e 10.');
          return;
        }

        try {
          const body = JSON.stringify({ alunoId, valor });
          const nova = await api('/Notas', { method: 'POST', body });
          state.notasProfessor.push(nova);
          inp.value = '';
          atualizarNotas();
          atualizarGraficos();
        } catch (err) {
          console.error(err);
          alert(err.message || 'Erro ao lançar nota.');
        }
      }

      if (acao === 'rem-nota') {
        if (!isProfessor) return;
        const id = parseInt(btn.getAttribute('data-id') || '0', 10);
        if (!id || !confirm('Remover esta nota?')) return;

        try {
          await api(`/Notas/${id}`, { method: 'DELETE' });
          state.notasProfessor = state.notasProfessor.filter(n => n.id !== id);
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
  const chartCanvas = document.getElementById('chartNotas');
  const grafMsg = document.getElementById('grafMsg');
  const tituloGraficos = document.getElementById('tituloGraficos');
  const subtituloGraficos = document.getElementById('subtituloGraficos');
  const selTurmaGraficos = document.getElementById('selTurmaGraficos');

  async function atualizarGraficos() {
    if (!chartCanvas) return;

    // Destroi o gráfico anterior (se existir)
    if (state.chartNotas) {
      state.chartNotas.destroy();
      state.chartNotas = null;
    }
    setMsg(grafMsg, '');

    try {
      let labels = [];
      let valores = [];
      let titulo = 'Gráficos de desempenho';
      let subtitulo = '';

      if (isAluno) {
        titulo = 'Médias por disciplina (suas notas)';
        const aluno = await api('/Alunos/me');
        if (!aluno || !aluno.id) {
          setMsg(grafMsg, 'Não foi possível identificar o aluno logado para o gráfico.', 'erro');
          return;
        }
        const dados = await api(`/Notas/grafico-aluno/${aluno.id}`) || [];
        if (!dados.length) {
          setMsg(grafMsg, 'Ainda não há notas lançadas para você.', 'erro');
          return;
        }
        labels = dados.map(d => d.disciplina || '—');
        valores = dados.map(d => Number(d.media || d.valor || 0));
      } else if (isProfessor) {
        titulo = 'Médias por turma (suas turmas)';
        const dados = await api('/Notas/grafico-professor') || [];
        if (!dados.length) {
          setMsg(grafMsg, 'Ainda não há notas lançadas para suas turmas.', 'erro');
          return;
        }
        labels = dados.map(d => d.turma || '—');
        valores = dados.map(d => Number(d.media || d.valor || 0));
      } else if (isAdmin) {
        titulo = 'Médias por disciplina (turma selecionada)';
        const turma = selTurmaGraficos ? (selTurmaGraficos.value || '__todas__') : '__todas__';
        if (!state.turmas.length) {
          setMsg(grafMsg, 'Nenhuma turma cadastrada para gerar gráficos.', 'erro');
          return;
        }
        if (turma === '__todas__') {
          setMsg(grafMsg, 'Selecione uma turma para ver as médias por disciplina.', 'erro');
          return;
        }
        subtitulo = `Turma: ${turma}`;
        const dados = await api(`/Notas/grafico-admin?turma=${encodeURIComponent(turma)}`) || [];
        if (!dados.length) {
          setMsg(grafMsg, 'Ainda não há notas lançadas para esta turma.', 'erro');
          return;
        }
        labels = dados.map(d => d.disciplina || '—');
        valores = dados.map(d => Number(d.media || d.valor || 0));
      }

      if (tituloGraficos) tituloGraficos.textContent = titulo;
      if (subtituloGraficos) subtituloGraficos.textContent = subtitulo;

      // 🔧 garante que o canvas resete antes de criar o gráfico
      chartCanvas.height = chartCanvas.height;

      const ctx = chartCanvas.getContext('2d');
      state.chartNotas = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Média',
            data: valores
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,   // deixa o Chart usar 100% da altura do container
          scales: {
            y: {
              beginAtZero: true,
              suggestedMax: 10
            }
          }
        }
      });
    } catch (err) {
      console.error(err);
      setMsg(grafMsg, err.message || 'Erro ao carregar gráficos.', 'erro');
    }
  }


  if (selTurmaGraficos && isAdmin) {
    selTurmaGraficos.addEventListener('change', atualizarGraficos);
  }

  // ================== CALENDÁRIO ==================
  const calendarioEl = document.getElementById('calendario');
  const btnAddEvento = document.getElementById('btnAddEvento');
  const eventoId = document.getElementById('eventoId');
  const eventoTitulo = document.getElementById('eventoTitulo');
  const eventoDataInicio = document.getElementById('eventoDataInicio');
  const eventoDataFim = document.getElementById('eventoDataFim');
  const fbEvento = document.getElementById('fbEvento');
  const btnSalvarEvento = document.getElementById('btnSalvarEvento');
  const btnExcluirEvento = document.getElementById('btnExcluirEvento');

  function abrirModalEvento(valorInicial) {
    if (!modalEvento) return;
    if (eventoId) eventoId.value = valorInicial && valorInicial.id ? String(valorInicial.id) : '';
    if (eventoTitulo) eventoTitulo.value = valorInicial?.titulo || '';
    if (eventoDataInicio) eventoDataInicio.value = valorInicial?.dataInicio || '';
    if (eventoDataFim) eventoDataFim.value = valorInicial?.dataFim || '';
    if (btnExcluirEvento) {
      btnExcluirEvento.classList.toggle('d-none', !valorInicial || !valorInicial.id);
    }
    setMsg(fbEvento, '');
    modalEvento.show();
  }

  async function salvarEvento() {
    if (!isProfessor && !isAdmin) return;

    const id = (eventoId?.value || '').trim();
    const titulo = (eventoTitulo?.value || '').trim();
    const dataInicio = (eventoDataInicio?.value || '').trim();
    const dataFim = (eventoDataFim?.value || '').trim() || null;

    if (!titulo || !dataInicio) {
      setMsg(fbEvento, 'Informe título e data de início.', 'erro');
      return;
    }

    const body = { titulo, dataInicio, dataFim };

    try {
      if (id) {
        await api(`/Eventos/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body)
        });
      } else {
        await api('/Eventos', {
          method: 'POST',
          body: JSON.stringify(body)
        });
      }

      setMsg(fbEvento, 'Evento salvo com sucesso.', 'ok');
      if (state.calendar) state.calendar.refetchEvents();
      setTimeout(() => modalEvento && modalEvento.hide(), 600);
    } catch (err) {
      console.error(err);
      setMsg(fbEvento, err.message || 'Erro ao salvar evento.', 'erro');
    }
  }

  if (btnSalvarEvento) btnSalvarEvento.addEventListener('click', salvarEvento);
  if (btnExcluirEvento) {
    btnExcluirEvento.addEventListener('click', abrirConfirmacaoExclusaoEvento);
  }


  function initCalendario() {
    if (!calendarioEl || !window.FullCalendar) return;
    if (state.calendar) {
      state.calendar.render();
      return;
    }

    state.calendar = new FullCalendar.Calendar(calendarioEl, {
      initialView: 'dayGridMonth',
      height: 'auto',
      locale: 'pt-br',
      displayEventTime: false,
      events: async function (info, success, failure) {
        try {
          const dados = await api('/Eventos') || [];
          const eventos = dados.map(ev => ({
            id: ev.id,
            title: ev.titulo,
            start: ev.dataInicio,
            end: ev.dataFim || ev.dataInicio
          }));
          success(eventos);
        } catch (err) {
          console.error(err);
          failure(err);
        }
      },
      dateClick: function (info) {
        if (!isProfessor && !isAdmin) return;
        abrirModalEvento({ titulo: '', dataInicio: info.dateStr, dataFim: '' });
      },
      eventClick: function (info) {
        const ev = info.event;
        if (!ev) return;
        abrirModalEvento({
          id: ev.id,
          titulo: ev.title,
          dataInicio: ev.startStr.slice(0, 10),
          dataFim: ev.endStr ? ev.endStr.slice(0, 10) : ''
        });
      }
    });

    state.calendar.render();
  }

  if (btnAddEvento) {
    btnAddEvento.addEventListener('click', () => {
      abrirModalEvento({ titulo: '', dataInicio: '', dataFim: '' });
    });
  }

  // ================== MATRÍCULAS PENDENTES (ADMIN) ==================
  const tbodyMatriculasPend = document.getElementById('tbodyMatriculasPendentesCadastro');
  const cadMatId = document.getElementById('cadMatId');
  const cadMatNome = document.getElementById('cadMatNome');
  const cadMatEmail = document.getElementById('cadMatEmail');
  const cadMatDataNasc = document.getElementById('cadMatDataNasc');
  const cadMatRA = document.getElementById('cadMatRA');
  const cadMatTurma = document.getElementById('cadMatTurma');
  const fbCadastroMatricula = document.getElementById('fbCadastroMatricula');
  const btnSalvarCadastroMatricula = document.getElementById('btnSalvarCadastroMatricula');

  function atualizarMatriculasPendentes() {
    if (!tbodyMatriculasPend) return;
    tbodyMatriculasPend.innerHTML = '';

    if (!isAdmin) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" class="text-center text-body-secondary">
        Somente administradores podem gerenciar matrículas pendentes.
      </td>`;
      tbodyMatriculasPend.appendChild(tr);
      return;
    }

    if (!state.matriculasPendentes.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" class="text-center text-body-secondary">
        Nenhuma matrícula pendente.
      </td>`;
      tbodyMatriculasPend.appendChild(tr);
      return;
    }

    state.matriculasPendentes.forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${m.nome}</td>
        <td>${m.email}</td>
        <td>${m.dataNascimento ? m.dataNascimento.substring(0, 10) : '—'}</td>
        <td>${m.dataCriacao ? m.dataCriacao.substring(0, 16).replace('T', ' ') : '—'}</td>
        <td>${m.status || 'Pendente'}</td>
        <td>
          <button class="btn btn-sm btn-primary" data-acao="cad-aluno" data-id="${m.id}">
            Cadastrar
          </button>
        </td>`;
      tbodyMatriculasPend.appendChild(tr);
    });
  }

  if (tbodyMatriculasPend) {
    tbodyMatriculasPend.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const acao = btn.getAttribute('data-acao');
      const id = parseInt(btn.getAttribute('data-id') || '0', 10);
      if (acao === 'cad-aluno' && id && isAdmin) {
        const m = state.matriculasPendentes.find(x => x.id === id);
        if (!m || !modalCadAlunoMat) return;

        state.matriculaCadastroAtual = { idSolicitacao: id };
        if (cadMatId) cadMatId.value = String(id);
        if (cadMatNome) cadMatNome.value = m.nome || '';
        if (cadMatEmail) cadMatEmail.value = m.email || '';
        if (cadMatDataNasc) cadMatDataNasc.value = m.dataNascimento ? m.dataNascimento.substring(0, 10) : '';
        if (cadMatRA) cadMatRA.value = '';
        if (cadMatTurma) cadMatTurma.value = '';
        setMsg(fbCadastroMatricula, '');
        modalCadAlunoMat.show();
      }
    });
  }

  async function salvarCadastroAlunoMatricula() {
    if (!state.matriculaCadastroAtual) return;
    const idSolic = state.matriculaCadastroAtual.idSolicitacao;
    const ra = (cadMatRA?.value || '').trim();
    const turma = (cadMatTurma?.value || '').trim();

    if (!ra || !turma) {
      setMsg(fbCadastroMatricula, 'Informe RA e turma do aluno.', 'erro');
      return;
    }

    const m = state.matriculasPendentes.find(x => x.id === idSolic);
    if (!m) {
      setMsg(fbCadastroMatricula, 'Solicitação não encontrada.', 'erro');
      return;
    }

    try {
      // 1) Cria o aluno
      const novoAluno = await api('/Alunos', {
        method: 'POST',
        body: JSON.stringify({
          nome: m.nome,
          email: m.email,
          dataNascimento: m.dataNascimento,
          ra,
          turma
        })
      });
      state.alunos.push(novoAluno);

      // 2) Marca a matrícula como aprovada
      await api('/Matriculas/responder', {
        method: 'POST',
        body: JSON.stringify({
          id: idSolic,
          aprovar: true,
          observacao: null
        })
      });

      // Remove da lista local
      state.matriculasPendentes = state.matriculasPendentes.filter(x => x.id !== idSolic);
      atualizarMatriculasPendentes();
      atualizarListagem();
      atualizarTurmasFiltros();
      setMsg(fbCadastroMatricula, 'Aluno cadastrado e matrícula aprovada.', 'ok');
      setTimeout(() => modalCadAlunoMat && modalCadAlunoMat.hide(), 700);
    } catch (err) {
      console.error(err);
      setMsg(fbCadastroMatricula, err.message || 'Erro ao cadastrar aluno/aprovar matrícula.', 'erro');
    }
  }

  if (btnSalvarCadastroMatricula) {
    btnSalvarCadastroMatricula.addEventListener('click', salvarCadastroAlunoMatricula);
  }

  // ================== CARREGAMENTO INICIAL ==================
  async function carregarDadosIniciais() {
    try {
      const promessas = [
        api('/Alunos'),
        api('/Professores'),
        api('/Alunos/turmas')
      ];

      if (isProfessor) {
        promessas.push(api('/Notas/professor'));
      } else {
        promessas.push(Promise.resolve([]));
      }

      if (isAdmin) {
        promessas.push(api('/Matriculas/pendentes'));
      } else {
        promessas.push(Promise.resolve([]));
      }

      const [
        alunosApi,
        profsApi,
        turmasApi,
        notasProfApi,
        matsApi
      ] = await Promise.all(promessas);

      state.alunos = alunosApi || [];
      state.professores = profsApi || [];
      state.turmas = turmasApi || [];
      state.notasProfessor = notasProfApi || [];
      state.matriculasPendentes = matsApi || [];

      atualizarTurmasFiltros();
      atualizarFiltroDisciplinas();
      atualizarListagem();
      if (isAdmin) atualizarMatriculasPendentes();
    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err);
      alert(err.message || 'Erro ao carregar dados iniciais.');
    }
  }

  // ================== INICIALIZAÇÃO GERAL ==================
  function init() {
    configurarPermissoes();
    montarHome();
    atualizarTipoCadastro('aluno');
    carregarDadosIniciais();
  }

  init();

})();
