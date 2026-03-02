/* ========= Estado ========= */
const state = {
  teamA: "NOSOTROS",
  teamB: "ELLOS",
  target: 40,
  scoreA: 0,
  scoreB: 0,
  pendingWinner: null, // "A" o "B"
};

/* ========= Helpers ========= */
function $(id){ return document.getElementById(id); }

function clamp(n, min, max){
  return Math.max(min, Math.min(max, n));
}

function showScreen(screenId){
  const screens = ["screenStart","screenGame","screenRules","screenRuleDetail"];
  screens.forEach(id => $(id).classList.toggle("screen--active", id === screenId));
}

function saveSettings(){
  const data = {
    teamA: state.teamA,
    teamB: state.teamB,
    target: state.target,
  };
  localStorage.setItem("trucoUY_settings", JSON.stringify(data));
}

function loadSettings(){
  try{
    const raw = localStorage.getItem("trucoUY_settings");
    if(!raw) return;
    const data = JSON.parse(raw);
    if(typeof data.teamA === "string") state.teamA = data.teamA.toUpperCase();
    if(typeof data.teamB === "string") state.teamB = data.teamB.toUpperCase();
    if(typeof data.target === "number") state.target = data.target;
  }catch(e){ /* nada */ }
}

function resetGame(){
  state.scoreA = 0;
  state.scoreB = 0;
  state.pendingWinner = null;
  renderGame();
}

/* ========= Marcas (tally estilo tu ejemplo) =========
   Grupo de 5:
   1-4 dibujan lados del cuadrado (en "palitos")
   5 dibuja diagonal (cierra el look del cuadrado)
*/
function buildMarksSVG(points, isLeft){
  const groups = Math.ceil(points / 5);
  const maxGroups = Math.ceil(state.target / 5); // máximo visual
  const useGroups = Math.max(groups, 1);

  // Grid: 1 columna de grupos apilados (simple y limpio)
  const width = 160;
  const height = 700; // se escala con viewBox

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");

  // Parámetros de cada grupo
  const groupSize = 70;
  const gap = 18;
  const startY = 20;
  const startX = isLeft ? 16 : 16;

  function line(x1,y1,x2,y2, w=8){
    const l = document.createElementNS(svgNS, "line");
    l.setAttribute("x1", x1);
    l.setAttribute("y1", y1);
    l.setAttribute("x2", x2);
    l.setAttribute("y2", y2);
    l.setAttribute("stroke", "#1a63b8");
    l.setAttribute("stroke-width", w);
    l.setAttribute("stroke-linecap", "round");
    return l;
  }

  // dibuja hasta el target (si querés limitar, cambiá acá)
  const capped = clamp(points, 0, state.target);

  for(let g=0; g<Math.max(useGroups, maxGroups); g++){
    const groupTop = startY + g * (groupSize + gap);

    // cuántos puntos tiene este grupo
    const base = g*5;
    const inGroup = clamp(capped - base, 0, 5);

    // Coordenadas del "cuadrado"
    const x = startX + (isLeft ? 0 : 0);
    const y = groupTop;
    const s = groupSize;

    // 1: lado izquierdo (arriba a abajo)
    // 2: lado superior (izq a der)
    // 3: lado derecho (arriba a abajo)
    // 4: lado inferior (izq a der)
    // 5: diagonal (arriba-izq a abajo-der)
    if(inGroup >= 1) svg.appendChild(line(x, y+6, x, y+s-6));
    if(inGroup >= 2) svg.appendChild(line(x+6, y, x+s-6, y));
    if(inGroup >= 3) svg.appendChild(line(x+s, y+6, x+s, y+s-6));
    if(inGroup >= 4) svg.appendChild(line(x+6, y+s, x+s-6, y+s));
    if(inGroup >= 5) svg.appendChild(line(x+10, y+10, x+s-10, y+s-10));

    // Si el grupo está vacío, no dibujamos nada (queda limpio)
    // pero dejamos el espacio para que el layout sea estable.
  }

  return svg;
}

function renderHalfLine(){
  // línea horizontal en la mitad del puntaje objetivo
  // Ej: 40 -> mitad 20 (50% del alto del tablero)
  // Como el tablero es visual, la dejamos centrada (50%).
  // Si querés que cambie según objetivo (igual siempre es la mitad), queda 50%.
  const halfLine = $("halfLine");
  halfLine.style.top = "50%";
}

function renderGame(){
  $("teamATitle").textContent = state.teamA;
  $("teamBTitle").textContent = state.teamB;

  // Render marcas
  const marksA = $("marksA");
  const marksB = $("marksB");
  marksA.innerHTML = "";
  marksB.innerHTML = "";
  marksA.appendChild(buildMarksSVG(state.scoreA, true));
  marksB.appendChild(buildMarksSVG(state.scoreB, false));

  renderHalfLine();
}

