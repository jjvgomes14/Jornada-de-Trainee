(function () {
  var usuario = localStorage.getItem('usuarioLogado') || '';
  var tipo = localStorage.getItem('tipoUsuario') || '';
  var isAdmin = (tipo === 'administrador');
  var isProfessor = (tipo === 'professor');
  var isAluno = (!isAdmin && !isProfessor);

  var nomeUsuario = document.getElementById('nomeUsuario');
  if (nomeUsuario) { nomeUsuario.textContent = usuario; }

  // === Tema Claro/Escuro ===
  var body = document.body;
  var switchTema = document.getElementById('switchTema');
  var labelTema = document.getElementById('labelTema');
  var tema = localStorage.getItem('tema') || 'light';
  aplicarTema(tema);

  if (switchTema) {
    switchTema.addEventListener('change', function () {
      var novo = switchTema.checked ? 'dark' : 'light';
      aplicarTema(novo);
      localStorage.setItem('tema', novo);
    });
  }

  function aplicarTema(nome) {
    body.setAttribute('data-bs-theme', nome);
    if (labelTema) labelTema.textContent = (nome === 'dark') ? 'Modo escuro' : 'Modo claro';
    if (switchTema) switchTema.checked = (nome === 'dark');
  }

  // === Logout ===
  var btnSair = document.getElementById('btnSair');
  if (btnSair) {
    btnSair.addEventListener('click', function () {
      localStorage.removeItem('usuarioLogado');
      localStorage.removeItem('tipoUsuario');
      window.location.href = 'index.html';
    });
  }

  // === Armazenamento Local ===
  var KEY_ALUNOS  = 'alunos';
  var KEY_PROFS   = 'professores';
  var KEY_EVENTOS = 'eventos';
  var KEY_NOTIFS  = 'notificacoes_eventos';
  var KEY_VISTAS  = 'notifs_vistas_' + (usuario || 'aluno');

  function lerJSON(chave) {
    try { return JSON.parse(localStorage.getItem(chave) || '[]'); }
    catch(e) { return []; }
  }
  function gravarJSON(chave, valor) {
    localStorage.setItem(chave, JSON.stringify(valor));
  }

  var alunos = lerJSON(KEY_ALUNOS);
  var professores = lerJSON(KEY_PROFS);
  var eventosStore = lerJSON(KEY_EVENTOS);

  // === Helper notas normalizadas (por disciplina) ===
  function normalizarNotasAluno(aluno) {
    if (!aluno) return [];
    var n = aluno.notas;
    var res = [];
    if (!Array.isArray(n)) {
      aluno.notas = res;
      return res;
    }
    for (var i = 0; i < n.length; i++) {
      var item = n[i];
      if (typeof item === 'number') {
        res.push({ disciplina: 'Geral', valor: Number(item) });
      } else if (item && typeof item === 'object') {
        var disc = item.disciplina || item.disc || 'Geral';
        var v = parseFloat(item.valor);
        if (!isNaN(v)) res.push({ disciplina: disc, valor: v });
      }
    }
    aluno.notas = res;
    return res;
  }

  function notasDaDisciplina(aluno, disciplina) {
    var todas = normalizarNotasAluno(aluno);
    if (!disciplina) return todas.map(function (n) { return n.valor; });
    var out = [];
    for (var i = 0; i < todas.length; i++) {
      if (todas[i].disciplina === disciplina) out.push(todas[i].valor);
    }
    return out;
  }

  function media(arr) {
    if (!arr || !arr.length) return null;
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }

  // === Determinar "usuário de dados" (alunoAtual / professorAtual) ===
  var alunoAtual = null;
  var professorAtual = null;

  if (isAluno && alunos.length) {
    var ul = usuario.toLowerCase();
    for (var iA = 0; iA < alunos.length; iA++) {
      var a = alunos[iA];
      var nomeA = (a.nome || '').toLowerCase();
      var emailA = (a.email || '').toLowerCase();
      var raA = (a.ra || '').toLowerCase();
      if (nomeA.indexOf(ul) !== -1 || emailA.indexOf(ul) !== -1 || raA.indexOf(ul) !== -1) {
        alunoAtual = a;
        break;
      }
    }
    if (!alunoAtual) alunoAtual = alunos[0];
  }

  if (isProfessor && professores.length) {
    var up = usuario.toLowerCase();
    for (var iP = 0; iP < professores.length; iP++) {
      var p = professores[iP];
      var nomeP = (p.nome || '').toLowerCase();
      var emailP = (p.email || '').toLowerCase();
      if (nomeP.indexOf(up) !== -1 || emailP.indexOf(up) !== -1) {
        professorAtual = p;
        break;
      }
    }
    if (!professorAtual) professorAtual = professores[0];
  }

  var disciplinaProfessorAtual = professorAtual ? (professorAtual.disc || professorAtual.disciplina || '') : '';

  // === Ocultar seções conforme perfil ===
  function esconderSecoesPorPerfil() {
    var ocultar = [];
    if (isAdmin) {
      ocultar = ['sec-graficos','sec-calendario','sec-notificacoes','sec-notas'];
    } else if (isProfessor) {
      ocultar = ['sec-cadastro','sec-notificacoes'];
    } else {
      ocultar = ['sec-cadastro','sec-notas'];
    }

    for (var i = 0; i < ocultar.length; i++) {
      var id = ocultar[i];
      var link = document.querySelector('#menu .nav-link[data-section="' + id + '"]');
      if (link && link.parentElement) link.parentElement.style.display = 'none';
      var sec = document.getElementById(id);
      if (sec) sec.classList.add('d-none');
    }

    var ativo = document.querySelector('#menu .nav-link.active');
    if (ativo && ocultar.indexOf(ativo.getAttribute('data-section')) !== -1) {
      ativo.classList.remove('active');
      var fallback = document.querySelector('#menu .nav-link[data-section="sec-home"]');
      if (fallback) {
        fallback.classList.add('active');
        var secs = document.querySelectorAll('.sec');
        for (var j = 0; j < secs.length; j++) secs[j].classList.add('d-none');
        var sh = document.getElementById('sec-home');
        if (sh) sh.classList.remove('d-none');
      }
    }
  }

  // === Home dinâmica (2 colunas) ===
  function montarHome() {
    var container = document.getElementById('homeCards');
    if (!container) return;
    container.innerHTML = '';

    var descricoes = {
      'sec-listagem': 'Veja a listagem de alunos e professores cadastrados.',
      'sec-cadastro': 'Cadastre novos alunos e professores no sistema.',
      'sec-graficos': isAluno
        ? 'Veja suas notas por disciplina.'
        : (isProfessor ? 'Veja médias das turmas na sua disciplina.' : 'Visualize desempenho geral.'),
      'sec-calendario': 'Consulte o calendário escolar e eventos.',
      'sec-notas': 'Lance e gerencie as notas dos alunos.',
      'sec-notificacoes': 'Veja notificações sobre atualizações de eventos.'
    };

    var linksMenu = document.querySelectorAll('#menu .nav-link');
    for (var i = 0; i < linksMenu.length; i++) {
      var link = linksMenu[i];
      var secId = link.getAttribute('data-section');
      if (secId === 'sec-home') continue;
      if (link.parentElement && link.parentElement.style.display === 'none') continue;
      var titulo = (link.textContent || '').replace(/\s+/g, ' ').trim();

      var col = document.createElement('div');
      // 2 colunas em telas grandes
      col.className = 'col-12 col-md-6';
      col.innerHTML =
        '<div class="card h-100 shadow-sm">' +
          '<div class="card-body d-flex flex-column">' +
            '<h6 class="card-title mb-1">' + titulo + '</h6>' +
            '<p class="card-text small text-body-secondary mb-3">' +
              (descricoes[secId] || ('Acesse a seção "' + titulo + '".')) +
            '</p>' +
            '<button type="button" class="btn btn-sm btn-primary mt-auto" data-go-section="' + secId + '">Abrir</button>' +
          '</div>' +
        '</div>';
      container.appendChild(col);
    }

    container.onclick = function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('button[data-go-section]') : null;
      if (!btn) return;
      var alvo = btn.getAttribute('data-go-section');
      var menuLink = document.querySelector('#menu .nav-link[data-section="' + alvo + '"]');
      if (menuLink) {
        menuLink.click();
        var homeLink = document.querySelector('#menu .nav-link[data-section="sec-home"]');
        if (homeLink) homeLink.classList.remove('active');
      }
    };
  }

  esconderSecoesPorPerfil();
  montarHome();

  // === Navegação entre seções ===
  var links = document.querySelectorAll('#menu .nav-link');
  var calendar;
  var calendarRendered = false;

  for (var k = 0; k < links.length; k++) {
    links[k].addEventListener('click', function (e) {
      e.preventDefault();
      for (var a = 0; a < links.length; a++) links[a].classList.remove('active');
      this.classList.add('active');

      var alvo = this.getAttribute('data-section');
      var secs = document.querySelectorAll('.sec');
      for (var b = 0; b < secs.length; b++) secs[b].classList.add('d-none');
      var open = document.getElementById(alvo);
      if (open) open.classList.remove('d-none');

      if (alvo === 'sec-calendario' && calendar) {
        setTimeout(function () {
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
    });
  }

  // Garantir que Home seja a primeira
  var homeLinkInit = document.querySelector('#menu .nav-link[data-section="sec-home"]');
  if (homeLinkInit) {
    var secsInit = document.querySelectorAll('.sec');
    for (var si = 0; si < secsInit.length; si++) secsInit[si].classList.add('d-none');
    var homeSec = document.getElementById('sec-home');
    if (homeSec) homeSec.classList.remove('d-none');
    for (var li = 0; li < links.length; li++) links[li].classList.remove('active');
    homeLinkInit.classList.add('active');
  }

  // === Calendário + lista de eventos ===
  var listaEventos = document.getElementById('listaEventos');
  var listaEventosVazia = document.getElementById('listaEventosVazia');

  function formatarDataIso(iso) {
    if (!iso) return '';
    var s = String(iso).slice(0, 10);
    var partes = s.split('-');
    if (partes.length === 3) {
      return partes[2] + '/' + partes[1] + '/' + partes[0];
    }
    return s;
  }

  function atualizarListaEventos() {
    if (!listaEventos || !listaEventosVazia) return;
    var eventos = lerJSON(KEY_EVENTOS);
    listaEventos.innerHTML = '';
    if (!eventos.length) {
      listaEventosVazia.classList.remove('d-none');
      return;
    }
    listaEventosVazia.classList.add('d-none');

    eventos.sort(function(a, b){
      var da = a.start || '';
      var db = b.start || '';
      if (da < db) return -1;
      if (da > db) return 1;
      return 0;
    });

    for (var i = 0; i < eventos.length; i++) {
      var ev = eventos[i];
      var li = document.createElement('li');
      li.className = 'list-group-item d-flex flex-column';
      var inicioFmt = formatarDataIso(ev.start);
      var fimFmt = formatarDataIso(ev.end);
      var datasTxt = inicioFmt;
      if (inicioFmt && fimFmt && fimFmt !== inicioFmt) {
        datasTxt = inicioFmt + ' até ' + fimFmt;
      }
      li.innerHTML =
        '<strong>' + (ev.title || 'Evento') + '</strong>' +
        (datasTxt ? '<span class="text-body-secondary">Data: ' + datasTxt + '</span>' : '');
      listaEventos.appendChild(li);
    }
  }

  atualizarListaEventos();

  // === Notificações simples ===
  var listaNotificacoes = document.getElementById('listaNotificacoes');

  function salvarNotificacao(ev, tipo) {
    var notifs = lerJSON(KEY_NOTIFS);
    notifs.push({
      id: 'ntf-' + Date.now(),
      eventoId: ev.id,
      titulo: ev.title,
      inicio: ev.startStr || (ev.start && ev.start.toISOString ? ev.start.toISOString().slice(0,10) : ''),
      tipo: tipo || 'novo',
      criadoEm: new Date().toISOString()
    });
    gravarJSON(KEY_NOTIFS, notifs);
  }

  function salvarNotificacaoAlteracao(ev, acao) {
    salvarNotificacao(ev, acao);
  }

  function renderToast(msg) {
    if (!listaNotificacoes) return;
    var toast = document.createElement('div');
    toast.className = 'toast align-items-center show border';
    toast.setAttribute('role', 'alert');
    toast.innerHTML =
      '<div class="d-flex">' +
        '<div class="toast-body">' + msg + '</div>' +
        '<button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>' +
      '</div>';
    listaNotificacoes.prepend(toast);
  }

  function mostrarNotifsNovasAluno() {
    if (!isAluno) return;
    var notifs = lerJSON(KEY_NOTIFS);
    var vistas = [];
    try { vistas = JSON.parse(localStorage.getItem(KEY_VISTAS) || '[]'); }
    catch(e) { vistas = []; }
    var setVistas = {};
    for (var i = 0; i < vistas.length; i++) setVistas[vistas[i]] = true;

    var novas = [];
    for (var j = 0; j < notifs.length; j++) {
      if (!setVistas[notifs[j].id]) novas.push(notifs[j]);
    }

    var inicio = Math.max(0, novas.length - 10);
    for (var u = inicio; u < novas.length; u++) {
      var n = novas[u];
      var dataTxt = n.inicio ? (' em ' + n.inicio) : '';
      var msg;
      switch (n.tipo) {
        case 'novo':
          msg = 'Novo evento: <b>' + n.titulo + '</b>' + dataTxt + '.';
          break;
        case 'editado':
          msg = 'Evento editado: <b>' + n.titulo + '</b>' + dataTxt + '.';
          break;
        case 'movido':
          msg = 'Evento movido: <b>' + n.titulo + '</b>' + dataTxt + '.';
          break;
        case 'datas_alteradas':
          msg = 'Datas ajustadas: <b>' + n.titulo + '</b>' + dataTxt + '.';
          break;
        case 'excluido':
          msg = 'Evento excluído: <b>' + n.titulo + '</b>.';
          break;
        default:
          msg = 'Atualização no evento: <b>' + n.titulo + '</b>' + dataTxt + '.';
      }
      renderToast(msg);
      vistas.push(n.id);
    }
    localStorage.setItem(KEY_VISTAS, JSON.stringify(vistas));
  }

  // === Cadastro (toggle aluno/professor) ===
  var tipoCadastroAtual = 'aluno';
  var btnTipoAluno = document.getElementById('btnTipoAluno');
  var btnTipoProfessor = document.getElementById('btnTipoProfessor');
  var tituloCadastro = document.getElementById('tituloCadastro');
  var grupoCadastroAluno = document.getElementById('grupoCadastroAluno');
  var grupoCadastroProfessor = document.getElementById('grupoCadastroProfessor');

  function atualizarTipoCadastro() {
    if (tituloCadastro) {
      tituloCadastro.textContent = (tipoCadastroAtual === 'aluno') ? 'Cadastrar Aluno' : 'Cadastrar Professor';
    }
    if (btnTipoAluno && btnTipoProfessor) {
      if (tipoCadastroAtual === 'aluno') {
        btnTipoAluno.classList.add('btn-primary','active');
        btnTipoAluno.classList.remove('btn-outline-primary');
        btnTipoProfessor.classList.remove('btn-primary','active');
        btnTipoProfessor.classList.add('btn-outline-primary');
      } else {
        btnTipoProfessor.classList.add('btn-primary','active');
        btnTipoProfessor.classList.remove('btn-outline-primary');
        btnTipoAluno.classList.remove('btn-primary','active');
        btnTipoAluno.classList.add('btn-outline-primary');
      }
    }
    if (grupoCadastroAluno) grupoCadastroAluno.classList.toggle('d-none', tipoCadastroAtual !== 'aluno');
    if (grupoCadastroProfessor) grupoCadastroProfessor.classList.toggle('d-none', tipoCadastroAtual !== 'professor');
  }

  if (btnTipoAluno) {
    btnTipoAluno.addEventListener('click', function () {
      tipoCadastroAtual = 'aluno';
      atualizarTipoCadastro();
    });
  }
  if (btnTipoProfessor) {
    btnTipoProfessor.addEventListener('click', function () {
      tipoCadastroAtual = 'professor';
      atualizarTipoCadastro();
    });
  }
  atualizarTipoCadastro();

  var formCadastro = document.getElementById('formCadastro');

  function setFb(el, msg, erro) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'small mt-1 ' + (erro ? 'text-danger' : 'text-success');
  }

  if (formCadastro) {
    formCadastro.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome  = (document.getElementById('cadNome').value || '').trim();
      var email = (document.getElementById('cadEmail').value || '').trim();
      var nasc  = (document.getElementById('cadDataNasc').value || '').trim();
      var fb = document.getElementById('fbCadastro');

      if (!nome || !email || !nasc) {
        setFb(fb, 'Preencha todos os campos obrigatórios.', true);
        return;
      }

      if (tipoCadastroAtual === 'aluno') {
        var ra    = (document.getElementById('cadRA').value || '').trim();
        var turma = (document.getElementById('cadTurma').value || '').trim();
        if (!ra || !turma) {
          setFb(fb, 'Preencha RA e Turma para o aluno.', true);
          return;
        }
        alunos.push({ nome: nome, email: email, ra: ra, turma: turma, nasc: nasc, notas: [] });
        gravarJSON(KEY_ALUNOS, alunos);
        setFb(fb, 'Aluno cadastrado!', false);
      } else {
        var disc = (document.getElementById('cadDisc').value || '').trim();
        if (!disc) {
          setFb(fb, 'Preencha a disciplina do professor.', true);
          return;
        }
        professores.push({ nome: nome, email: email, nasc: nasc, disc: disc });
        gravarJSON(KEY_PROFS, professores);
        setFb(fb, 'Professor cadastrado!', false);
      }

      formCadastro.reset();
      document.getElementById('cadDataNasc').value = '';
      atualizarFiltros();
      atualizarSelTurmas(selTurmaNotas);
      atualizarNotas();
      atualizarGraficos();
      renderListas();
    });
  }

  // === Listagem: filtros + busca por nome ===
  var selTurma = document.getElementById('selTurma');
  var selDisc  = document.getElementById('selDisciplina');
  var filtroTurmaWrap = document.getElementById('filtroTurmaWrap');
  var filtroDiscWrap  = document.getElementById('filtroDiscWrap');
  var inpBuscaNome = document.getElementById('buscaNome');

  if (selTurma) selTurma.addEventListener('change', renderListas);
  if (selDisc)  selDisc.addEventListener('change', renderListas);
  if (inpBuscaNome) {
    inpBuscaNome.addEventListener('input', function () {
      renderListas();
    });
  }

  var tabsListagem = document.querySelectorAll('#tabsListagem .nav-link');
  for (var t = 0; t < tabsListagem.length; t++) {
    tabsListagem[t].addEventListener('click', function () {
      for (var q = 0; q < tabsListagem.length; q++) tabsListagem[q].classList.remove('active');
      this.classList.add('active');
      var panes = document.querySelectorAll('.tab-pane');
      for (var w = 0; w < panes.length; w++) panes[w].classList.remove('show','active');
      var pane = document.getElementById(this.getAttribute('data-target'));
      if (pane) pane.classList.add('show','active');

      var alunosAtivo = (this.getAttribute('data-target') === 'tab-alunos');
      if (filtroTurmaWrap) filtroTurmaWrap.classList.toggle('d-none', !alunosAtivo);
      if (filtroDiscWrap) filtroDiscWrap.classList.toggle('d-none', alunosAtivo);
      renderListas();
    });
  }

  // mostrar coluna Ações se admin
  if (isAdmin) {
    var ths = document.querySelectorAll('.th-acoes');
    for (var z = 0; z < ths.length; z++) ths[z].classList.remove('d-none');
  }

  function atualizarFiltros() {
    // Turmas
    if (selTurma) {
      var atual = selTurma.value || '__todas__';
      var setTurmas = {};
      for (var i = 0; i < alunos.length; i++) {
        var t = (alunos[i].turma || '').trim();
        if (t) setTurmas[t] = true;
      }
      var turmas = Object.keys(setTurmas).sort();
      var opts = '<option value="__todas__">Todas</option>';
      for (var j = 0; j < turmas.length; j++) opts += '<option>' + turmas[j] + '</option>';
      selTurma.innerHTML = opts;
      selTurma.value = atual;
    }
    // Disciplinas
    if (selDisc) {
      var atualD = selDisc.value || '__todas__';
      var setDisc = {};
      for (var p = 0; p < professores.length; p++) {
        var d = (professores[p].disc || '').trim();
        if (d) setDisc[d] = true;
      }
      var discs = Object.keys(setDisc).sort();
      var optsD = '<option value="__todas__">Todas</option>';
      for (var r = 0; r < discs.length; r++) optsD += '<option>' + discs[r] + '</option>';
      selDisc.innerHTML = optsD;
      selDisc.value = atualD;
    }
  }

  function renderListas() {
    var termo = inpBuscaNome ? (inpBuscaNome.value || '').toLowerCase().trim() : '';

    // Alunos
    var tbA = document.getElementById('tbodyAlunos');
    if (tbA) {
      var filtroT = selTurma ? (selTurma.value || '__todas__') : '__todas__';
      tbA.innerHTML = '';
      for (var i = 0; i < alunos.length; i++) {
        var a = alunos[i];
        var nomeA = (a.nome || '');
        if (termo && nomeA.toLowerCase().indexOf(termo) === -1) continue;
        if (filtroT !== '__todas__' && (a.turma || '') !== filtroT) continue;
        var tr = document.createElement('tr');

        var detalhesTd = '<td>' +
          '<button class="btn btn-sm btn-outline-info btn-detalhes" data-tipo="aluno" data-idx="' + i + '">Detalhes</button>' +
        '</td>';

        var acaoTd = '';
        if (isAdmin) {
          acaoTd = '<td>' +
            '<button class="btn btn-sm btn-outline-secondary me-1 btn-editar" data-tipo="aluno" data-idx="' + i + '">Editar</button>' +
            '<button class="btn btn-sm btn-outline-danger btn-excluir" data-tipo="aluno" data-idx="' + i + '">Excluir</button>' +
          '</td>';
        }

        tr.innerHTML =
          '<td>' + nomeA + '</td>' +
          '<td>' + (a.email || '') + '</td>' +
          '<td>' + (a.turma || '—') + '</td>' +
          detalhesTd +
          acaoTd;
        tbA.appendChild(tr);
      }
    }

    // Professores
    var tbP = document.getElementById('tbodyProfessores');
    if (tbP) {
      var filtroD = selDisc ? (selDisc.value || '__todas__') : '__todas__';
      tbP.innerHTML = '';
      for (var j = 0; j < professores.length; j++) {
        var p2 = professores[j];
        var nomeP = (p2.nome || '');
        if (termo && nomeP.toLowerCase().indexOf(termo) === -1) continue;
        if (filtroD !== '__todas__' && (p2.disc || '') !== filtroD) continue;

        var detalhesTdP = '<td>' +
          '<button class="btn btn-sm btn-outline-info btn-detalhes" data-tipo="professor" data-idx="' + j + '">Detalhes</button>' +
        '</td>';

        var acaoP = '';
        if (isAdmin) {
          acaoP = '<td>' +
            '<button class="btn btn-sm btn-outline-secondary me-1 btn-editar" data-tipo="professor" data-idx="' + j + '">Editar</button>' +
            '<button class="btn btn-sm btn-outline-danger btn-excluir" data-tipo="professor" data-idx="' + j + '">Excluir</button>' +
          '</td>';
        }

        var trp = document.createElement('tr');
        trp.innerHTML =
          '<td>' + nomeP + '</td>' +
          '<td>' + (p2.email || '') + '</td>' +
          '<td>' + (p2.disc || '—') + '</td>' +
          detalhesTdP +
          acaoP;
        tbP.appendChild(trp);
      }
    }
  }

  // === Modal Detalhes + Editar/Excluir ===
  var secListagem = document.getElementById('sec-listagem');
  var modalEditarEl = document.getElementById('modalEditar');
  var formModal = document.getElementById('formModalEditar');
  var modalEditar;
  var modalDetalhesEl = document.getElementById('modalDetalhes');
  var detalhesConteudo = document.getElementById('detalhesConteudo');
  var modalDetalhes;

  if (secListagem) {
    secListagem.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button') : e.target;
      if (!btn || !btn.getAttribute) return;

      var isEditar = btn.classList.contains('btn-editar');
      var isExcluir = btn.classList.contains('btn-excluir');
      var isDetalhes = btn.classList.contains('btn-detalhes');

      if (isDetalhes) {
        var tipoD = btn.getAttribute('data-tipo');
        var idxD = parseInt(btn.getAttribute('data-idx'), 10);
        abrirModalDetalhes(tipoD, idxD);
        return;
      }

      if (!isAdmin && (isEditar || isExcluir)) return;

      if (isExcluir) {
        var tipoX = btn.getAttribute('data-tipo');
        var idx = parseInt(btn.getAttribute('data-idx'), 10);
        var nomeEnt = (tipoX === 'aluno')
          ? (alunos[idx] && alunos[idx].nome)
          : (professores[idx] && professores[idx].nome);
        if (confirm('Excluir ' + tipoX + ' "' + nomeEnt + '"?')) {
          if (tipoX === 'aluno') {
            alunos.splice(idx,1);
            gravarJSON(KEY_ALUNOS, alunos);
          } else {
            professores.splice(idx,1);
            gravarJSON(KEY_PROFS, professores);
          }
          atualizarFiltros();
          atualizarSelTurmas(selTurmaNotas);
          atualizarNotas();
          atualizarGraficos();
          renderListas();
        }
        return;
      }

      if (isEditar) {
        abrirModalEditar(btn.getAttribute('data-tipo'), parseInt(btn.getAttribute('data-idx'),10));
      }
    });
  }

  function abrirModalDetalhes(tipoD, idxD) {
    if (!detalhesConteudo) return;
    var html = '';
    if (tipoD === 'aluno') {
      var a = alunos[idxD] || {};
      html =
        '<p><strong>Nome:</strong> ' + (a.nome || '') + '</p>' +
        '<p><strong>E-mail:</strong> ' + (a.email || '') + '</p>' +
        '<p><strong>RA:</strong> ' + (a.ra || '—') + '</p>' +
        '<p><strong>Turma:</strong> ' + (a.turma || '—') + '</p>' +
        '<p><strong>Data de nascimento:</strong> ' + (a.nasc || '—') + '</p>';
    } else {
      var p = professores[idxD] || {};
      html =
        '<p><strong>Nome:</strong> ' + (p.nome || '') + '</p>' +
        '<p><strong>E-mail:</strong> ' + (p.email || '') + '</p>' +
        '<p><strong>Disciplina:</strong> ' + (p.disc || '—') + '</p>' +
        '<p><strong>Data de nascimento:</strong> ' + (p.nasc || '—') + '</p>';
    }
    detalhesConteudo.innerHTML = html;

    if (!modalDetalhes) modalDetalhes = new bootstrap.Modal(modalDetalhesEl);
    modalDetalhes.show();
  }

  function abrirModalEditar(tipoX, idx) {
    document.getElementById('modalTipo').value = tipoX;
    document.getElementById('modalIndex').value = String(idx);
    var titulo = document.getElementById('modalTitulo');
    var grupoAluno = document.getElementById('grupoAluno');
    var grupoProfessor = document.getElementById('grupoProfessor');

    if (tipoX === 'aluno') {
      titulo.textContent = 'Editar Aluno';
      grupoAluno.classList.remove('d-none');
      grupoProfessor.classList.add('d-none');
      var a = alunos[idx] || {};
      document.getElementById('mAlunoNome').value  = a.nome  || '';
      document.getElementById('mAlunoEmail').value = a.email || '';
      document.getElementById('mAlunoRA').value    = a.ra    || '';
      document.getElementById('mAlunoTurma').value = a.turma || '';
      document.getElementById('mAlunoNasc').value  = a.nasc  || '';
    } else {
      titulo.textContent = 'Editar Professor';
      grupoProfessor.classList.remove('d-none');
      grupoAluno.classList.add('d-none');
      var p = professores[idx] || {};
      document.getElementById('mProfNome').value  = p.nome  || '';
      document.getElementById('mProfEmail').value = p.email || '';
      document.getElementById('mProfDisc').value  = p.disc  || '';
      document.getElementById('mProfNasc').value  = p.nasc  || '';
    }

    modalEditar = modalEditar || new bootstrap.Modal(modalEditarEl);
    modalEditar.show();
  }

  if (formModal) {
    formModal.addEventListener('submit', function (e) {
      e.preventDefault();
      var tipoX = document.getElementById('modalTipo').value;
      var idx = parseInt(document.getElementById('modalIndex').value, 10);

      if (tipoX === 'aluno') {
        var n  = (document.getElementById('mAlunoNome').value || '').trim();
        var em = (document.getElementById('mAlunoEmail').value || '').trim();
        var ra = (document.getElementById('mAlunoRA').value || '').trim();
        var tu = (document.getElementById('mAlunoTurma').value || '').trim();
        var dn = (document.getElementById('mAlunoNasc').value || '').trim();
        if (!n || !em || !ra || !tu || !dn) return;
        var notas = normalizarNotasAluno(alunos[idx]);
        alunos[idx] = { nome: n, email: em, ra: ra, turma: tu, nasc: dn, notas: notas };
        gravarJSON(KEY_ALUNOS, alunos);
      } else {
        var np = (document.getElementById('mProfNome').value || '').trim();
        var ep = (document.getElementById('mProfEmail').value || '').trim();
        var dp = (document.getElementById('mProfDisc').value || '').trim();
        var dnP = (document.getElementById('mProfNasc').value || '').trim();
        if (!np || !ep || !dp || !dnP) return;
        professores[idx] = { nome: np, email: ep, disc: dp, nasc: dnP };
        gravarJSON(KEY_PROFS, professores);
      }

      if (modalEditar) modalEditar.hide();
      atualizarFiltros();
      atualizarSelTurmas(selTurmaNotas);
      atualizarNotas();
      atualizarGraficos();
      renderListas();
    });
  }

  // === Gráficos ===
  var chartNotas;
  function atualizarGraficos() {
    var msg = document.getElementById('grafMsg');
    var canvas = document.getElementById('chartNotas');
    var titulo = document.getElementById('tituloGraficos');
    var subtitulo = document.getElementById('subtituloGraficos');
    if (!canvas) return;

    if (msg) msg.textContent = '';
    if (subtitulo) subtitulo.textContent = '';

    if (chartNotas) {
      chartNotas.destroy();
      chartNotas = null;
    }

    var labels = [];
    var dados = [];
    var tipoGrafico = 'bar';
    var labelDataset = '';

    if (isAluno) {
      if (!alunoAtual) {
        if (msg) msg.textContent = 'Nenhum aluno associado ao usuário logado.';
        return;
      }
      var notasNorm = normalizarNotasAluno(alunoAtual);
      var porDisc = {};
      for (var i = 0; i < notasNorm.length; i++) {
        var d = notasNorm[i].disciplina || 'Geral';
        if (!porDisc[d]) porDisc[d] = [];
        porDisc[d].push(notasNorm[i].valor);
      }
      var discs = Object.keys(porDisc);
      if (!discs.length) {
        if (msg) msg.textContent = 'Você ainda não possui notas registradas.';
        return;
      }
      labels = discs;
      for (var j = 0; j < discs.length; j++) {
        var m = media(porDisc[discs[j]]);
        dados.push(m == null ? 0 : Number(m.toFixed(2)));
      }
      tipoGrafico = 'bar';
      labelDataset = 'Média por disciplina';
      if (titulo) titulo.textContent = 'Suas notas por disciplina';
      if (subtitulo) subtitulo.textContent = 'Cada coluna representa a sua média em uma disciplina.';
    } else if (isProfessor) {
      if (!disciplinaProfessorAtual) {
        if (msg) msg.textContent = 'Nenhuma disciplina associada ao professor logado.';
        if (titulo) titulo.textContent = 'Gráficos de Desempenho';
        return;
      }
      var turmasNotas = {};
      for (var a = 0; a < alunos.length; a++) {
        var al = alunos[a];
        if (!al.turma) continue;
        var ns = notasDaDisciplina(al, disciplinaProfessorAtual);
        if (!ns.length) continue;
        if (!turmasNotas[al.turma]) turmasNotas[al.turma] = [];
        for (var n = 0; n < ns.length; n++) turmasNotas[al.turma].push(ns[n]);
      }
      var turmas = Object.keys(turmasNotas).sort();
      if (!turmas.length) {
        if (msg) msg.textContent = 'Ainda não há notas para a disciplina "' + disciplinaProfessorAtual + '".';
        if (titulo) titulo.textContent = 'Médias por turma';
        return;
      }
      labels = turmas;
      for (var t2 = 0; t2 < turmas.length; t2++) {
        var mt = media(turmasNotas[t2]);
        dados.push(mt == null ? 0 : Number(mt.toFixed(2)));
      }
      tipoGrafico = 'line';
      labelDataset = 'Média das turmas';
      if (titulo) titulo.textContent = 'Médias por turma — ' + disciplinaProfessorAtual;
      if (subtitulo) subtitulo.textContent = 'Cada ponto representa a média das notas por turma, apenas da sua disciplina.';
    } else {
      // Admin: visão geral
      var setTurmas = {};
      for (var ai = 0; ai < alunos.length; ai++) {
        if (alunos[ai].turma) setTurmas[alunos[ai].turma] = true;
      }
      var turmasAdm = Object.keys(setTurmas).sort();
      if (!turmasAdm.length) {
        if (msg) msg.textContent = 'Nenhuma turma cadastrada.';
        if (titulo) titulo.textContent = 'Gráficos de Desempenho';
        return;
      }
      labels = turmasAdm;
      for (var ta = 0; ta < turmasAdm.length; ta++) {
        var notasT = [];
        for (var ia = 0; ia < alunos.length; ia++) {
          if (alunos[ia].turma === turmasAdm[ta]) {
            var nsG = normalizarNotasAluno(alunos[ia]);
            for (var ng = 0; ng < nsG.length; ng++) {
              notasT.push(nsG[ng].valor);
            }
          }
        }
        var mg = media(notasT);
        dados.push(mg == null ? 0 : Number(mg.toFixed(2)));
      }
      tipoGrafico = 'bar';
      labelDataset = 'Média geral das turmas';
      if (titulo) titulo.textContent = 'Média geral das turmas';
      if (subtitulo) subtitulo.textContent = 'Visão geral para administração.';
    }

    var cfg = {
      labels: labels,
      datasets: [{
        label: labelDataset,
        data: dados
      }]
    };

    var opt = {
      responsive: true,
      scales: {
        y: { beginAtZero: true, suggestedMax: 10 }
      }
    };

    chartNotas = new Chart(canvas, { type: tipoGrafico, data: cfg, options: opt });
    if (msg && !msg.textContent) msg.textContent = 'Passe o mouse sobre os pontos/colunas para ver os valores.';
  }

  // === Notas (professor só na própria disciplina) ===
  var selTurmaNotas = document.getElementById('selTurmaNotas');
  var tbodyNotas = document.getElementById('tbodyNotas');

  if (selTurmaNotas) selTurmaNotas.addEventListener('change', atualizarNotas);

  function atualizarSelTurmas(el) {
    if (!el) return;
    var atual = el.value || '__selecione__';
    var setT = {};
    for (var i = 0; i < alunos.length; i++) {
      var t = (alunos[i].turma || '').trim();
      if (t) setT[t] = true;
    }
    var turmas = Object.keys(setT).sort();
    var opts = '<option value="__selecione__">Selecione...</option>';
    for (var j = 0; j < turmas.length; j++) opts += '<option>' + turmas[j] + '</option>';
    el.innerHTML = opts;
    el.value = atual;
  }

  function atualizarNotas() {
    if (!tbodyNotas) return;
    var turma = selTurmaNotas ? (selTurmaNotas.value || '__selecione__') : '__selecione__';
    tbodyNotas.innerHTML = '';
    var lista = [];
    for (var i = 0; i < alunos.length; i++) {
      var a = alunos[i];
      if (turma !== '__selecione__' && (a.turma || '') !== turma) continue;
      lista.push({ idx: i, aluno: a });
    }
    if (!lista.length) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="6" class="text-center text-body-secondary">Nenhum aluno encontrado.</td>';
      tbodyNotas.appendChild(tr);
      return;
    }

    var disc = disciplinaProfessorAtual || null;

    for (var j = 0; j < lista.length; j++) {
      var aobj = lista[j];
      var notasNorm = normalizarNotasAluno(aobj.aluno);

      var chips = '';
      for (var n = 0; n < notasNorm.length; n++) {
        if (isProfessor && disc && notasNorm[n].disciplina !== disc) continue; // professor só vê notas da própria disciplina
        var valorNota = notasNorm[n].valor;
        chips += '<span class="badge text-bg-secondary me-1 mb-1">' +
          Number(valorNota).toFixed(1) +
          ' <button type="button" class="btn btn-sm btn-link text-white p-0 ms-1 btn-rem-nota" data-aidx="' + aobj.idx + '" data-nidx="' + n + '" title="Remover">×</button>' +
        '</span>';
      }

      var notasParaMedia = [];
      for (var nm = 0; nm < notasNorm.length; nm++) {
        if (isProfessor && disc && notasNorm[nm].disciplina !== disc) continue;
        notasParaMedia.push(notasNorm[nm].valor);
      }
      var mediaValor = media(notasParaMedia);

      var formNota =
        '<div class="input-group input-group-sm" style="max-width:180px;">' +
          '<input type="number" class="form-control form-control-sm inp-nova-nota" min="0" max="10" step="0.1" placeholder="Ex.: 7.5" data-aidx="' + aobj.idx + '">' +
          '<button class="btn btn-primary btn-add-nota" data-aidx="' + aobj.idx + '">Adicionar</button>' +
        '</div>';

      if (!isProfessor) {
        // Admin não deve adicionar notas se quiser seguir estrito,
        // mas vamos apenas desabilitar visualmente o botão.
        formNota =
          '<div class="text-body-secondary small">Somente professores podem lançar notas.</div>';
      }

      var tr2 = document.createElement('tr');
      tr2.innerHTML =
        '<td>' + aobj.aluno.nome + '</td>' +
        '<td>' + aobj.aluno.ra + '</td>' +
        '<td>' + (aobj.aluno.turma || '—') + '</td>' +
        '<td>' + (chips || '<span class="text-body-secondary">— sem notas —</span>') + '</td>' +
        '<td>' + formNota + '</td>' +
        '<td>' + (mediaValor == null ? '—' : mediaValor.toFixed(2)) + '</td>';
      tbodyNotas.appendChild(tr2);
    }
  }

  if (tbodyNotas) {
    tbodyNotas.addEventListener('click', function (e) {
      var add = e.target.classList && e.target.classList.contains('btn-add-nota');
      var rem = e.target.classList && e.target.classList.contains('btn-rem-nota');

      if (add) {
        if (!isProfessor) return;
        if (!disciplinaProfessorAtual) {
          alert('Nenhuma disciplina associada ao professor logado.');
          return;
        }
        var aidx = parseInt(e.target.getAttribute('data-aidx'),10);
        var inp = tbodyNotas.querySelector('.inp-nova-nota[data-aidx="' + aidx + '"]');
        var val = parseFloat((inp && inp.value ? inp.value : '').replace(',', '.'));
        if (isNaN(val) || val < 0 || val > 10) {
          alert('Informe uma nota válida entre 0 e 10.');
          return;
        }
        var notas = normalizarNotasAluno(alunos[aidx]);
        notas.push({ disciplina: disciplinaProfessorAtual, valor: Number(val) });
        alunos[aidx].notas = notas;
        gravarJSON(KEY_ALUNOS, alunos);
        inp.value = '';
        atualizarNotas();
        atualizarGraficos();
      }

      if (rem) {
        if (!isProfessor) return;
        var aidx2 = parseInt(e.target.getAttribute('data-aidx'),10);
        var nidx = parseInt(e.target.getAttribute('data-nidx'),10);
        var notas2 = normalizarNotasAluno(alunos[aidx2]);
        if (nidx >= 0 && nidx < notas2.length) {
          if (!disciplinaProfessorAtual || notas2[nidx].disciplina !== disciplinaProfessorAtual) return;
          notas2.splice(nidx,1);
          alunos[aidx2].notas = notas2;
          gravarJSON(KEY_ALUNOS, alunos);
          atualizarNotas();
          atualizarGraficos();
        }
      }
    });
  }

  // === Calendário fullcalendar ===
  var calEl = document.getElementById('calendario');
  if (calEl && window.FullCalendar) {
    calendar = new FullCalendar.Calendar(calEl, {
      initialView: 'dayGridMonth',
      height: 'auto',
      headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
      selectable: false,
      editable: !!isProfessor,
      events: eventosStore,
      eventClick: function(info) {
        if (!isProfessor) return;
        var ev = info.event;
        var novo = prompt('Editar título (deixe vazio para excluir):', ev.title);
        if (novo === null) return;
        if (novo === '') {
          if (confirm('Excluir este evento?')) {
            ev.remove();
            salvarEventos(calendar);
            salvarNotificacaoAlteracao(ev, 'excluido');
          }
        } else {
          ev.setProp('title', novo);
          salvarEventos(calendar);
          salvarNotificacaoAlteracao(ev, 'editado');
        }
      },
      eventDrop: function(info){
        if (!isProfessor) return;
        salvarEventos(calendar);
        salvarNotificacaoAlteracao(info.event, 'movido');
      },
      eventResize: function(info){
        if (!isProfessor) return;
        salvarEventos(calendar);
        salvarNotificacaoAlteracao(info.event, 'datas_alteradas');
      }
    });

    var btnAddEvento = document.getElementById('btnAddEvento');
    var modalEventoEl = document.getElementById('modalEvento');
    var formEvento = document.getElementById('formEvento');
    var modalEvento;

    if (!isProfessor && btnAddEvento) {
      btnAddEvento.classList.add('d-none');
    }

    if (isProfessor && btnAddEvento) {
      btnAddEvento.addEventListener('click', function () {
        if (!modalEvento) modalEvento = new bootstrap.Modal(modalEventoEl);
        if (formEvento) formEvento.reset();
        modalEvento.show();
      });

      if (formEvento) {
        formEvento.addEventListener('submit', function (e) {
          e.preventDefault();
          var title = (document.getElementById('evtTitulo').value || '').trim();
          var start = document.getElementById('evtInicio').value;
          var end = document.getElementById('evtFim').value;
          if (!title || !start) {
            alert('Preencha pelo menos o título e a data inicial.');
            return;
          }
          var ev = { id: 'ev-' + Date.now(), title: title, start: start };
          if (end) ev.end = end;
          calendar.addEvent(ev);
          salvarEventos(calendar);
          if (modalEvento) modalEvento.hide();
          salvarNotificacao({ id: ev.id, title: ev.title, startStr: ev.start }, 'novo');
        });
      }
    }

    function salvarEventos(cal) {
      var evs = cal.getEvents();
      var arr = [];
      for (var i = 0; i < evs.length; i++) {
        var e = evs[i];
        arr.push({
          id: e.id,
          title: e.title,
          start: e.startStr || (e.start ? e.start.toISOString() : null),
          end: e.endStr || (e.end ? e.end.toISOString() : null),
          allDay: !!e.allDay
        });
      }
      gravarJSON(KEY_EVENTOS, arr);
      atualizarListaEventos();
    }
  }

  // === Inicialização final ===
  atualizarFiltros();
  renderListas();
  atualizarSelTurmas(selTurmaNotas);
  atualizarNotas();
  atualizarGraficos();
  mostrarNotifsNovasAluno();
})();
