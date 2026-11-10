(function () {
  "use strict";
  var C = window.CONFIG, $ = function (s) { return document.querySelector(s); };
  var COLORS = ["#e4572e", "#2a9d8f", "#f4a300", "#6a4c93", "#1982c4", "#d81e5b", "#6a994e", "#8d5a3b"];
  var PAW = '<svg viewBox="0 0 40 40" fill="#fff" aria-hidden="true"><ellipse cx="20" cy="26" rx="9" ry="7"/><circle cx="8" cy="16" r="4"/><circle cx="16" cy="9" r="4"/><circle cx="24" cy="9" r="4"/><circle cx="32" cy="16" r="4"/></svg>';
  var B = null, user = null, mineRec = null, lastMs = 0, myPos = 0, flash = "";
  var open = [], lock = false, errors = 0, found = 0, t0 = 0, tick = null, alarm = null, ac = null;
  var N = C.photos.length;
  function ctx() {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function bark(loud) {
    var a = ctx(), t = a.currentTime, o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
    var base = loud ? 250 : 380, v = loud ? 1 : 0.4, d = loud ? 0.3 : 0.2;
    o.type = "sawtooth"; o.frequency.setValueAtTime(base * 1.35, t);
    o.frequency.exponentialRampToValueAtTime(base * 0.55, t + d * 0.8);
    f.type = "bandpass"; f.frequency.value = loud ? 750 : 1100; f.Q.value = 2.5;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(f); f.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.05);
  }
  function startBark() {
    if (alarm) return;
    bark(true); alarm = setInterval(function () { bark(true); }, 360); $("#alarm").hidden = false;
  }
  function stopBark() { clearInterval(alarm); alarm = null; $("#alarm").hidden = true; }
  function fmt(ms) {
    var s = Math.floor(ms / 1000), m = Math.floor(s / 60);
    return m + ":" + String(s % 60).padStart(2, "0") + "." + Math.floor((ms % 1000) / 100);
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function say(sel, txt) { $(sel).textContent = txt; }
  function localBackend() {
    var K = "ranking-demo";
    function get() { try { return JSON.parse(localStorage.getItem(K) || "[]"); } catch (e) { return []; } }
    function set(v) { try { localStorage.setItem(K, JSON.stringify(v)); } catch (e) {} }
    var u = null, cb = function () {};
    try { u = JSON.parse(localStorage.getItem("demo-user") || "null"); } catch (e) {}
    return {
      demo: true, onUser: function (f) { cb = f; f(u); },
      signIn: async function () {
        var n = prompt("Modo demonstração. Qual é o seu nome?");
        if (!n) return;
        u = { id: "demo", name: n.slice(0, 20) };
        try { localStorage.setItem("demo-user", JSON.stringify(u)); } catch (e) {}
        cb(u);
      },
      signOut: async function () { u = null; try { localStorage.removeItem("demo-user"); } catch (e) {} cb(null); },
      top: async function (n) { return get().sort(function (a, b) { return a.ms - b.ms; }).slice(0, n); },
      mine: async function (id) { return get().find(function (x) { return x.id === id; }) || null; },
      position: async function (ms) { return get().filter(function (x) { return x.ms < ms; }).length + 1; },
      save: async function (id, name, ms) {
        var l = get(), i = l.findIndex(function (x) { return x.id === id; }), better = true;
        var rec = { id: id, name: name, ms: ms, date: new Date().toISOString() };
        if (i < 0) l.push(rec);
        else if (l[i].ms <= ms) { l[i].name = name; better = false; }
        else l[i] = rec;
        set(l); return better;
      },
      rename: async function (id, name) {
        var l = get(), x = l.find(function (y) { return y.id === id; });
        if (x) { x.name = name; set(l); }
      }
    };
  }
  async function firebaseBackend() {
    var base = "https://www.gstatic.com/firebasejs/10.12.2/";
    var mods = await Promise.all([import(base + "firebase-app.js"), import(base + "firebase-auth.js"), import(base + "firebase-firestore.js")]);
    var App = mods[0], A = mods[1], F = mods[2];
    var app = App.initializeApp(C.firebase), auth = A.getAuth(app), db = F.getFirestore(app), col = F.collection(db, "ranking");
    return {
      demo: false,
      onUser: function (cb) { A.onAuthStateChanged(auth, function (u) { cb(u ? { id: u.uid, name: (u.displayName || "").slice(0, 20) } : null); }); },
      signIn: function () { return A.signInWithPopup(auth, new A.GoogleAuthProvider()); },
      signOut: function () { return A.signOut(auth); },
      top: async function (n) {
        var s = await F.getDocs(F.query(col, F.orderBy("ms", "asc"), F.limit(n)));
        return s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      },
      mine: async function (id) {
        var s = await F.getDoc(F.doc(db, "ranking", id));
        return s.exists() ? Object.assign({ id: id }, s.data()) : null;
      },
      position: async function (ms) {
        var s = await F.getCountFromServer(F.query(col, F.where("ms", "<", ms)));
        return s.data().count + 1;
      },
      save: async function (id, name, ms) {
        var ref = F.doc(db, "ranking", id), cur = await F.getDoc(ref);
        if (cur.exists() && cur.data().ms <= ms) { await F.updateDoc(ref, { name: name }); return false; }
        await F.setDoc(ref, { name: name, ms: ms, date: new Date().toISOString() }); return true;
      },
      rename: function (id, name) { return F.updateDoc(F.doc(db, "ranking", id), { name: name }); }
    };
  }
  var grid = $("#grid");
  function newGame() {
    stopBark(); clearInterval(tick); open = []; lock = false; errors = 0; found = 0; t0 = 0;
    say("#tm", fmt(0)); say("#er", "Erros: 0"); say("#pr", "Pares: 0/" + N); $("#win").hidden = true; grid.innerHTML = "";
    shuffle(C.photos.map(function (_, i) { return i; }).concat(C.photos.map(function (_, i) { return i; }))).forEach(function (i) {
      var b = document.createElement("button"); b.type = "button"; b.className = "card"; b.dataset.i = i;
      b.style.setProperty("--pc", COLORS[i % COLORS.length]); b.setAttribute("aria-label", "Carta virada para baixo");
      b.innerHTML = '<div class="in"><div class="f back">' + PAW + '</div><div class="f front"></div></div>';
      var img = new Image(); img.alt = "Foto " + (i + 1) + " de " + C.dogName;
      img.onerror = function () { var s = document.createElement("span"); s.textContent = "🐶"; img.replaceWith(s); };
      img.src = C.photos[i]; b.querySelector(".front").appendChild(img);
      b.onclick = function () { flip(b); }; grid.appendChild(b);
    });
  }
  function flip(c) {
    if (lock || c.classList.contains("up") || c.classList.contains("done")) return;
    ctx();
    if (!t0) { t0 = performance.now(); tick = setInterval(function () { say("#tm", fmt(performance.now() - t0)); }, 100); }
    c.classList.add("up"); c.setAttribute("aria-label", "Foto de " + C.dogName); open.push(c);
    if (open.length < 2) return;
    var a = open[0], b = open[1]; open = [];
    if (a.dataset.i === b.dataset.i) {
      a.classList.replace("up", "done"); b.classList.replace("up", "done"); found++;
      say("#pr", "Pares: " + found + "/" + N); if (found === N) finish();
    } else {
      errors++; say("#er", "Erros: " + errors);
      if (errors % C.alarmEvery === 0) startBark(); else bark(false);
      lock = true;
      setTimeout(function () {
        [a, b].forEach(function (x) { x.classList.remove("up"); x.setAttribute("aria-label", "Carta virada para baixo"); });
        lock = false;
      }, 850);
    }
  }
  function finish() {
    clearInterval(tick); stopBark(); lastMs = Math.round(performance.now() - t0);
    say("#tm", fmt(lastMs)); say("#wTime", fmt(lastMs));
    say("#wInfo", errors === 0 ? "Sem nenhum erro!" : errors + (errors === 1 ? " erro." : " erros."));
    var s = C.special[Math.floor(Math.random() * C.special.length)], p = $("#wPhoto");
    p.alt = "Foto especial de " + C.dogName; p.src = s;
    $("#nm").value = (mineRec && mineRec.name) || (user && user.name) || "";
    say("#wMsg", ""); $("#win").hidden = false; $("#win").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function syncAuth() {
    var a = $("#auth"); a.replaceChildren();
    if (user) {
      var s = document.createElement("span"); s.textContent = user.name || "Conectado"; a.append(s);
      var o = document.createElement("button"); o.type = "button"; o.textContent = "Sair"; o.onclick = function () { B.signOut(); }; a.append(o);
    } else {
      var i = document.createElement("button"); i.type = "button"; i.textContent = "Entrar com Google"; i.onclick = login; a.append(i);
    }
    $("#save").textContent = user ? "Salvar no ranking" : "Entrar com Google para salvar";
  }
  async function login() {
    try { await B.signIn(); } catch (e) { say("#wMsg", "Não foi possível entrar. Tente de novo."); }
  }
  $("#save").onclick = async function () {
    if (!B) return;
    if (!user) { await login(); return; }
    var name = $("#nm").value.trim().slice(0, 20);
    if (!name) { say("#wMsg", "Digite um nome para o ranking."); return; }
    this.disabled = true;
    try {
      var better = await B.save(user.id, name, lastMs); mineRec = await B.mine(user.id);
      flash = better ? "Novo melhor tempo registrado!" : "Seu melhor tempo continua " + fmt(mineRec.ms) + ". O nome foi atualizado.";
      location.hash = "#/ranking";
    } catch (e) { say("#wMsg", "Não foi possível salvar agora. Tente de novo."); }
    this.disabled = false;
  };
  function row(pos, r, me) {
    var tr = document.createElement("tr");
    if (me) { tr.className = "me"; tr.setAttribute("aria-current", "true"); }
    [pos + "º", r.name, fmt(r.ms), new Date(r.date).toLocaleDateString("pt-BR")].forEach(function (v) {
      var td = document.createElement("td"); td.textContent = v; tr.append(td);
    });
    return tr;
  }
  async function renderRank() {
    var rows = $("#rows"); rows.replaceChildren(); say("#rMsg", flash); flash = "";
    try {
      var top = await B.top(10), mineRow = null;
      top.forEach(function (r, i) {
        var me = !!user && r.id === user.id, tr = row(i + 1, r, me);
        if (me) { mineRow = tr; myPos = i + 1; } rows.append(tr);
      });
      if (user && mineRec && !mineRow) {
        myPos = await B.position(mineRec.ms);
        var g = document.createElement("tr"); g.className = "gap"; g.innerHTML = "<td colspan='4'>⋮</td>"; rows.append(g);
        mineRow = row(myPos, mineRec, true); rows.append(mineRow);
      }
      if (!top.length) say("#rMsg", "Ninguém no ranking ainda. Seja o primeiro!");
      if (mineRow) mineRow.scrollIntoView({ block: "nearest" });
    } catch (e) { say("#rMsg", "Não consegui carregar o ranking agora."); }
    $("#me").hidden = !(user && mineRec); $("#nm2").value = mineRec ? mineRec.name : ""; $("#share").disabled = !mineRec;
  }
  $("#rename").onclick = async function () {
    var name = $("#nm2").value.trim().slice(0, 20); if (!name || !user) return;
    try { await B.rename(user.id, name); mineRec.name = name; flash = "Nome atualizado."; renderRank(); }
    catch (e) { say("#rMsg", "Não foi possível alterar o nome."); }
  };
  $("#share").onclick = async function () {
    if (!mineRec) return;
    var pos = myPos || await B.position(mineRec.ms);
    var msg = "Terminei o jogo da memória de " + C.dogName + " em " + fmt(mineRec.ms) + " e estou em " + pos + "º no ranking!";
    var url = location.origin + location.pathname;
    try {
      if (navigator.share) await navigator.share({ title: document.title, text: msg, url: url });
      else { await navigator.clipboard.writeText(msg + " " + url); say("#rMsg", "Texto copiado para compartilhar."); }
    } catch (e) {}
  };
  function route() {
    var r = location.hash === "#/ranking";
    $("#vGame").hidden = r; $("#vRank").hidden = !r;
    $("#nGame").setAttribute("aria-current", r ? "false" : "page");
    $("#nRank").setAttribute("aria-current", r ? "page" : "false");
    if (r && B) renderRank();
  }
  window.addEventListener("hashchange", route);
  $("#again").onclick = newGame; $("#stopBark").onclick = stopBark;
  (async function () {
    $("#title").textContent = "Memória de " + C.dogName; document.title = "Memória de " + C.dogName;
    var ok = C.firebase && C.firebase.apiKey && !/^COLE/.test(C.firebase.apiKey);
    try { B = ok ? await firebaseBackend() : localBackend(); } catch (e) { B = localBackend(); }
    $("#demo").hidden = !B.demo;
    B.onUser(async function (u) {
      user = u; try { mineRec = u ? await B.mine(u.id) : null; } catch (e) { mineRec = null; }
      syncAuth(); if (!$("#vRank").hidden) renderRank();
    });
    route();
  })();
  syncAuth(); newGame();
})();
