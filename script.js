(function () {
  'use strict';

  // ============================
  // CONFIGURAÇÃO DA API
  // ============================
  const API_BASE_URL = 'http://localhost:5191/api'; // <-- AJUSTE AQUI PARA A SUA API

  var form = document.getElementById('formLogin');
  var inpUsuario = document.getElementById('usuario');
  var inpSenha = document.getElementById('senha');
  var erroUsuario = document.getElementById('erroUsuario');
  var erroSenha = document.getElementById('erroSenha');
  var feedback = document.getElementById('feedback');
  var switchTema = document.getElementById('switchTema');
  var labelTema = document.getElementById('labelTema');
  var body = document.body;

  // ============================
  // TEMA CLARO/ESCURO
  // ============================
  var tema = localStorage.getItem('tema') || 'light';
  aplicarTema(tema);

  switchTema.addEventListener('change', function () {
    var novo = switchTema.checked ? 'dark' : 'light';
    aplicarTema(novo);
    localStorage.setItem('tema', novo);
  });

  function aplicarTema(nome) {
    body.setAttribute('data-bs-theme', nome);
    labelTema.textContent = (nome === 'dark') ? 'Modo escuro' : 'Modo claro';
    switchTema.checked = (nome === 'dark');
  }

  // ============================
  // HELPER DE CHAMADA À API
  // ============================
  async function apiFetch(path, options) {
    const url = API_BASE_URL + path;
    const baseHeaders = {};

    // login ainda não tem token
    if (!options) options = {};

    if (!(options.body instanceof FormData)) {
      baseHeaders['Content-Type'] = 'application/json';
    }

    const resp = await fetch(url, {
      method: options.method || 'GET',
      headers: Object.assign({}, baseHeaders, options.headers || {}),
      body: options.body
    });

    if (resp.status === 204) return null;

    let data;
    try {
      data = await resp.json();
    } catch {
      data = null;
    }

    if (!resp.ok) {
      const msg = (data && (data.message || data.error)) || 'Erro ao comunicar com o servidor.';
      throw new Error(msg);
    }

    return data;
  }

  // ============================
  // LOGIN
  // ============================
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      feedback.textContent = '';
      feedback.className = 'mt-3 text-center small';
      erroUsuario.textContent = '';
      erroSenha.textContent = '';

      var login = (inpUsuario.value || '').trim();
      var senha = (inpSenha.value || '').trim();

      if (!login) {
        erroUsuario.textContent = 'Informe seu usuário.';
        return;
      }
      if (!senha) {
        erroSenha.textContent = 'Informe sua senha.';
        return;
      }

      // Desabilita botão enquanto autentica
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;

      try {
        const result = await apiFetch('/Auth/login', {
          method: 'POST',
          body: JSON.stringify({
            username: login,
            password: senha
          })
        });

        // result => { token, username, role }
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('usuarioLogado', result.username);
        // Armazena exatamente a role vinda da API (Aluno, Professor, Administrador)
        localStorage.setItem('tipoUsuario', result.role);

        feedback.className = 'mt-3 text-success small text-center';
        feedback.textContent = 'Login bem-sucedido! Redirecionando...';

        setTimeout(function () {
          window.location.href = 'dashboard.html';
        }, 800);
      } catch (err) {
        console.error(err);
        feedback.className = 'mt-3 text-danger small text-center';
        feedback.textContent = err.message || 'Usuário ou senha inválidos.';
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  // ============================
  // FORMULÁRIO DE MATRÍCULA (MODAL)
  // ============================
  var formMatricula = document.getElementById('formMatricula');
  var fbMatricula = document.getElementById('fbMatricula');

  if (formMatricula) {
    formMatricula.addEventListener('submit', async function (e) {
      e.preventDefault();

      if (fbMatricula) {
        fbMatricula.textContent = '';
        fbMatricula.className = 'small mt-1';
      }

      var nome = (document.getElementById('matNome').value || '').trim();
      var email = (document.getElementById('matEmail').value || '').trim();
      var dataNasc = document.getElementById('matDataNasc').value;

      if (!nome || !email || !dataNasc) {
        fbMatricula.textContent = 'Preencha todos os campos.';
        fbMatricula.classList.add('text-danger');
        return;
      }

      const btnSubmit = formMatricula.querySelector('button[type="submit"]');
      if (btnSubmit) btnSubmit.disabled = true;

      try {
        // Envio real para a API de matrículas
        await apiFetch('/Matriculas/solicitar', {
          method: 'POST',
          body: JSON.stringify({
            nome: nome,
            email: email,
            dataNascimento: dataNasc
          })
        });

        fbMatricula.textContent = 'Solicitação enviada com sucesso!';
        fbMatricula.classList.add('text-success');

        formMatricula.reset();

        // Fechar modal após 1s (opcional)
        setTimeout(function () {
          var modalEl = document.getElementById('modalMatricula');
          if (modalEl && window.bootstrap) {
            var modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
          }
        }, 1000);
      } catch (err) {
        console.error(err);
        fbMatricula.textContent = err.message || 'Erro ao enviar solicitação. Tente novamente.';
        fbMatricula.classList.add('text-danger');
      } finally {
        if (btnSubmit) btnSubmit.disabled = false;
      }
    });
  }
})();
