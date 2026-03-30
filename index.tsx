
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Se busca el elemento raíz en el DOM donde se montará la aplicación de React.
const rootElement = document.getElementById('root');
if (!rootElement) {
  // Si no se encuentra el elemento, se lanza un error porque la aplicación no puede iniciarse.
  throw new Error("No se pudo encontrar el elemento raíz para montar la aplicación");
}

// Se crea el 'root' de React para la renderización concurrente.
const root = ReactDOM.createRoot(rootElement);
// Se renderiza el componente principal 'App' dentro del StrictMode de React.
// StrictMode ayuda a detectar problemas potenciales en la aplicación.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);