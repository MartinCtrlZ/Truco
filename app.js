// app.js (MODULE)

// ------------------- Firebase (Auth + Firestore) -------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, orderBy, limit, getDocs,
  serverTimestamp, enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ✅ Tu config
const firebaseConfig = {
  apiKey: "AIzaSyA54j6ll16nc_wu-ZmtlZmO5JLaxmUIcUI",
  authDomain: "truco-a2f51.firebaseapp.com",
  projectId: "truco-a2f51",
  storageBucket: "truco-a2f51.firebasestorage.app",
  messagingSenderId: "639389569561",
  appId: "1:639389569561:web:5b138fae6c25f7374f1088"
};

// ✅ Variables (NO uses "app" para no pisarte nombres)
let fbApp = null, auth = null, db = null;
let currentUser = null;

function initFirebase() {
  // Si no hay config real, no rompe
  if (!firebaseConfig || !firebaseConfig.apiKey) return;

  // Evita inicializar 2 veces
  if (fbApp) return;

  fbApp = initializeApp(firebaseConfig);
  auth = getAuth(fbApp);
  db = getFirestore(fbApp);

  // ✅ Firestore offline (cache)
  enableIndexedDbPersistence(db).catch(() => {});

  onAuthStateChanged(auth, (user) => {
    currentUser = user || null;
    refreshAuthUI();
    refreshHistoryUI();
  });
}
initFirebase();

// ------------------- Anti zoom (doble tap) -------------------
document.addEventListener("dblclick", (e) => {
  e.preventDefault();
}, { passive: false });

// ------------------- UI Helpers -------------------
const $ = (id) => document.getElementById(id);

const screens = {
  start: $("screenStart"),
  game: $("screenGame"),
  rules: $("screenRules")
};

