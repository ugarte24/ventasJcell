import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Asegurar que el root tenga atributos para prevenir traducción
const rootElement = document.getElementById("root");
if (rootElement) {
  rootElement.setAttribute('translate', 'no');
  rootElement.classList.add('notranslate');
}

createRoot(rootElement!).render(<App />);
