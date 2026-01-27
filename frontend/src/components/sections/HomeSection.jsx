export default function HomeSection({ user }) {
  return (
    <div className="card p-3">
      <h4 className="mb-2">Bem-vindo(a)!</h4>
      <p className="m-0">
        Você está logado como <b>{user?.role}</b>.
      </p>
      <hr />
    </div>
  );
}
