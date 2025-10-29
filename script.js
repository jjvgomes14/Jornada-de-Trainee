(function () {
  var form = document.getElementById('formLogin');
  var inpUsuario = document.getElementById('usuario');
  var inpSenha = document.getElementById('senha');
  var erroUsuario = document.getElementById('erroUsuario');
  var erroSenha = document.getElementById('erroSenha');
  var feedback = document.getElementById('feedback');
  var switchTema = document.getElementById('switchTema');
  var labelTema = document.getElementById('labelTema');
  var body = document.body;

  // Tema Claro/Escuro
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

  // Login
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    feedback.textContent = '';
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

    // Usuários de teste
    var usuarios = [
      { tipo: 'aluno',         usuario: 'aluno',     senha: '123' },
      { tipo: 'professor',     usuario: 'professor', senha: '456' },
      { tipo: 'administrador', usuario: 'admin',     senha: '789' }
    ];

    var i, achou = null;
    for (i = 0; i < usuarios.length; i++) {
      if (usuarios[i].usuario === login && usuarios[i].senha === senha) {
        achou = usuarios[i];
        break;
      }
    }

    if (!achou) {
      feedback.className = 'mt-3 text-danger small text-center';
      feedback.textContent = 'Usuário ou senha incorretos!';
      return;
    }

    localStorage.setItem('tipoUsuario', achou.tipo);
    localStorage.setItem('usuarioLogado', achou.usuario);

    feedback.className = 'mt-3 text-success small text-center';
    feedback.textContent = 'Login bem-sucedido!';

    setTimeout(function () { window.location.href = 'dashboard.html'; }, 800);
  });
})();
