// Mostrar/Ocultar Senha
const senhaInput = document.getElementById('senha');
const toggleSenha = document.getElementById('toggleSenha');
toggleSenha.addEventListener('click', () => {
  const tipo = senhaInput.getAttribute('type') === 'password' ? 'text' : 'password';
  senhaInput.setAttribute('type', tipo);
  toggleSenha.textContent = tipo === 'password' ? '👁️' : '🙈';
});

// Usuários fictícios
const usuarios = [
  { usuario: 'aluno', senha: '123', tipo: 'aluno' },
  { usuario: 'professor', senha: '456', tipo: 'professor' },
  { usuario: 'admin', senha: '789', tipo: 'administrador' }
];

// Login
const form = document.getElementById('loginForm');
const mensagemErro = document.getElementById('mensagemErro');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const usuario = document.getElementById('usuario').value.trim();
  const senha = document.getElementById('senha').value.trim();

  const encontrado = usuarios.find(u => u.usuario === usuario && u.senha === senha);

  if (encontrado) {
    mensagemErro.textContent = "";
    localStorage.setItem('usuarioLogado', JSON.stringify({
      usuario: encontrado.usuario,
      tipo: encontrado.tipo
    }));
    window.location.href = 'portal.html';
  } else {
    mensagemErro.textContent = "Usuário ou senha incorretos.";
  }
});