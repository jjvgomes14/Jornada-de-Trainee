export default function HomeSection({ navItems, onSelectSection }) {
  return (
    <div className="card p-3">
      <h4 className="mb-2">Bem-vindo(a)!</h4>
      <p className="text-muted">
        Escolha uma das seções abaixo para continuar.
      </p>

      <hr />

      <div className="row g-3">
        {navItems
          .filter((item) => item.id !== "home")
          .map((item) => (
            <div key={item.id} className="col-12 col-md-6 col-lg-4">
              <div
                className="card h-100 shadow-sm card-hover"
                style={{ cursor: "pointer" }}
                onClick={() => onSelectSection(item.id)}
              >
                <div className="card-body d-flex flex-column justify-content-center text-center">
                  <h5 className="card-title mb-0">{item.label}</h5>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
