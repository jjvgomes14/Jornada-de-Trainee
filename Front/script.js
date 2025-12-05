(() => {
  'use strict';

  const API_BASE_URL = 'http://localhost:5191/api';

  // Elementos de Tela
  const formLogin   = document.getElementById('formLogin');
  const inpUsuario  = document.getElementById('usuario');
  const inpSenha    = document.getElementById('senha');
  const erroUsuario = document.getElementById('erroUsuario');
  const erroSenha   = document.getElementById('erroSenha');
  const feedback    = document.getElementById('feedback');

  const switchTema  = document.getElementById('switchTema');
  const labelTema   = document.getElementById('labelTema');

  const formMatricula = document.getElementById('formMatricula');
  const fbMatricula   = document.getElementById('fbMatricula');

  // Tema Claro/Escuro
  function aplicarTema(tema) {
    document.body.setAttribute('data-bs-theme', tema);
    if (switchTema) switchTema.checked = tema === 'dark';
    if (labelTema) labelTema.textContent = tema === 'dark' ? 'Modo escuro' : 'Modo claro';
  }

  function initTema() {
    const temaSalvo = localStorage.getItem('tema') || 'light';
    aplicarTema(temaSalvo);

    if (!switchTema) return;

    switchTema.addEventListener('change', () => {
      const tema = switchTema.checked ? 'dark' : 'light';
      aplicarTema(tema);
      localStorage.setItem('tema', tema);
    });
  }

  // Helper de chamada API
  async function apiFetch(path, options = {}) {
    const resp = await fetch(API_BASE_URL + path, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.body
    });

    if (resp.status === 204) return null;

    let data = null;
    try {
      data = await resp.json();
    } catch {
      // se não tiver JSON, segue como null
    }

    if (!resp.ok) {
      const msg =
        (data && (data.message || data.error)) ||
        'Erro ao comunicar com o servidor.';
      throw new Error(msg);
    }

    return data;
  }

  //Login
  function limparMensagensLogin() {
    if (erroUsuario) erroUsuario.textContent = '';
    if (erroSenha) erroSenha.textContent = '';
    if (feedback) {
      feedback.textContent = '';
      feedback.className = 'mt-3 small text-center';
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    limparMensagensLogin();

    const username = inpUsuario?.value.trim() || '';
    const password = inpSenha?.value.trim() || '';

    if (!username) {
      if (erroUsuario) erroUsuario.textContent = 'Informe seu usuário.';
      return;
    }
    if (!password) {
      if (erroSenha) erroSenha.textContent = 'Informe sua senha.';
      return;
    }

    const btn = formLogin.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
      const result = await apiFetch('/Auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      localStorage.setItem('authToken', result.token);
      localStorage.setItem('usuarioLogado', result.username);
      localStorage.setItem('tipoUsuario', result.role);
      localStorage.setItem('mustChangePassword', result.mustChangePassword ? '1' : '0');

      if (feedback) {
        feedback.className = 'mt-3 text-success small text-center';
        feedback.textContent = 'Login bem-sucedido! Redirecionando...';
      }

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 800);
    } catch (err) {
      console.error(err);
      if (feedback) {
        feedback.className = 'mt-3 text-danger small text-center';
        feedback.textContent = err.message || 'Usuário ou senha inválidos.';
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function initLogin() {
    if (!formLogin) return;
    formLogin.addEventListener('submit', handleLogin);
  }

  // Modal de Matricula
  function limparFeedbackMatricula() {
    if (!fbMatricula) return;
    fbMatricula.textContent = '';
    fbMatricula.className = 'small mt-1';
  }

  async function handleMatricula(e) {
    e.preventDefault();
    limparFeedbackMatricula();

    const nome           = document.getElementById('matNome')?.value.trim() || '';
    const email          = document.getElementById('matEmail')?.value.trim() || '';
    const dataNascimento = document.getElementById('matDataNasc')?.value || '';

    if (!nome || !email || !dataNascimento) {
      if (fbMatricula) {
        fbMatricula.textContent = 'Preencha todos os campos.';
        fbMatricula.classList.add('text-danger');
      }
      return;
    }

    const btnSubmit = formMatricula.querySelector('button[type="submit"]');
    if (btnSubmit) btnSubmit.disabled = true;

    try {
      await apiFetch('/Matriculas/solicitar', {
        method: 'POST',
        body: JSON.stringify({ nome, email, dataNascimento })
      });

      if (fbMatricula) {
        fbMatricula.textContent =
          'Solicitação enviada com sucesso! Você receberá um e-mail de confirmação.';
        fbMatricula.classList.add('text-success');
      }

      formMatricula.reset();

      // Fecha o modal após 1s (se Bootstrap estiver carregado)
      setTimeout(() => {
        const modalEl = document.getElementById('modalMatricula');
        if (modalEl && window.bootstrap) {
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      if (fbMatricula) {
        fbMatricula.textContent =
          err.message || 'Erro ao enviar solicitação. Tente novamente.';
        fbMatricula.classList.add('text-danger');
      }
    } finally {
      if (btnSubmit) btnSubmit.disabled = false;
    }
  }

  function initMatricula() {
    if (!formMatricula) return;
    formMatricula.addEventListener('submit', handleMatricula);
  }

  // Inicialização Geral
  function init() {
    initTema();
    initLogin();
    initMatricula();
  }

  init();
})();