function openWinnerModal(winnerSide){
  state.pendingWinner = winnerSide;
  const name = winnerSide === "A" ? state.teamA : state.teamB;
  $("winnerText").textContent = `¿El equipo ganador es ${name}?`;
  $("winnerModal").classList.add("modalOverlay--open");
  $("winnerModal").setAttribute("aria-hidden","false");
}

function closeWinnerModal(){
  $("winnerModal").classList.remove("modalOverlay--open");
  $("winnerModal").setAttribute("aria-hidden","true");
}

/* ========= Reglas (contenido) ========= */
const rulesContent = {
  tactica: {
    title: "Táctica y objetivo",
    html: `
      <h2>Táctica y objetivo</h2>
      <p>El objetivo del juego es alcanzar primero un número acordado previamente de puntos (normalmente 30 o 40).</p>
      <p>El puntaje se divide generalmente en malas y buenas. Por ejemplo, en un partido a 30 puntos, las primeras 15 se denominan "malas" y las segundas 15 son las "buenas".</p>
    `
  },
  modo: {
    title: "Modo de Juego",
    html: `
      <h2>Modo de Juego</h2>
      <p>Se reparten 3 cartas a cada jugador y se da vuelta una carta, que se denomina “muestra”. Se juega por “manos” y se otorgan puntos por “flor” o “envido” y “truco”.</p>
      <p>Aquel que tire la carta con el valor más alto en la mano, gana la mano. El mejor de tres manos gana la ronda y los puntos que esta valga, dependiendo de los cantos, envíos o gritos que se hayan realizado.</p>
      <p>El jugador situado a la derecha de quien repartió las cartas es quien empieza a jugar, luego el siguiente y así sucesivamente.</p>
      <p>El jugador que haya ganado la mano empieza la segunda ronda, y el equipo que perdió la primera debe obligatoriamente ganar la segunda.</p>
      <p>Los puntos del juego se ganan en función de alguna de 3 instancias o todas: “Envido”, “Flor” y/o “Truco”.</p>
      <ul>
        <li><b>Envido:</b> Envido / Real Envido / Falta Envido.</li>
        <li><b>Flor:</b> Flor / Con Flor Envido / Contra Flor al Resto.</li>
        <li><b>Truco:</b> Truco / Retruco / Vale Cuatro.</li>
      </ul>
    `
  },
  jugadores: {
    title: "Jugadores",
    html: `
      <h2>Jugadores</h2>
      <p><b>Juego 1 contra 1</b></p>
      <p><b>Juego en equipos</b></p>
      <ul>
        <li>4 jugadores: 2 contra 2</li>
        <li>6 jugadores: 3 contra 3</li>
      </ul>
      <p>Las reglas son las mismas, con la diferencia de que para ganar cada mano, la carta que cuenta es la carta más alta jugada por cada miembro de la pareja.</p>
      <p>Cuando se juega de 6, mientras se está en “malas”, se alternan los turnos en rondas de 3 contra 3 y de 1 contra 1 (pico a pico), uno a la vez.</p>
    `
  },
  cartas: {
    title: "Cartas",
    html: `
      <h2>Cartas</h2>
      <p>El truco se juega con una baraja española sin ochos, sin nueves ni comodines. Las cartas tienen una jerarquía determinada.</p>
      <p><b>Piezas</b> (según la muestra): 2 (30), 4 (29), 5 (28), 11 (27), 10 (27).</p>
      <p><b>Matas</b>: 1 de Espadas, 1 de Bastos, 7 de Espadas, 7 de Oros.</p>
      <p>El resto coincide con su valor nominal excepto los 10, 11 y 12. Los 10, 11 y 12 (si no son de la muestra) valen 0 y se denominan “negras”.</p>
    `
  },
  envido: {
    title: "Valor del Envido",
    html: `
      <h2>Valor del Envido</h2>
      <p><b>Cómo conocer el valor del Envido</b></p>
      <p>Si se tiene una pieza, es el valor de la pieza más la carta más alta de las otras dos. Ej: 4 de la muestra (29) + 5 = 34.</p>
      <p>En caso de no tener pieza, si se tienen 2 cartas del mismo palo, se suman y al resultado se le suman 20. Ej: 7 de basto + 5 de basto + 20 = 32.</p>
      <p>Si no se tiene pieza y las 3 cartas son de distinto palo, el valor del envido es la carta más alta.</p>
      <p>El envido máximo posible es 37 (2 de la muestra y un 7).</p>
    `
  },
  flor: {
    title: "Valor de la Flor",
    html: `
      <h2>Valor de la Flor</h2>
      <p><b>Cómo conocer el valor de la Flor</b></p>
      <p>El puntaje de la FLOR se realiza sumando el valor de las 3 cartas.</p>
      <p>Si se tiene más de una pieza, se toma el valor completo de la más alta, y del resto de las piezas suma solamente el último dígito. Las “negras” (10, 11 y 12 que no son de la muestra) suman 0.</p>
      <p>Ejemplo: 2 y 5 de la muestra + 10 de otro palo → 30 + 8 + 0.</p>
      <p>El máximo puntaje de la FLOR es 47 (2, 4 y 5 de la muestra: 30 + 9 + 8).</p>
    `
  },
  senas: {
    title: "Señas",
    html: `
      <h2>Señas</h2>
      <p>Dejé esta sección lista para que me pases el contenido y te la cargo igual que “Reglas”.</p>
    `
  },
  versos: {
    title: "Versos",
    html: `
      <h2>Versos</h2>
      <p>Dejé esta sección lista para que me pases el contenido y te la cargo igual que “Reglas”.</p>
    `
  }
};

