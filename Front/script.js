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

    const camposObrigatorios = [
      { id: 'matNome',      nome: 'Nome completo' },
      { id: 'matEmail',     nome: 'E-mail' },
      { id: 'matDataNasc',  nome: 'Data de nascimento' },
      { id: 'matRG',        nome: 'RG' },
      { id: 'matCPF',       nome: 'CPF' },
      { id: 'matCelular',   nome: 'Celular' },
      { id: 'matCEP',       nome: 'CEP' },
      { id: 'matEstado',    nome: 'UF' },
      { id: 'matCidade',    nome: 'Cidade' },
      { id: 'matBairro',    nome: 'Bairro' },
      { id: 'matRua',       nome: 'Rua' },
      { id: 'matCasa',      nome: 'Número' }
    ];

    camposObrigatorios.forEach(c => {
      const el = document.getElementById(c.id);
      if (el) el.classList.remove('is-invalid');
    });

    let temErro = false;
    camposObrigatorios.forEach(c => {
      const el = document.getElementById(c.id);
      const valor = (el?.value || '').trim();

      if (!valor) {
        temErro = true;
        if (el) el.classList.add('is-invalid');
      }
    });

    if (temErro) {
      if (fbMatricula) {
        fbMatricula.textContent = 'Preencha todos os campos para finalizar a matrícula.';
        fbMatricula.className = 'small mt-1 text-danger';
      }
      return;
    }

    //Todos campos preenchidos
    const nome           = document.getElementById('matNome').value.trim();
    const email          = document.getElementById('matEmail').value.trim();
    const dataNascimento = document.getElementById('matDataNasc').value;

    const rg        = document.getElementById('matRG').value.trim();
    const cpf       = document.getElementById('matCPF').value.trim();
    const celular   = document.getElementById('matCelular').value.trim();

    const cep       = document.getElementById('matCEP').value.trim();
    const estado    = document.getElementById('matEstado').value.trim();
    const cidade    = document.getElementById('matCidade').value.trim();
    const bairro    = document.getElementById('matBairro').value.trim();
    const rua       = document.getElementById('matRua').value.trim();
    const numeroCasa = document.getElementById('matCasa').value.trim();

    const btnSubmit = formMatricula.querySelector('button[type="submit"]');
    if (btnSubmit) btnSubmit.disabled = true;

    try {
      await apiFetch('/Matriculas/solicitar', {
      method: 'POST',
      body: JSON.stringify({nome, email, dataNascimento, rg, cpf, celular, cep, estado, cidade, bairro, rua, numeroCasa})
    });

      if (fbMatricula) {
        fbMatricula.textContent =
          'Solicitação enviada com sucesso! Você receberá um e-mail de confirmação.';
        fbMatricula.className = 'small mt-1 text-success';
      }

      formMatricula.reset();

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
        fbMatricula.className = 'small mt-1 text-danger';
      }
    } finally {
      if (btnSubmit) btnSubmit.disabled = false;
    }
  }

  function initMatricula() {
    if (!formMatricula) return;
    formMatricula.addEventListener('submit', handleMatricula);
  }

  //Mascara do Celular
  document.addEventListener("DOMContentLoaded", () => {
    const telefone = document.getElementById("matCelular");
    telefone.addEventListener("input", () => {
        formatarTelefone(telefone);
    });
  });

  function formatarTelefone(campo) {
    // Remove tudo que não seja número
    let valor = campo.value.replace(/\D/g, "");
    valor = valor.substring(0, 11);
    // Aplica a máscara
    valor = valor.replace(/(\d{2})(\d)/, "$1 $2");
    valor = valor.replace(/(\d{5})(\d)/, "$1-$2");
    campo.value = valor;
  }

  //Mascara do CEP
  document.addEventListener("DOMContentLoaded", () => {
    const cepInput = document.getElementById("matCEP");
    cepInput.addEventListener("input", () => {
        cepInput.value = cepInput.value
            .replace(/\D/g, "")
            .replace(/^(\d{5})(\d)/, "$1-$2");
    });
    // Busca o endereço quando termina de digitar
    cepInput.addEventListener("keyup", () => {
        const cep = cepInput.value.replace(/\D/g, "");
        if (cep.length === 8)
            buscarCEP(cep);
    });
  });

  //Buscar CEP
  async function buscarCEP(cep) {
    try {
        const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dados = await resposta.json();
        if (dados.erro) {
            alert("CEP não encontrado!");
            limparCampos();
            return;
        }
        document.getElementById("matRua").value     = dados.logradouro || "";
        document.getElementById("matBairro").value = dados.bairro || "";
        document.getElementById("matCidade").value = dados.localidade || "";
        document.getElementById("matEstado").value = dados.uf || "";
    }
    catch (erro) {
        console.error("Erro ao buscar CEP:", erro);
        alert("Erro ao consultar o CEP.");
        limparCampos();
    }
  } 

  function limparCampos() {
    document.getElementById("matRua").value     = "";
    document.getElementById("matBairro").value = "";
    document.getElementById("matCidade").value = "";
    document.getElementById("matEstado").value = "";
  }

  // Inicialização Geral
  function init() {
    initTema();
    initLogin();
    initMatricula();
  }

  init();
})();
