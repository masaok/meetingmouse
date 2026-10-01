/**
 * The grid page's browser script, served inline. Plain JavaScript with no build step, so a
 * host mounts one route and ships nothing else. It reads the state the server embedded, lets
 * the viewer paint their side, redraws the group's side at once, and saves in the background.
 * Its behavior is covered by driving a real browser; see docs/WEB_GRID.md#verifying.
 */
export const CLIENT_SCRIPT = String.raw`(function () {
  var byId = function (id) { return document.getElementById(id); };
  var all = function (selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  };
  var state = JSON.parse(byId("state").textContent);
  var endpoint = location.pathname;
  var mine = new Set(state.me.slots);
  var touched = false;
  var dirty = false;
  var saving = false;
  var drag = null;
  var timer = null;
  var myGrid = byId("mine-grid");
  var myCells = all("#mine-grid .cell[data-slot]");
  var groupCells = all("#group-grid .cell[data-slot]");
  var statusEl = byId("save-status");
  var whoEl = byId("who");
  var WHO_HINT = whoEl.textContent;

  function isOpen() { return state.status === "open"; }
  function total() { return state.othersTotal + (state.me.responded || touched ? 1 : 0); }
  function namesFor(slot) {
    var names = (state.others[slot] || []).slice();
    if (mine.has(slot)) names.push(state.me.name);
    return names;
  }
  function setStatus(text, bad) {
    statusEl.textContent = text;
    statusEl.classList.toggle("bad", !!bad);
  }

  function drawMine() {
    myCells.forEach(function (cell) {
      var on = mine.has(+cell.dataset.slot);
      cell.classList.toggle("on", on);
      cell.setAttribute("aria-checked", on ? "true" : "false");
    });
  }
  function drawLegend(t) {
    var steps = Math.min(t, 5);
    var boxes = "";
    for (var i = 0; i <= steps; i++)
      boxes += '<i style="--a:' + (steps ? i / steps : 0) + '"></i>';
    byId("legend").innerHTML =
      "<span>0/" + t + " available</span><span class=\"scale\">" + boxes +
      "</span><span>" + t + "/" + t + " available</span>";
  }
  function drawGroup() {
    var t = total();
    groupCells.forEach(function (cell) {
      var n = namesFor(+cell.dataset.slot).length;
      cell.style.setProperty("--a", t ? n / t : 0);
    });
    byId("responded").textContent =
      t + (t === 1 ? " person has" : " people have") + " responded";
    drawLegend(t);
  }
  function drawLock() {
    document.body.classList.toggle("closed", !isOpen());
    myCells.forEach(function (cell) { cell.tabIndex = isOpen() ? 0 : -1; });
  }
  function draw() { drawMine(); drawGroup(); drawLock(); }

  function adopt(next, takeMine) {
    state = next;
    if (takeMine) mine = new Set(state.me.slots);
    draw();
  }

  function save() {
    if (saving) return;
    saving = true;
    dirty = false;
    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slots: Array.from(mine) }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { status: res.status, data: data }; });
      })
      .then(function (result) {
        saving = false;
        if (result.status === 409) {
          dirty = false;
          adopt(result.data.state, true);
          setStatus("This poll is no longer open. Your last change was not saved.", true);
          return;
        }
        if (result.status !== 200) throw new Error("save failed");
        adopt(result.data, !dirty && !drag);
        if (dirty) save();
        else setStatus("Saved");
      })
      .catch(function () {
        saving = false;
        dirty = true;
        setStatus("Not saved. Retrying…", true);
        clearTimeout(timer);
        timer = setTimeout(save, 3000);
      });
  }
  function changed() {
    touched = true;
    dirty = true;
    setStatus("Saving…");
    clearTimeout(timer);
    timer = setTimeout(save, 250);
  }

  function cellAt(x, y) {
    var el = document.elementFromPoint(x, y);
    return el && el.closest ? el.closest("#mine-grid .cell[data-slot]") : null;
  }
  function paintTo(cell) {
    var r0 = Math.min(drag.r, +cell.dataset.r);
    var r1 = Math.max(drag.r, +cell.dataset.r);
    var c0 = Math.min(drag.c, +cell.dataset.c);
    var c1 = Math.max(drag.c, +cell.dataset.c);
    mine = new Set(drag.base);
    myCells.forEach(function (other) {
      var r = +other.dataset.r;
      var c = +other.dataset.c;
      if (r < r0 || r > r1 || c < c0 || c > c1) return;
      if (drag.on) mine.add(+other.dataset.slot);
      else mine.delete(+other.dataset.slot);
    });
    touched = true;
    drawMine();
    drawGroup();
  }
  myGrid.addEventListener("pointerdown", function (event) {
    if (!isOpen() || event.button > 0) return;
    var cell = cellAt(event.clientX, event.clientY);
    if (!cell) return;
    event.preventDefault();
    drag = {
      r: +cell.dataset.r,
      c: +cell.dataset.c,
      on: !mine.has(+cell.dataset.slot),
      base: new Set(mine),
    };
    paintTo(cell);
  });
  window.addEventListener("pointermove", function (event) {
    if (!drag) return;
    var cell = cellAt(event.clientX, event.clientY);
    if (cell) paintTo(cell);
  });
  window.addEventListener("pointerup", function () {
    if (!drag) return;
    drag = null;
    changed();
  });
  window.addEventListener("pointercancel", function () {
    if (!drag) return;
    mine = drag.base;
    drag = null;
    draw();
  });
  myGrid.addEventListener("keydown", function (event) {
    if (!isOpen() || (event.key !== " " && event.key !== "Enter")) return;
    var cell = event.target.closest ? event.target.closest(".cell[data-slot]") : null;
    if (!cell) return;
    event.preventDefault();
    var slot = +cell.dataset.slot;
    if (mine.has(slot)) mine.delete(slot);
    else mine.add(slot);
    drawMine();
    drawGroup();
    changed();
  });

  byId("group-grid").addEventListener("pointerover", function (event) {
    var cell = event.target.closest ? event.target.closest(".cell[data-slot]") : null;
    if (!cell) return;
    var names = namesFor(+cell.dataset.slot);
    whoEl.textContent =
      cell.dataset.label + ": " + names.length + "/" + total() + " free" +
      (names.length ? " (" + names.join(", ") + ")" : "");
  });
  byId("group-grid").addEventListener("pointerleave", function () {
    whoEl.textContent = WHO_HINT;
  });

  setInterval(function () {
    if (document.hidden || drag || dirty || saving) return;
    fetch(endpoint + "?format=json")
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (next) {
        if (!next || drag || dirty || saving) return;
        adopt(next, true);
      })
      .catch(function () {});
  }, 5000);

  draw();
})();`;