function showScreen(name){
  Object.values(screens).forEach(s => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

// ------------------- Start Screen -------------------
$("clearTeam1").addEventListener("click", () => $("team1Input").value = "");
$("clearTeam2").addEventListener("click", () => $("team2Input").value = "");

$("startBtn").addEventListener("click", () => {
  const t1 = ($("team1Input").value || "NOSOTROS").trim();
  const t2 = ($("team2Input").value || "ELLOS").trim();
  const target = parseInt($("targetSelect").value, 10);
  startGame(t1, t2, target);
});

// ------------------- Game State -------------------
let team1 = "NOSOTROS";
let team2 = "ELLOS";
let targetPoints = 40;
let points1 = 0;
let points2 = 0;

function startGame(t1, t2, target){
  team1 = t1.toUpperCase();
  team2 = t2.toUpperCase();
  targetPoints = target;
  points1 = 0;
  points2 = 0;

  $("team1Name").textContent = team1;
  $("team2Name").textContent = team2;

  renderAll();
  showScreen("game");
}

$("newBtn").addEventListener("click", () => showScreen("start"));
$("rulesBtn").addEventListener("click", () => {
  showScreen("rules");
  showRulesMenu();
});

// Edit names in game
$("editTeam1").addEventListener("click", () => {
  const n = prompt("Nuevo nombre para equipo 1:", team1) || team1;
  team1 = n.trim().slice(0,18).toUpperCase();
  $("team1Name").textContent = team1;
});
$("editTeam2").addEventListener("click", () => {
  const n = prompt("Nuevo nombre para equipo 2:", team2) || team2;
  team2 = n.trim().slice(0,18).toUpperCase();
  $("team2Name").textContent = team2;
});

// Tap areas to add points
$("col1").addEventListener("click", () => addPoint(1));
$("col2").addEventListener("click", () => addPoint(2));

$("minus1").addEventListener("click", (e) => { e.stopPropagation(); removePoint(1); });
$("minus2").addEventListener("click", (e) => { e.stopPropagation(); removePoint(2); });

function addPoint(team){
  if (team === 1) points1++;
  else points2++;

  const winner = checkWinner();
  if (winner){
    openWinnerModal(winner);
    return;
  }

  renderAll();
}

function removePoint(team){
  if (team === 1) points1 = Math.max(0, points1 - 1);
  else points2 = Math.max(0, points2 - 1);
  renderAll();
}

function checkWinner(){
  if (points1 >= targetPoints) return 1;
  if (points2 >= targetPoints) return 2;
  return null;
}

// ------------------- Divider H dynamic -------------------
function positionDividerH(){
  const mid = targetPoints / 2; // 10->5, 40->20, 60->30
  const h = $("dividerH");

  const rowHeight = 54;
  const y = 82 + (mid * rowHeight);
  h.style.top = `${y}px`;
}

// ------------------- Tally render -------------------
function renderTally(container, points){
  container.innerHTML = "";

  const groups = Math.floor(points / 5);
  const rest = points % 5;

  // Grupos completos de 5
  for (let g = 0; g < groups; g++){
    const row = document.createElement("div");
    row.className = "tallyRow";

    const num = document.createElement("div");
    num.className = "tallyNum";
    num.textContent = (g + 1) * 5; // muestra 5,10,15...

    const marks = document.createElement("div");
    marks.className = "tallyMarks fiveGroup";

    // 4 palitos
    for (let i = 0; i < 4; i++){
      const m = document.createElement("div");
      m.className = "mark";
      marks.appendChild(m);
    }

    // diagonal del 5
    const diag = document.createElement("div");
    diag.className = "diag";
    marks.appendChild(diag);

    row.appendChild(num);
    row.appendChild(marks);
    container.appendChild(row);
  }

  // Último grupo incompleto (1–4)
  if (rest > 0){
    const row = document.createElement("div");
    row.className = "tallyRow";

    const num = document.createElement("div");
    num.className = "tallyNum";
    num.textContent = groups * 5 + rest; // total actual

    const marks = document.createElement("div");
    marks.className = "tallyMarks";

    for (let i = 0; i < rest; i++){
      const m = document.createElement("div");
      m.className = "mark";
      marks.appendChild(m);
    }

    row.appendChild(num);
    row.appendChild(marks);
    container.appendChild(row);
  }
}

function renderAll(){
  renderTally($("tally1"), points1);
  renderTally($("tally2"), points2);
  positionDividerH();
}

// ------------------- Winner modal -------------------
const winnerModal = $("winnerModal");
let pendingWinner = null;

function openWinnerModal(winnerTeam){
  pendingWinner = winnerTeam;
  const winnerName = winnerTeam === 1 ? team1 : team2;
  $("winnerText").textContent = `¿El equipo ganador es ${winnerName}?`;
  winnerModal.classList.remove("hidden");
}

$("winnerNo").addEventListener("click", () => {
  if (pendingWinner === 1) points1 = Math.max(0, points1 - 1);
  if (pendingWinner === 2) points2 = Math.max(0, points2 - 1);

  pendingWinner = null;
  winnerModal.classList.add("hidden");
  renderAll();
});

$("winnerYes").addEventListener("click", async () => {
  const w = pendingWinner;
  pendingWinner = null;
  winnerModal.classList.add("hidden");

  const winnerName = (w === 1) ? team1 : team2;
  const result = `${points1}-${points2}`;
  await saveMatch(winnerName, result);

  showScreen("start");
});

// ------------------- Rules -------------------
const rulesData = {
  reglas: [
    { title:"Táctica y objetivo", text:`El objetivo del juego es alcanzar primero un número acordado previamente de puntos (normalmente 30 o 40). El puntaje se divide generalmente en malas y buenas. Por ejemplo, en un partido a 30 puntos, las primeras 15 se denominan “malas” y las segundas 15 son las “buenas”.`},
    { title:"Modo de Juego", text:`Se reparten 3 cartas a cada jugador y se da vuelta una carta, que se denomina “muestra”. Se juega por “manos” y se otorgan puntos por “flor” o “envido” y “truco”. El mejor de tres manos gana la ronda.`},
    { title:"Jugadores", text:`Juego 1 contra 1. Juego en equipos: 4 jugadores (2 contra 2) o 6 jugadores (3 contra 3). Las reglas son las mismas, pero para ganar cada mano cuenta la carta más alta jugada por cada miembro de la pareja.`},
    { title:"Cartas", text:`El truco se juega con baraja española sin ochos, sin nueves ni comodines. Hay jerarquía de cartas, “piezas” y “matas”.`},
    { title:"Valor del Envido", text:`Si se tiene una pieza: valor de la pieza + carta más alta de las otras dos. Si no hay pieza y hay 2 cartas del mismo palo: se suman y se le suman 20. Si las 3 son de distinto palo: vale la carta más alta. Máximo: 37 (2 de la muestra y un 7).`},
    { title:"Valor de la Flor", text:`Se suma el valor de las 3 cartas. Si hay más de una pieza: se toma el valor completo de la más alta y del resto se suma solo el último dígito. Las “negras” (10, 11 y 12 que no son de la muestra) suman 0. Máximo: 47 (2, 4 y 5 de la muestra).`}
  ],
  senas: [
    { title:"Señas", text:"(Pegá acá tus señas cuando me las pases.)" }
  ],
  versos: [
    { title:"Versos", text:"(Pegá acá tus versos cuando me los pases.)" }
  ]
};

function showRulesMenu(){
  $("rulesContent").classList.add("hidden");
  document.querySelector(".rulesMenu").classList.remove("hidden");
}

function showRulesList(section){
  document.querySelector(".rulesMenu").classList.add("hidden");
  $("rulesContent").classList.remove("hidden");
  $("rulesContentTitle").textContent = section.toUpperCase();

  const list = $("rulesList");
  list.innerHTML = "";

  rulesData[section].forEach(item => {
    const btn = document.createElement("button");
    btn.className = "ruleLink";
    btn.innerHTML = `<span>${item.title}</span><span>›</span>`;
    btn.addEventListener("click", () => {
      alert(`${item.title}\n\n${item.text}`);
    });
    list.appendChild(btn);
  });
}

document.querySelectorAll(".rulesItem").forEach(btn => {
  btn.addEventListener("click", () => showRulesList(btn.dataset.section));
});

$("rulesBackToMenu").addEventListener("click", showRulesMenu);
$("backFromRules").addEventListener("click", () => showScreen("game"));

// ------------------- Auth modal -------------------
const authModal = $("authModal");

$("authBtn").addEventListener("click", () => {
  authModal.classList.remove("hidden");
  selectTab("access");
});

$("closeAuth").addEventListener("click", () => authModal.classList.add("hidden"));

// Tabs
document.querySelectorAll(".tabBtn").forEach(b => {
  b.addEventListener("click", () => selectTab(b.dataset.tab));
});

function selectTab(tab){
  document.querySelectorAll(".tabBtn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.tabBtn[data-tab="${tab}"]`).classList.add("active");

  $("tab_access").classList.toggle("hidden", tab !== "access");
  $("tab_history").classList.toggle("hidden", tab !== "history");

  if (tab === "history") refreshHistoryUI();
}

function refreshAuthUI(){
  const status = $("authStatus");

  if (!auth){
    status.textContent = "Firebase no está listo.";
    $("logoutBtn").classList.add("hidden");
    return;
  }

  if (currentUser){
    status.textContent = `Conectado: ${currentUser.email}`;
    $("logoutBtn").classList.remove("hidden");
  } else {
    status.textContent = "No hay sesión iniciada.";
    $("logoutBtn").classList.add("hidden");
  }
}

$("loginBtn").addEventListener("click", async () => {
  if (!auth) return;
  const email = $("emailInput").value.trim();
  const pass = $("passInput").value;

  try{
    await signInWithEmailAndPassword(auth, email, pass);
  }catch(e){
    $("authStatus").textContent = "Error al entrar: " + (e?.message || e);
  }
});

$("registerBtn").addEventListener("click", async () => {
  if (!auth) return;
  const email = $("emailInput").value.trim();
  const pass = $("passInput").value;

  try{
    await createUserWithEmailAndPassword(auth, email, pass);
  }catch(e){
    $("authStatus").textContent = "Error al crear cuenta: " + (e?.message || e);
  }
});

$("logoutBtn").addEventListener("click", async () => {
  if (!auth) return;
  await signOut(auth);
});

// ------------------- History (Firestore) -------------------
async function saveMatch(winnerName, result){
  const payload = {
    winner: winnerName,
    result,
    dateISO: new Date().toISOString()
  };

  const local = JSON.parse(localStorage.getItem("truco_history") || "[]");
  local.unshift(payload);
  localStorage.setItem("truco_history", JSON.stringify(local.slice(0,50)));

  if (!db || !currentUser) return;

  try{
    await addDoc(collection(db, "users", currentUser.uid, "matches"), {
      winner: winnerName,
      result,
      createdAt: serverTimestamp()
    });
  }catch(e){}
}

function formatDate(d){
  try{
    return new Intl.DateTimeFormat("es-UY", { dateStyle:"short", timeStyle:"short" }).format(d);
  }catch{
    return d.toLocaleString();
  }
}

async function refreshHistoryUI(){
  const box = $("historyBox");

  if (!db || !currentUser){
    const local = JSON.parse(localStorage.getItem("truco_history") || "[]");
    if (!local.length){
      box.innerHTML = `<div class="muted">Sin historial todavía.</div>`;
      return;
    }
    box.innerHTML = local.map(it => {
      const d = formatDate(new Date(it.dateISO));
      return `
        <div class="historyItem">
          <div><b>Ganador:</b> ${it.winner}</div>
          <div><b>Resultado:</b> ${it.result}</div>
          <div class="muted">${d}</div>
        </div>
      `;
    }).join("");
    return;
  }

  try{
    const q = query(
      collection(db, "users", currentUser.uid, "matches"),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const snap = await getDocs(q);

    if (snap.empty){
      box.innerHTML = `<div class="muted">Sin historial todavía.</div>`;
      return;
    }

    const items = [];
    snap.forEach(doc => {
      const data = doc.data();
      const ts = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
      items.push({
        winner: data.winner,
        result: data.result,
        date: formatDate(ts)
      });
    });

    box.innerHTML = items.map(it => `
      <div class="historyItem">
        <div><b>Ganador:</b> ${it.winner}</div>
        <div><b>Resultado:</b> ${it.result}</div>
        <div class="muted">${it.date}</div>
      </div>
    `).join("");
  }catch(e){
    box.innerHTML = `<div class="muted">No se pudo cargar historial.</div>`;
  }
}

// ------------------- Service Worker (cache assets) -------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// Primer render
renderAll();
showScreen("start");
refreshAuthUI();