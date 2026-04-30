# 🎓 EduConnect

Sistema web **Full-Stack** para gerenciamento do **EduConnect**, com controle de usuários, presença, eventos e visualização de dados analíticos.

---

## 📌 Sumário
- [📖 Sobre o Projeto](#-sobre-o-projeto)
- [🧱 Arquitetura](#-arquitetura)
- [🚀 Tecnologias](#-tecnologias)
- [📁 Estrutura do Repositório](#-estrutura-do-repositório)
- [⚙️ Como Executar](#️-como-executar)
  - [🔧 Backend](#-backend)
  - [💻 Frontend](#-frontend)

---

## 📖 Sobre o Projeto
O **EduConnect** foi desenvolvido como **trabalho acadêmico** com o objetivo de aplicar conceitos de:

- Desenvolvimento web moderno (Frontend + Backend)
- Comunicação via **API REST**
- Persistência de dados em banco relacional
- Autenticação segura com **JWT**
- Arquitetura em camadas (Controllers / Services / DTOs / Models)

---

## 🧱 Arquitetura

```txt
Frontend 
   ↓ 
API REST (ASP.NET Core)
   ↓
Services
   ↓
Entity Framework Core
   ↓
SQL Server
```

---

## 🧠 Camadas do Backend

| Camada      | Responsabilidade                                  |
|------------|---------------------------------------------------|
| Controllers | Recebem requisições HTTP                         |
| Services    | Implementam regras de negócio                    |
| DTOs        | Transferência de dados entre cliente e servidor  |
| Models      | Representam tabelas do banco                     |
| DbContext   | Comunicação com o banco de dados                 |

---

## 🚀 Tecnologias Utilizadas
### Frontend
- React
- Vite
- Bootstrap 5
- React Router DOM
- Axios
- Chart.js
- FullCalendar

### Backend
- ASP.NET Core Web API (.NET)
- Entity Framework Core
- SQL Servr
- JWT Authentication
- Swagger

---

## 📁 Estrutura do Repositório

```txt
EduConnect
│
├── backend
│   ├── Controllers
│   ├── Services
│   ├── Models
│   ├── DTOs
│   ├── Data
│   ├── Program.cs
│   └── appsettings.json
│
└── frontend
    ├── src
    │   ├── components
    │   ├── pages
    │   ├── context
    │   ├── routes
    │   └── services
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## ⚙️ Como executar o Projeto
### Pré Requisitos
- Node.js
- .NET SDK
- SQL Server
- Git
### 1. Backend
```bash
cd backend
dotnet restore
dotnet run
```
A API iniciará em:
```bash
https://localhost:5001
```
Swagger:
```bash
https://localhost:5001/swagger
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Acesse:
```bash
http://localhost:5173
```