function openDetail(key){
  const item = rulesContent[key];
  if(!item) return;
  $("detailTitle").textContent = item.title;
  $("detailContent").innerHTML = item.html;
  showScreen("screenRuleDetail");
}

function applyRulesSearch(q){
  const query = (q || "").trim().toLowerCase();
  const rows = Array.from(document.querySelectorAll(".rulesRow, .submenuRow"));
  rows.forEach(el => {
    const text = el.innerText.toLowerCase();
    el.style.display = text.includes(query) ? "" : "none";
  });

  // si busca algo, abrimos submenu para que lo vea
  if(query){
    $("submenuReglas").classList.add("submenu--open");
    $("chevReglas").textContent = "⌄";
  }
}

/* ========= Eventos ========= */
function init(){
  loadSettings();

  // Start screen - set values
  $("teamAInput").value = state.teamA;
  $("teamBInput").value = state.teamB;
  $("targetSelect").value = String(state.target);

  $("clearA").addEventListener("click", () => { $("teamAInput").value = ""; $("teamAInput").focus(); });
  $("clearB").addEventListener("click", () => { $("teamBInput").value = ""; $("teamBInput").focus(); });

  $("startBtn").addEventListener("click", () => {
    const a = ($("teamAInput").value || "NOSOTROS").trim().toUpperCase();
    const b = ($("teamBInput").value || "ELLOS").trim().toUpperCase();
    const t = Number($("targetSelect").value) || 40;

    state.teamA = a;
    state.teamB = b;
    state.target = t;

    saveSettings();
    resetGame();

    showScreen("screenGame");
  });

  // Game - Nav
  $("newGameBtn").addEventListener("click", () => {
    showScreen("screenStart");
  });

  $("rulesBtn").addEventListener("click", () => {
    showScreen("screenRules");
  });

  // Touch areas add point
  function addPoint(side){
    if(side === "A"){
      state.scoreA = clamp(state.scoreA + 1, 0, state.target);
      renderGame();
      if(state.scoreA === state.target){
        openWinnerModal("A");
      }
    }else{
      state.scoreB = clamp(state.scoreB + 1, 0, state.target);
      renderGame();
      if(state.scoreB === state.target){
        openWinnerModal("B");
      }
    }
  }

  function minusPoint(side){
    if(side === "A"){
      state.scoreA = clamp(state.scoreA - 1, 0, state.target);
    }else{
      state.scoreB = clamp(state.scoreB - 1, 0, state.target);
    }
    renderGame();
  }

  // Importante: que sea toda el área táctil
  $("touchA").addEventListener("pointerdown", (e) => { e.preventDefault(); addPoint("A"); });
  $("touchB").addEventListener("pointerdown", (e) => { e.preventDefault(); addPoint("B"); });

  $("minusA").addEventListener("click", () => minusPoint("A"));
  $("minusB").addEventListener("click", () => minusPoint("B"));

  // Modal ganador
  $("winnerYes").addEventListener("click", () => {
    closeWinnerModal();
    showScreen("screenStart");
  });

  $("winnerNo").addEventListener("click", () => {
    // si el usuario dice "No", eliminamos ese último punto y seguimos
    if(state.pendingWinner === "A") state.scoreA = clamp(state.scoreA - 1, 0, state.target);
    if(state.pendingWinner === "B") state.scoreB = clamp(state.scoreB - 1, 0, state.target);
    state.pendingWinner = null;
    closeWinnerModal();
    renderGame();
  });

  // Rules screen
  $("backFromRules").addEventListener("click", () => showScreen("screenGame"));
  $("backFromDetail").addEventListener("click", () => showScreen("screenRules"));

  // Toggle submenu reglas
  document.querySelector('[data-toggle="reglas"]').addEventListener("click", () => {
    const sub = $("submenuReglas");
    const open = sub.classList.toggle("submenu--open");
    $("chevReglas").textContent = open ? "⌄" : "›";
  });

  // abrir detalle desde submenu + secciones
  document.querySelectorAll("[data-open]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-open");
      openDetail(key);
    });
  });

  // buscador
  $("rulesSearch").addEventListener("input", (e) => applyRulesSearch(e.target.value));

  // inicial render
  renderGame();
}

init();