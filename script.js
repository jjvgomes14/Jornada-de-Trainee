(function () {
  // Pega elementos do HTML
  var form = document.getElementById('formLogin');
  var inputUsuario = document.getElementById('usuario');
  var inputSenha = document.getElementById('senha');
  var erroUsuario = document.getElementById('erroUsuario');
  var erroSenha = document.getElementById('erroSenha');
  var feedback = document.getElementById('feedback');
  var botaoOlho = document.getElementById('btnOlho');
  var switchTema = document.getElementById('switchTema');
  var labelTema = document.getElementById('labelTema');
  var body = document.body;

  // TEMA CLARO/ESCURO  
  // Tenta ler o tema salvo anteriormente (se nunca salvou, começa como "light").
  var temaSalvo = localStorage.getItem('tema') || 'light';
  aplicarTema(temaSalvo);

  // Alterar tema e salva
  switchTema.addEventListener('change', function () {
    var novoTema = switchTema.checked ? 'dark' : 'light';
    aplicarTema(novoTema);
    localStorage.setItem('tema', novoTema);
  });

  function aplicarTema(nomeTema) {
    body.setAttribute('data-bs-theme', nomeTema);

    // Ajusta o estado do switch e o texto da label
    if (nomeTema === 'dark') {
      switchTema.checked = true;
      labelTema.textContent = 'Modo escuro';
    } else {
      switchTema.checked = false;
      labelTema.textContent = 'Modo claro';
    }
  }

  // MOSTRAR/OCULTAR SENHA
  botaoOlho.addEventListener('click', function () {
    if (inputSenha.type === 'password') {
      inputSenha.type = 'text';
      botaoOlho.textContent = '🙈';
      botaoOlho.setAttribute('aria-label', 'Ocultar senha');
    } else {
      inputSenha.type = 'password';
      botaoOlho.textContent = '👁️';
      botaoOlho.setAttribute('aria-label', 'Mostrar senha');
    }
  });

  //FORMULÁRIO DE LOGIN
  form.addEventListener('submit', function (evento) {
  evento.preventDefault();

  // Limpa mensagens antigas
  feedback.textContent = '';
  erroUsuario.textContent = '';
  erroSenha.textContent = '';

  var login = inputUsuario.value.trim();
  var senha = inputSenha.value.trim();

  if (!login) { erroUsuario.textContent = 'Informe seu usuário.'; return; }
  if (!senha) { erroSenha.textContent = 'Informe sua senha.'; return; }

  // Usuários fictícios (exemplo simples)
  var usuarios = [
    { tipo: "aluno",        usuario: "aluno",     senha: "123" },
    { tipo: "professor",    usuario: "professor", senha: "456" },
    { tipo: "administrador",usuario: "admin",     senha: "789" }
  ];

  var achou = usuarios.find(u => u.usuario === login && u.senha === senha);

  if (!achou) {
    feedback.textContent = 'Usuário ou senha incorretos!';
    feedback.className = 'mt-3 text-danger small text-center';
    return;
  }

  // Salva a "sessão" mínima no localStorage
  localStorage.setItem('tipoUsuario', achou.tipo);
  localStorage.setItem('usuarioLogado', achou.usuario);

  feedback.className = 'mt-3 text-success small text-center';
  feedback.textContent = `Login bem-sucedido! Bem-vindo, ${achou.tipo}.`;

  setTimeout(function () {
    window.location.href = 'dashboard.html';
  }, 800);
});
})();
