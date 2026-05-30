import './styles/app.css';

const app = document.getElementById('app');
if (app) {
  const p = document.createElement('p');
  p.textContent = `Platform: ${window.api.platform}`;
  app.appendChild(p);
}
