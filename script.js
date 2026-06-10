const $ = (selector) => document.querySelector(selector);
const initialProgress = { sqli: false, csrf: false, xss: false };
let progress = { ...initialProgress };

const challenges = ['sqli', 'csrf', 'xss'];
const requiredOrder = { csrf: 'sqli', xss: 'csrf' };

function saveProgress() {
  // O progresso fica apenas na sessão atual da página.
  // Assim, ao recarregar ou ao publicar, o convite nunca abre direto no final.
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setFeedback(id, message, type = 'error') {
  const el = $(`#feedback-${id}`);
  el.textContent = message;
  el.className = `feedback ${type}`;
}

function completeChallenge(id, message) {
  progress[id] = true;
  saveProgress();
  setFeedback(id, message, 'success');
  updateUI();
  burstConfetti(65);
}

function updateUI() {
  const done = challenges.filter((id) => progress[id]).length;
  $('#progressText').textContent = `${done}/3 etapas concluídas`;
  $('#progressBar').style.width = `${(done / 3) * 100}%`;

  challenges.forEach((id) => {
    const card = $(`#challenge-${id}`);
    const pill = $(`#pill-${id}`);
    const prerequisite = requiredOrder[id];
    const unlocked = !prerequisite || progress[prerequisite];

    card.classList.toggle('locked', !unlocked);
    card.classList.toggle('done', progress[id]);
    pill.classList.toggle('done', progress[id]);
    pill.textContent = progress[id] ? 'Concluído' : unlocked ? 'Pendente' : 'Bloqueado';
  });

  const invite = $('#convite');
  invite.classList.toggle('locked', done < 3);

  if (done < 3) {
    parkNoButton();
  }

  if (done === 3) {
    $('#convite').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(ensureNoButtonFloating, 450);
  }
}

$('#resetBtn').addEventListener('click', () => {
  progress = { ...initialProgress };
  saveProgress();
  ['sqli', 'csrf', 'xss'].forEach((id) => setFeedback(id, '', ''));
  $('#sqlUser').value = '';
  $('#sqlPass').value = '';
  $('#csrfPayload').value = '';
  $('#xssPayload').value = '';
  $('#muralPreview').textContent = 'Digite uma mensagem para visualizar o reflexo.';
  $('#sqlPreview').textContent = "SELECT * FROM users WHERE usuario = '' AND senha = '';";
  updateUI();
});

$('#sqlUser').addEventListener('input', updateSqlPreview);
$('#sqlPass').addEventListener('input', updateSqlPreview);

function updateSqlPreview() {
  const user = $('#sqlUser').value;
  const pass = $('#sqlPass').value;
  $('#sqlPreview').innerHTML = `SELECT * FROM users WHERE usuario = '${escapeHtml(user)}' AND senha = '${escapeHtml(pass)}';`;
}

$('#sqliForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const user = $('#sqlUser').value.trim().toLowerCase();
  const pass = $('#sqlPass').value.trim();
  const normalized = pass.replace(/\s+/g, ' ').toLowerCase();

  const hasAlwaysTrue = /('|\")?\s*or\s+('|\")?1('|\")?\s*=\s*('|\")?1('|\")?/i.test(normalized) || /or\s+1\s*=\s*1/i.test(normalized);
  const hasComment = /(--|#|\/\*)/.test(pass);
  const looksLikeInjection = /['\"]/.test(pass) && hasAlwaysTrue;

  if ((user === 'admin' || user === '') && looksLikeInjection) {
    completeChallenge('sqli', 'Acesso obtido. A query foi manipulada e a etapa SQL Injection foi concluída.');
  } else if (hasAlwaysTrue && !hasComment) {
    setFeedback('sqli', 'Quase! A condição ficou verdadeira, mas tente também comentar o restante da query com -- ou #.');
  } else {
    setFeedback('sqli', 'Login negado. Procure quebrar a comparação da senha com uma condição sempre verdadeira.');
  }
});

$('#fillCsrf').addEventListener('click', () => {
  $('#csrfPayload').value = $('#csrfExample').innerHTML.trim();
});

$('#runCsrf').addEventListener('click', () => {
  const payload = $('#csrfPayload').value.toLowerCase().replace(/\s+/g, ' ');
  const hasForm = payload.includes('<form');
  const hasPost = /method\s*=\s*["']?post["']?/i.test(payload);
  const hasAction = payload.includes('/lab/confirmacao-operacao');
  const hasConfirmacao = /name\s*=\s*["']?confirmacao["']?/i.test(payload) && /value\s*=\s*["']?sim["']?/i.test(payload);
  const hasNivel = /name\s*=\s*["']?nivel["']?/i.test(payload) && payload.includes('professor');

  if (hasForm && hasPost && hasAction && hasConfirmacao && hasNivel) {
    completeChallenge('csrf', 'CSRF validado. A requisição forjada alterou o estado dentro do laboratório.');
  } else {
    setFeedback('csrf', 'Payload incompleto. Verifique form, método POST, action e os campos hidden esperados.');
  }
});

$('#fillXss').addEventListener('click', () => {
  $('#xssPayload').value = '<img src=x onerror="alert(\'WEBSEC\')">';
  $('#muralPreview').textContent = $('#xssPayload').value;
});

$('#xssPayload').addEventListener('input', () => {
  $('#muralPreview').textContent = $('#xssPayload').value || 'Digite uma mensagem para visualizar o reflexo.';
});

$('#testXss').addEventListener('click', () => {
  const payload = $('#xssPayload').value.trim();
  const lowered = payload.toLowerCase();
  const hasVector = lowered.includes('<script') || lowered.includes('onerror=') || lowered.includes('onload=') || lowered.includes('javascript:') || lowered.includes('alert(');
  const hasHtml = /<\s*\w+/i.test(payload);

  $('#muralPreview').textContent = payload || 'Digite uma mensagem para visualizar o reflexo.';

  if (hasVector && hasHtml) {
    completeChallenge('xss', 'XSS demonstrado de forma segura. O laboratório detectou um payload que tentaria executar JavaScript.');
  } else if (hasVector) {
    setFeedback('xss', 'Boa intenção, mas faltou um vetor HTML refletido. Tente usar uma tag com evento.');
  } else {
    setFeedback('xss', 'Ainda não. O payload precisa demonstrar tentativa clara de execução de JavaScript.');
  }
});

let noButtonInterval = null;

function parkNoButton() {
  const no = $('#noBtn');
  const choiceArea = $('#choiceArea');

  if (noButtonInterval) {
    clearInterval(noButtonInterval);
    noButtonInterval = null;
  }

  no.dataset.floating = 'false';
  no.classList.remove('running');
  no.textContent = 'Não';
  no.removeAttribute('style');

  if (no.parentElement !== choiceArea) {
    choiceArea.appendChild(no);
  }
}

function ensureNoButtonFloating() {
  const no = $('#noBtn');
  const inviteUnlocked = !$('#convite').classList.contains('locked');

  if (!inviteUnlocked) return;

  // Move o botão para o body para ele poder circular pela tela inteira,
  // sem ser limitado pelo card, pelo flex da área de escolha ou por overflow.
  if (no.parentElement !== document.body) {
    document.body.appendChild(no);
  }

  no.dataset.floating = 'true';
  no.classList.add('running');
  no.style.display = 'inline-flex';
  no.style.position = 'fixed';
  no.style.right = 'auto';
  no.style.bottom = 'auto';
  no.style.pointerEvents = 'auto';

  moveNoButton(false);

  if (!noButtonInterval) {
    noButtonInterval = setInterval(() => {
      if (!$('#videoModal').classList.contains('show') && !$('#convite').classList.contains('locked')) {
        moveNoButton(false);
      }
    }, 950);
  }
}

function moveNoButton(changeLabel = true) {
  const no = $('#noBtn');
  const labels = ['Não', 'Tem certeza?', 'Ops!', 'Quase...', 'Melhor clicar no Sim', 'Erro 403'];

  no.classList.add('running');
  no.style.display = 'inline-flex';
  no.style.position = 'fixed';
  no.style.right = 'auto';
  no.style.bottom = 'auto';

  // Troca o texto antes de calcular o tamanho para garantir que o botão caiba na tela.
  if (changeLabel) {
    no.textContent = labels[Math.floor(Math.random() * labels.length)];
  }

  const padding = 18;
  const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  const buttonWidth = Math.min(no.offsetWidth || 180, viewportWidth - padding * 2);
  const buttonHeight = Math.min(no.offsetHeight || 54, viewportHeight - padding * 2);
  const minX = padding;
  const minY = padding;
  const maxX = Math.max(minX, viewportWidth - buttonWidth - padding);
  const maxY = Math.max(minY, viewportHeight - buttonHeight - padding);

  const randomPosition = () => ({
    x: minX + Math.random() * Math.max(1, maxX - minX),
    y: minY + Math.random() * Math.max(1, maxY - minY),
  });

  let { x, y } = randomPosition();

  // Evita cair em cima do botão Sim, para o caminho correto continuar óbvio e clicável.
  const yesRect = $('#yesBtn').getBoundingClientRect();
  const overlapsYes = () => (
    x < yesRect.right + 46 &&
    x + buttonWidth > yesRect.left - 46 &&
    y < yesRect.bottom + 46 &&
    y + buttonHeight > yesRect.top - 46
  );

  let attempts = 0;
  while (overlapsYes() && attempts < 35) {
    ({ x, y } = randomPosition());
    attempts++;
  }

  no.style.left = `${Math.round(x)}px`;
  no.style.top = `${Math.round(y)}px`;
}

$('#noBtn').addEventListener('mouseenter', () => moveNoButton(true));
$('#noBtn').addEventListener('click', (event) => {
  event.preventDefault();
  moveNoButton(true);
});
$('#noBtn').addEventListener('touchstart', (event) => {
  event.preventDefault();
  moveNoButton(true);
}, { passive: false });

window.addEventListener('resize', () => {
  if ($('#noBtn').dataset.floating === 'true' && !$('#videoModal').classList.contains('show')) {
    moveNoButton(false);
  }
});

$('#yesBtn').addEventListener('click', async () => {
  $('#noBtn').style.display = 'none';
  $('#videoModal').classList.add('show');
  burstConfetti(170);
  const video = $('#inviteVideo');
  video.volume = 0.7;
  try {
    video.currentTime = 0;
    await video.play();
  } catch (error) {
    // Alguns navegadores exigem que o usuário aperte play manualmente.
  }
});

$('#closeModal').addEventListener('click', closeModal);
$('#videoModal').addEventListener('click', (event) => {
  if (event.target.id === 'videoModal') closeModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal();
  // Atalho de emergência para apresentação: Ctrl + Shift + F libera tudo.
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
    progress = { sqli: true, csrf: true, xss: true };
    saveProgress();
    updateUI();
  }
});

function closeModal() {
  $('#videoModal').classList.remove('show');
  $('#inviteVideo').pause();
  if (!$('#convite').classList.contains('locked')) {
    $('#noBtn').style.display = 'inline-flex';
    moveNoButton(false);
  }
}

// Fundo estilo matrix, só visual.
const matrixCanvas = $('#matrix');
const matrixCtx = matrixCanvas.getContext('2d');
let drops = [];
function resizeMatrix() {
  matrixCanvas.width = window.innerWidth;
  matrixCanvas.height = window.innerHeight;
  drops = Array(Math.ceil(matrixCanvas.width / 18)).fill(1);
}
function drawMatrix() {
  matrixCtx.fillStyle = 'rgba(5, 7, 15, 0.08)';
  matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
  matrixCtx.fillStyle = '#38ff9c';
  matrixCtx.font = '14px JetBrains Mono';
  for (let i = 0; i < drops.length; i++) {
    const text = Math.random() > 0.5 ? '1' : '0';
    matrixCtx.fillText(text, i * 18, drops[i] * 18);
    if (drops[i] * 18 > matrixCanvas.height && Math.random() > 0.975) drops[i] = 0;
    drops[i]++;
  }
}
resizeMatrix();
setInterval(drawMatrix, 55);
window.addEventListener('resize', resizeMatrix);
window.addEventListener('resize', () => {
  if ($('#noBtn').dataset.floating === 'true') moveNoButton(false);
});

// Confete simples sem biblioteca externa.
const confettiCanvas = $('#confetti');
const confettiCtx = confettiCanvas.getContext('2d');
let confettiPieces = [];
function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
function burstConfetti(amount = 80) {
  for (let i = 0; i < amount; i++) {
    confettiPieces.push({
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.28,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -10 - 2,
      size: Math.random() * 7 + 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.25,
      life: 130 + Math.random() * 70,
      hue: [145, 198, 315, 42][Math.floor(Math.random() * 4)]
    });
  }
}
function animateConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiPieces = confettiPieces.filter(piece => piece.life > 0);
  for (const piece of confettiPieces) {
    piece.x += piece.vx;
    piece.y += piece.vy;
    piece.vy += 0.22;
    piece.rot += piece.vr;
    piece.life--;
    confettiCtx.save();
    confettiCtx.translate(piece.x, piece.y);
    confettiCtx.rotate(piece.rot);
    confettiCtx.fillStyle = `hsl(${piece.hue} 100% 65%)`;
    confettiCtx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.62);
    confettiCtx.restore();
  }
  requestAnimationFrame(animateConfetti);
}
resizeConfetti();
window.addEventListener('resize', resizeConfetti);
animateConfetti();

updateUI();
