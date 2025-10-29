(function () {
  var usuario = localStorage.getItem('usuarioLogado') || '';
  var tipo = localStorage.getItem('tipoUsuario') || '';
  var isAdmin = (tipo === 'administrador');
  var isProfessor = (tipo === 'professor');
  var isAluno = (!isAdmin && !isProfessor);

  var nomeUsuario = document.getElementById('nomeUsuario');
  if (nomeUsuario) { nomeUsuario.textContent = usuario; }

  // Tema Claro/Escuro
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

  // Botão sair
  var btnSair = document.getElementById('btnSair');
  if (btnSair) {
    btnSair.addEventListener('click', function () {
      localStorage.removeItem('usuarioLogado');
      localStorage.removeItem('tipoUsuario');
      window.location.href = 'index.html';
    });
  }

  // Menu dependendo do usuário
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
      var fallback = document.querySelector('#menu .nav-link[data-section="sec-listagem"]');
      if (fallback) {
        fallback.classList.add('active');
        var secs = document.querySelectorAll('.sec');
        for (var j = 0; j < secs.length; j++) secs[j].classList.add('d-none');
        var sl = document.getElementById('sec-listagem');
        if (sl) sl.classList.remove('d-none');
      }
    }
  }
  esconderSecoesPorPerfil();

  // Navegação entre usuários
  var links = document.querySelectorAll('#menu .nav-link');
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
    });
  }

  // Armazenamento local
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

  // Notificações
  var listaNotificacoes = document.getElementById('listaNotificacoes');

  function salvarNotificacao(ev) {
    var notifs = lerJSON(KEY_NOTIFS);
    notifs.push({
      id: 'ntf-' + Date.now(),
      eventoId: ev.id,
      titulo: ev.title,
      inicio: ev.startStr || (ev.start && ev.start.toISOString ? ev.start.toISOString().slice(0,10) : ''),
      criadoEm: new Date().toISOString()
    });
    gravarJSON(KEY_NOTIFS, notifs);
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
    // Ultimas 10 notificações
    var inicio = Math.max(0, novas.length - 10);
    for (var u = inicio; u < novas.length; u++) {
      var n = novas[u];
      var dataTxt = n.inicio ? (' em ' + n.inicio) : '';
      renderToast('Novo evento: <b>' + n.titulo + '</b>' + dataTxt + '.');
      vistas.push(n.id);
    }
    localStorage.setItem(KEY_VISTAS, JSON.stringify(vistas));
  }

  // Cadastro de Alunos
  var formAluno = document.getElementById('formAluno');
  if (formAluno) {
    formAluno.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome  = (document.getElementById('alunoNome').value || '').trim();
      var email = (document.getElementById('alunoEmail').value || '').trim();
      var ra    = (document.getElementById('alunoRA').value || '').trim();
      var turma = (document.getElementById('alunoTurma').value || '').trim();
      var fb = document.getElementById('fbAluno');
      if (!nome || !email || !ra || !turma) {
        setFb(fb, 'Preencha todos os campos.', true);
        return;
      }

      alunos.push({ nome: nome, email: email, ra: ra, turma: turma, notas: [] });
      gravarJSON(KEY_ALUNOS, alunos);
      formAluno.reset();
      setFb(fb, 'Aluno cadastrado!', false);
      atualizarFiltros();
      atualizarGraficos();
      atualizarNotas();
      renderListas();
    });
  }

  // Cadastro de Professores
  var formProfessor = document.getElementById('formProfessor');
  if (formProfessor) {
    formProfessor.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome  = (document.getElementById('profNome').value || '').trim();
      var email = (document.getElementById('profEmail').value || '').trim();
      var depto = (document.getElementById('profDepto').value || '').trim();
      var fb = document.getElementById('fbProfessor');
      if (!nome || !email || !depto) {
        setFb(fb, 'Preencha todos os campos.', true); 
        return;
      }

      professores.push({ nome: nome, email: email, depto: depto });
      gravarJSON(KEY_PROFS, professores);
      formProfessor.reset();
      setFb(fb, 'Professor cadastrado!', false);
      atualizarFiltros();
      renderListas();
    });
  }

  function setFb(el, msg, erro) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'small mt-1 ' + (erro ? 'text-danger' : 'text-success');
  }

  // Lista com filtros
  var selTurma = document.getElementById('selTurma');
  var selDisc  = document.getElementById('selDisciplina');
  var filtroTurmaWrap = document.getElementById('filtroTurmaWrap');
  var filtroDiscWrap  = document.getElementById('filtroDiscWrap');

  if (selTurma) selTurma.addEventListener('change', renderListas);
  if (selDisc)  selDisc.addEventListener('change', renderListas);

  var tabs = document.querySelectorAll('#tabsListagem .nav-link');
  for (var t = 0; t < tabs.length; t++) {
    tabs[t].addEventListener('click', function () {
      for (var q = 0; q < tabs.length; q++) tabs[q].classList.remove('active');
      this.classList.add('active');
      var panes = document.querySelectorAll('.tab-pane');
      for (var w = 0; w < panes.length; w++) panes[w].classList.remove('show','active');
      var pane = document.getElementById(this.getAttribute('data-target'));
      if (pane) pane.classList.add('show','active');

      var alunosAtivo = (this.getAttribute('data-target') === 'tab-alunos');
      if (filtroTurmaWrap) filtroTurmaWrap.classList.toggle('d-none', !alunosAtivo);
      if (filtroDiscWrap) filtroDiscWrap.classList.toggle('d-none', alunosAtivo);
    });
  }

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
      if (atual) selTurma.value = atual;
    }
    // Disciplinas
    if (selDisc) {
      var atualD = selDisc.value || '__todas__';
      var setDisc = {};
      for (var p = 0; p < professores.length; p++) {
        var d = (professores[p].depto || '').trim();
        if (d) setDisc[d] = true;
      }
      var discs = Object.keys(setDisc).sort();
      var optsD = '<option value="__todas__">Todas</option>';
      for (var r = 0; r < discs.length; r++) optsD += '<option>' + discs[r] + '</option>';
      selDisc.innerHTML = optsD;
      if (atualD) selDisc.value = atualD;
    }
  }

  function renderListas() {
    // Lista de alunos
    var tbA = document.getElementById('tbodyAlunos');
    if (tbA) {
      var filtroT = selTurma ? (selTurma.value || '__todas__') : '__todas__';
      tbA.innerHTML = '';
      for (var i = 0; i < alunos.length; i++) {
        var a = alunos[i];
        if (filtroT !== '__todas__' && (a.turma || '') !== filtroT) continue;
        var tr = document.createElement('tr');
        var acaoTd = '';
        if (isAdmin) {
          acaoTd = '<td>' +
            '<button class="btn btn-sm btn-outline-secondary me-1 btn-editar" data-tipo="aluno" data-idx="' + i + '">Editar</button>' +
            '<button class="btn btn-sm btn-outline-danger btn-excluir" data-tipo="aluno" data-idx="' + i + '">Excluir</button>' +
          '</td>';
        }
        tr.innerHTML = '<td>' + a.nome + '</td>' +
                       '<td>' + a.email + '</td>' +
                       '<td>' + a.ra + '</td>' +
                       '<td>' + (a.turma || '—') + '</td>' +
                       acaoTd;
        tbA.appendChild(tr);
      }
    }
    // Lista de professores
    var tbP = document.getElementById('tbodyProfessores');
    if (tbP) {
      var filtroD = selDisc ? (selDisc.value || '__todas__') : '__todas__';
      tbP.innerHTML = '';
      for (var j = 0; j < professores.length; j++) {
        var p = professores[j];
        if (filtroD !== '__todas__' && (p.depto || '') !== filtroD) continue;
        var trp = document.createElement('tr');
        var acaoP = '';
        if (isAdmin) {
          acaoP = '<td>' +
            '<button class="btn btn-sm btn-outline-secondary me-1 btn-editar" data-tipo="professor" data-idx="' + j + '">Editar</button>' +
            '<button class="btn btn-sm btn-outline-danger btn-excluir" data-tipo="professor" data-idx="' + j + '">Excluir</button>' +
          '</td>';
        }
        trp.innerHTML = '<td>' + p.nome + '</td><td>' + p.email + '</td><td>' + (p.depto || '—') + '</td>' + acaoP;
        tbP.appendChild(trp);
      }
    }
  }

  // Editar/Excluir
  var secListagem = document.getElementById('sec-listagem');
  if (secListagem) {
    secListagem.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button') : e.target;
      if (!btn || !btn.getAttribute) return;
      var isEditar = btn.classList.contains('btn-editar');
      var isExcluir = btn.classList.contains('btn-excluir');
      if (!isAdmin && (isEditar || isExcluir)) return;

      if (isExcluir) {
        var tipoX = btn.getAttribute('data-tipo');
        var idx = parseInt(btn.getAttribute('data-idx'), 10);
        var nomeEnt = (tipoX === 'aluno') ? (alunos[idx] && alunos[idx].nome) : (professores[idx] && professores[idx].nome);
        if (confirm('Excluir ' + tipoX + ' "' + nomeEnt + '"?')) {
          if (tipoX === 'aluno') {
            alunos.splice(idx,1);
            gravarJSON(KEY_ALUNOS, alunos);
          } else {
              professores.splice(idx,1);
              gravarJSON(KEY_PROFS, professores);
          }
          atualizarFiltros();
          atualizarGraficos();
          atualizarNotas();
          renderListas();
        }
        return;
      }

      if (isEditar) {
        abrirModalEditar(btn.getAttribute('data-tipo'), parseInt(btn.getAttribute('data-idx'),10));
      }
    });
  }

  // Modal de edição
  var modalEl = document.getElementById('modalEditar');
  var formModal = document.getElementById('formModalEditar');
  var modal;
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
    } else {
      titulo.textContent = 'Editar Professor';
      grupoProfessor.classList.remove('d-none');
      grupoAluno.classList.add('d-none');
      var p = professores[idx] || {};
      document.getElementById('mProfNome').value  = p.nome  || '';
      document.getElementById('mProfEmail').value = p.email || '';
      document.getElementById('mProfDepto').value = p.depto || '';
    }

    modal = modal || new bootstrap.Modal(modalEl);
    modal.show();
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
        if (!n || !em || !ra || !tu) return;
        var notas = Array.isArray(alunos[idx].notas) ? alunos[idx].notas : [];
        alunos[idx] = { nome: n, email: em, ra: ra, turma: tu, notas: notas };
        gravarJSON(KEY_ALUNOS, alunos);
      } else {
        var np = (document.getElementById('mProfNome').value || '').trim();
        var ep = (document.getElementById('mProfEmail').value || '').trim();
        var dp = (document.getElementById('mProfDepto').value || '').trim();
        if (!np || !ep || !dp) return;
        professores[idx] = { nome: np, email: ep, depto: dp };
        gravarJSON(KEY_PROFS, professores);
      }

      if (modal) modal.hide();
      atualizarFiltros();
      atualizarGraficos();
      atualizarNotas();
      renderListas();
    });
  }

  // Gráficos
  var selTurmaGraf = document.getElementById('selTurmaGraf');
  if (selTurmaGraf) selTurmaGraf.addEventListener('change', atualizarGraficos);
  var chartNotas;

  function media(arr) {
    if (!arr || !arr.length) return null;
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }

  function atualizarGraficos() {
    var msg = document.getElementById('grafMsg');
    var canvas = document.getElementById('chartNotas');
    if (!canvas) return;

    var turma = selTurmaGraf ? (selTurmaGraf.value || '__selecione__') : '__selecione__';
    var labels = [];
    var dados = [];

    if (turma === '__selecione__') {
      // Médias por turma
      var setTurmas = {};
      for (var i = 0; i < alunos.length; i++) {
        if (alunos[i].turma) setTurmas[alunos[i].turma] = true;
      }
      var turmas = Object.keys(setTurmas).sort();
      if (!turmas.length) {
        if (msg) msg.textContent = 'Nenhuma turma cadastrada.';
        if (chartNotas) {
          chartNotas.destroy(); chartNotas = null;
        }
        return;
      }
      labels = turmas;
      for (var t = 0; t < turmas.length; t++) {
        var notasT = [];
        for (var a = 0; a < alunos.length; a++) {
          if (alunos[a].turma === turmas[t] && Array.isArray(alunos[a].notas)) {
            for (var n = 0; n < alunos[a].notas.length; n++) {
              if (typeof alunos[a].notas[n] === 'number') notasT.push(alunos[a].notas[n]);
            }
          }
        }
        var m = media(notasT);
        dados.push(m == null ? 0 : Number(m.toFixed(2)));
      }
      if (msg) msg.textContent = 'Médias gerais de todas as turmas.';
    } else {
      // Médias por Aluno
      var alunosTurma = [];
      for (var i2 = 0; i2 < alunos.length; i2++) {
        if (alunos[i2].turma === turma) alunosTurma.push(alunos[i2]);
      }
      if (!alunosTurma.length) {
        if (msg) msg.textContent = 'Nenhum aluno encontrado nessa turma.';
        if (chartNotas) {
          chartNotas.destroy(); chartNotas = null;
        }
        return;
      }
      for (var k2 = 0; k2 < alunosTurma.length; k2++) {
        labels.push(alunosTurma[k2].nome);
        var v = null;
        if (Array.isArray(alunosTurma[k2].notas)) {
          var nums = [];
          for (var x = 0; x < alunosTurma[k2].notas.length; x++) {
            if (typeof alunosTurma[k2].notas[x] === 'number') nums.push(alunosTurma[k2].notas[x]);
          }
          v = media(nums);
        }
        dados.push(v == null ? 0 : Number(v.toFixed(2)));
      }
      if (msg) msg.textContent = 'Turma ' + turma + ' — médias individuais dos alunos.';
    }

    var cfg = {
      labels: labels,
      datasets: [{ label: (turma === '__selecione__' ? 'Média das Turmas' : ('Média — ' + turma)), data: dados, backgroundColor: '#0d6efd80' }]
    };
    var opt = {
      responsive: true, scales: { y: { beginAtZero: true, suggestedMax: 10 }}
    };

    if (chartNotas) {
      chartNotas.data = cfg; chartNotas.options = opt; chartNotas.update();
    } else {
      chartNotas = new Chart(canvas, { type: 'bar', data: cfg, options: opt });
    }
  }

  // Notas
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
    for (var j = 0; j < lista.length; j++) {
      var aobj = lista[j];
      var notas = Array.isArray(aobj.aluno.notas) ? aobj.aluno.notas : [];
      var chips = '';
      for (var n = 0; n < notas.length; n++) {
        chips += '<span class="badge text-bg-secondary me-1 mb-1">' +
                 Number(notas[n]).toFixed(1) +
                 ' <button type="button" class="btn btn-sm btn-link text-white p-0 ms-1 btn-rem-nota" data-aidx="' + aobj.idx + '" data-nidx="' + n + '" title="Remover">×</button>' +
                 '</span>';
      }
      var mediaValor = null;
      if (notas.length) {
        var soma = 0;
        for (var s = 0; s < notas.length; s++) soma += notas[s];
        mediaValor = soma / notas.length;
      }
      var tr2 = document.createElement('tr');
      tr2.innerHTML =
        '<td>' + aobj.aluno.nome + '</td>' +
        '<td>' + aobj.aluno.ra + '</td>' +
        '<td>' + (aobj.aluno.turma || '—') + '</td>' +
        '<td>' + (chips || '<span class="text-body-secondary">— sem notas —</span>') + '</td>' +
        '<td><div class="input-group input-group-sm" style="max-width:180px;">' +
          '<input type="number" class="form-control form-control-sm inp-nova-nota" min="0" max="10" step="0.1" placeholder="Ex.: 7.5" data-aidx="' + aobj.idx + '">' +
          '<button class="btn btn-primary btn-add-nota" data-aidx="' + aobj.idx + '">Adicionar</button>' +
        '</div></td>' +
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
        var aidx = parseInt(e.target.getAttribute('data-aidx'),10);
        var inp = tbodyNotas.querySelector('.inp-nova-nota[data-aidx="' + aidx + '"]');
        var val = parseFloat((inp && inp.value ? inp.value : '').replace(',', '.'));
        if (isNaN(val) || val < 0 || val > 10) {
          alert('Informe uma nota válida entre 0 e 10.');
          return;
        }
        if (!Array.isArray(alunos[aidx].notas)) alunos[aidx].notas = [];
        alunos[aidx].notas.push(Number(val));
        gravarJSON(KEY_ALUNOS, alunos);
        inp.value = '';
        atualizarNotas(); 
        atualizarGraficos();
      }

      if (rem) {
        if (!isProfessor) return;
        var aidx2 = parseInt(e.target.getAttribute('data-aidx'),10);
        var nidx = parseInt(e.target.getAttribute('data-nidx'),10);
        if (Array.isArray(alunos[aidx2].notas)) alunos[aidx2].notas.splice(nidx,1);
        gravarJSON(KEY_ALUNOS, alunos);
        atualizarNotas(); 
        atualizarGraficos();
      }
    });
  }

  // Calendário
  var calEl = document.getElementById('calendario');
  if (calEl && window.FullCalendar) {
    var calendar = new FullCalendar.Calendar(calEl, {
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
            ev.remove(); salvarEventos(calendar);
          }
        } else {
          ev.setProp('title', novo); 
          salvarEventos(calendar);
        }
      },
      eventDrop: function(){ 
        if (isProfessor) salvarEventos(calendar);
      },
      eventResize: function(){
        if (isProfessor) salvarEventos(calendar);
      },
      select: function(sel) {
        if (!isProfessor) return;
        var title = prompt('Título do evento (intervalo selecionado):');
        if (!title) return;
        var ev = { id: 'ev-' + Date.now(), title: title, start: sel.startStr, end: sel.endStr, allDay: true };
        calendar.addEvent(ev);
        salvarEventos(calendar);
        // Notificar Alunos
        salvarNotificacao({ id: ev.id, title: ev.title, startStr: ev.start });
      }
    });
    calendar.render();

    // Modal de adicionar evento
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
          // Notificar alunos
          salvarNotificacao({ id: ev.id, title: ev.title, startStr: ev.start });
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
    }
  }

  // Inicializar
  atualizarFiltros();
  renderListas();
  atualizarSelTurmas(document.getElementById('selTurmaGraf'));
  atualizarGraficos();
  atualizarSelTurmas(document.getElementById('selTurmaNotas'));
  atualizarNotas();
  mostrarNotifsNovasAluno();
})();