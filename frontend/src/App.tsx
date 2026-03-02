import { HomePage } from "./pages/HomePage";
import "./styles/layout.css";

export function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="header__inner">
          <div className="brand">Starlink Monitor</div>
        </div>
      </header>

      <main className="container">
        <HomePage />
      </main>

      <footer className="footer">
        <div className="footer__inner">
          © {new Date().getFullYear()} Starlink Monitor
        </div>
      </footer>
    </div>
  );
}