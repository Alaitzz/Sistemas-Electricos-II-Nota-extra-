// ferraris.js  - simulador campo giratorio + motor asincrono
// mezcla de varios snippets que fui juntando

'use strict'

// --- estado global ---
var sim = {
  t: 0, freq: 50, voltage: 230, speed: 1.0,
  dir: 1, slip: 0.05, poles: 1, running: true,
  showPhases: true, showResultant: true, showRotor: true,
  showFlux: true, showCoils: true
}

var mainCanvas   = document.getElementById('mainCanvas')
var waveCanvas   = document.getElementById('waveCanvas')
var phasorCanvas = document.getElementById('phasorCanvas')
var mc = mainCanvas.getContext('2d')
var wc = waveCanvas.getContext('2d')
var pc = phasorCanvas.getContext('2d')

// resize
function resize() {
  var wr = mainCanvas.parentElement.getBoundingClientRect()
  var sz = Math.min(wr.width, wr.height) - 20
  mainCanvas.width = sz; mainCanvas.height = sz
  waveCanvas.width = waveCanvas.parentElement.clientWidth - 28
  waveCanvas.height = 98
}
window.addEventListener('resize', resize)
resize()

// helpers sliders
function bindRange(id, key, dispId, fmt) {
  var el = document.getElementById(id)
  var dp = document.getElementById(dispId)
  function update() {
    var v = parseFloat(el.value)
    sim[key] = v
    dp.textContent = fmt ? fmt(v) : v
    var pct = (el.value - el.min) / (el.max - el.min) * 100
    el.style.background = 'linear-gradient(to right,#00c8f0 '+pct+'%,#1a3352 '+pct+'%)'
  }
  el.addEventListener('input', update)
  update()
}

bindRange('freq',    'freq',    'v-freq',    null)
bindRange('voltage', 'voltage', 'v-voltage', null)
bindRange('speed',   'speed',   'v-speed',   function(v){ return v.toFixed(1)+'×' })
bindRange('slip',    'slip',    'v-slip',    function(v){ sim.slip = v/100; return v.toFixed(1) })
bindRange('poles',   'poles',   'v-poles',   null)

// corrijo el slip inicial
sim.slip = 0.05

document.getElementById('btn-cw').addEventListener('click', function(){
  sim.dir = 1
  document.getElementById('btn-cw').classList.add('on')
  document.getElementById('btn-ccw').classList.remove('on')
})
document.getElementById('btn-ccw').addEventListener('click', function(){
  sim.dir = -1
  document.getElementById('btn-ccw').classList.add('on')
  document.getElementById('btn-cw').classList.remove('on')
})

document.getElementById('show-phases').addEventListener('change',    function(e){ sim.showPhases    = e.target.checked })
document.getElementById('show-resultant').addEventListener('change', function(e){ sim.showResultant = e.target.checked })
document.getElementById('show-rotor').addEventListener('change',     function(e){ sim.showRotor     = e.target.checked })
document.getElementById('show-flux').addEventListener('change',      function(e){ sim.showFlux      = e.target.checked })
document.getElementById('show-coils').addEventListener('change',     function(e){ sim.showCoils     = e.target.checked })

var btnPlay = document.getElementById('btn-play')
btnPlay.addEventListener('click', function(){
  sim.running = !sim.running
  btnPlay.textContent = sim.running ? '⏸ PAUSAR' : '▶ REANUDAR'
})
document.getElementById('btn-reset').addEventListener('click', function(){ sim.t = 0 })

// --- física ---
function calcFisica(t) {
  var w = 2 * Math.PI * sim.freq
  var d = sim.dir
  var iR = Math.cos(w*t)
  var iS = Math.cos(w*t - d * 2*Math.PI/3)
  var iT = Math.cos(w*t - d * 4*Math.PI/3)
  var aR = 0, aS = d*2*Math.PI/3, aT = d*4*Math.PI/3
  var Bx = iR*Math.cos(aR) + iS*Math.cos(aS) + iT*Math.cos(aT)
  var By = iR*Math.sin(aR) + iS*Math.sin(aS) + iT*Math.sin(aT)
  var Bmod  = Math.sqrt(Bx*Bx + By*By)
  var Bang  = Math.atan2(By, Bx)
  var ns    = 60 * sim.freq / sim.poles
  var nr    = ns * (1 - sim.slip)
  var wr2   = 2 * Math.PI * nr / 60
  var rotA  = wr2 * t * d
  return { iR:iR, iS:iS, iT:iT, Bx:Bx, By:By, Bmod:Bmod, Bang:Bang,
           ns:ns, nr:nr, omega:w, rotAngle:rotA }
}

// --- historial ondas ---
var hist = { iR:[], iS:[], iT:[] }
var HMAX = 300
function addHist(p) {
  hist.iR.push(p.iR); hist.iS.push(p.iS); hist.iT.push(p.iT)
  if (hist.iR.length > HMAX) { hist.iR.shift(); hist.iS.shift(); hist.iT.shift() }
}

// --- dibujo motor principal ---
function drawMotor(ctx, t) {
  var W = mainCanvas.width, H = mainCanvas.height
  var cx = W/2, cy = H/2
  var R  = Math.min(W,H) * 0.38
  var Rr = R * 0.55
  var p  = calcFisica(t)

  ctx.clearRect(0, 0, W, H)

  // grid de fondo
  ctx.save()
  ctx.strokeStyle = 'rgba(0,200,240,0.05)'
  ctx.lineWidth = 1
  for (var r = R*0.3; r <= R*1.3; r += R*0.3) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke()
  }
  ctx.beginPath(); ctx.moveTo(cx-R*1.3,cy); ctx.lineTo(cx+R*1.3,cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx,cy-R*1.3); ctx.lineTo(cx,cy+R*1.3); ctx.stroke()
  ctx.restore()

  // líneas de flujo
  if (sim.showFlux && p.Bmod > 0.01) {
    ctx.save()
    ctx.translate(cx, cy); ctx.rotate(-p.Bang)
    var nL = 7
    for (var i = -Math.floor(nL/2); i <= Math.floor(nL/2); i++) {
      var ox = (i / (nL/2)) * R * 0.44
      var al = (1 - Math.abs(i)/(nL/2+1)) * 0.15 * p.Bmod
      ctx.strokeStyle = 'rgba(240,192,0,'+al+')'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 9])
      ctx.beginPath(); ctx.moveTo(ox, -R*1.15); ctx.lineTo(ox, R*1.15); ctx.stroke()
    }
    ctx.setLineDash([]); ctx.restore()
  }

  // anillo estátor
  ctx.save()
  ctx.lineWidth = R * 0.11
  ctx.strokeStyle = '#16304a'
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.stroke()
  ctx.shadowColor = 'rgba(0,200,240,0.3)'; ctx.shadowBlur = 12
  ctx.strokeStyle = 'rgba(0,200,240,0.45)'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(cx, cy, R*1.025, 0, Math.PI*2); ctx.stroke()
  ctx.restore()

  // devanados
  if (sim.showCoils) {
    var fases = [
      { i: p.iR, ang: 0,                color: '#f03050' },
      { i: p.iS, ang: sim.dir*2*Math.PI/3, color: '#28e080' },
      { i: p.iT, ang: sim.dir*4*Math.PI/3, color: '#4090ff' }
    ]
    fases.forEach(function(f) {
      [-1,1].forEach(function(side) {
        var a = f.ang + side * Math.PI
        var sr = R * 1.01, sw = R*0.07, sh = R*0.14
        ctx.save()
        ctx.translate(cx + sr*Math.cos(a), cy - sr*Math.sin(a))
        ctx.rotate(-a + Math.PI/2)
        ctx.globalAlpha = 0.4 + Math.abs(f.i)*0.55
        ctx.fillStyle = f.color
        ctx.fillRect(-sw/2, -sh/2, sw, sh)
        ctx.globalAlpha = 1
        var dot = (f.i * side) > 0
        if (dot) {
          ctx.fillStyle = '#fff'
          ctx.beginPath(); ctx.arc(0, 0, sw*0.2, 0, Math.PI*2); ctx.fill()
        } else {
          ctx.fillStyle = '#fff'
          ctx.font = (sw*1.4)+'px monospace'
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          ctx.fillText('×', 0, 0)
        }
        ctx.restore()
      })
    })
  }

  // rotor
  if (sim.showRotor) {
    var rg = ctx.createRadialGradient(cx,cy,0,cx,cy,Rr)
    rg.addColorStop(0, 'rgba(40,22,8,0.95)')
    rg.addColorStop(1, 'rgba(75,40,18,0.95)')
    ctx.save()
    ctx.beginPath(); ctx.arc(cx,cy,Rr,0,Math.PI*2)
    ctx.fillStyle = rg; ctx.fill()
    ctx.strokeStyle = '#f07030'; ctx.lineWidth = 1.5
    ctx.shadowColor = 'rgba(240,112,48,0.4)'; ctx.shadowBlur = 10
    ctx.stroke(); ctx.restore()

    ctx.save()
    ctx.translate(cx, cy); ctx.rotate(p.rotAngle)
    var nB = 12
    for (var bi = 0; bi < nB; bi++) {
      var ba = (bi/nB) * Math.PI * 2
      var gw = Math.abs(p.iR) * 0.6
      ctx.strokeStyle = 'rgba(255,'+(120+Math.round(gw*80))+',53,'+(0.5+gw*0.4)+')'
      ctx.lineWidth = 2.5
      ctx.shadowColor = 'rgba(255,107,53,0.5)'; ctx.shadowBlur = gw*10
      ctx.beginPath()
      ctx.moveTo(0.35*Rr*Math.cos(ba), 0.35*Rr*Math.sin(ba))
      ctx.lineTo(0.91*Rr*Math.cos(ba), 0.91*Rr*Math.sin(ba))
      ctx.stroke()
    }
    ctx.beginPath(); ctx.arc(0,0,0.91*Rr,0,Math.PI*2)
    ctx.strokeStyle='rgba(255,107,53,0.65)'; ctx.lineWidth=3; ctx.shadowBlur=8; ctx.stroke()
    ctx.beginPath(); ctx.arc(0,0,0.34*Rr,0,Math.PI*2); ctx.stroke()
    ctx.beginPath(); ctx.arc(0,0,0.1*Rr,0,Math.PI*2)
    ctx.fillStyle='#aaa'; ctx.fill()
    ctx.restore()
  }

  // fasores de fase
  if (sim.showPhases) {
    var fasesDraw = [
      { i: p.iR, ang: 0,                   col: '#f03050', glow: 'rgba(240,48,80,0.5)',  lbl: 'B̃R' },
      { i: p.iS, ang: sim.dir*2*Math.PI/3, col: '#28e080', glow: 'rgba(40,224,128,0.5)', lbl: 'B̃S' },
      { i: p.iT, ang: sim.dir*4*Math.PI/3, col: '#4090ff', glow: 'rgba(64,144,255,0.5)', lbl: 'B̃T' }
    ]
    fasesDraw.forEach(function(f) {
      var sc = R * 0.68 * f.i
      var ex = cx + sc * Math.cos(f.ang)
      var ey = cy - sc * Math.sin(f.ang)
      ctx.save()
      ctx.shadowColor = f.glow; ctx.shadowBlur = 14
      drawArrow(ctx, cx, cy, ex, ey, f.col, 2, 10)
      ctx.restore()
      var lx = cx + R*0.84*Math.cos(f.ang)
      var ly = cy - R*0.84*Math.sin(f.ang)
      ctx.save()
      ctx.font = 'bold 13px Rajdhani'
      ctx.fillStyle = f.col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.shadowColor = f.glow; ctx.shadowBlur = 8
      ctx.fillText(f.lbl, lx, ly)
      ctx.restore()
    })
  }

  // resultante
  if (sim.showResultant) {
    var sc2 = R * 0.65
    var rex = cx + sc2*p.Bx, rey = cy - sc2*p.By
    ctx.save()
    ctx.shadowColor = 'rgba(240,192,0,0.8)'; ctx.shadowBlur = 22
    drawArrow(ctx, cx, cy, rex, rey, '#f0c000', 3, 13)
    ctx.restore()
    ctx.save()
    ctx.beginPath(); ctx.arc(rex, rey, 4, 0, Math.PI*2)
    ctx.fillStyle = '#f0c000'
    ctx.shadowColor = '#f0c000'; ctx.shadowBlur = 18
    ctx.fill(); ctx.restore()
  }

  // punto central
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI*2)
  ctx.fillStyle = '#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=8; ctx.fill()
  ctx.restore()
}

// flecha
function drawArrow(ctx, x1, y1, x2, y2, col, lw, hs) {
  var dx = x2-x1, dy = y2-y1
  var ang = Math.atan2(dy, dx)
  var len = Math.sqrt(dx*dx+dy*dy)
  if (len < 2) return
  ctx.strokeStyle = col; ctx.fillStyle = col
  ctx.lineWidth = lw; ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2 - hs*Math.cos(ang)*0.5, y2 - hs*Math.sin(ang)*0.5)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - hs*Math.cos(ang-0.42), y2 - hs*Math.sin(ang-0.42))
  ctx.lineTo(x2 - hs*Math.cos(ang+0.42), y2 - hs*Math.sin(ang+0.42))
  ctx.closePath(); ctx.fill()
}

// ondas
function drawWave(ctx, t) {
  var W = waveCanvas.width, H = waveCanvas.height
  ctx.clearRect(0, 0, W, H)
  ctx.save()
  ctx.strokeStyle = 'rgba(0,200,240,0.12)'; ctx.lineWidth = 1
  ctx.setLineDash([4,6])
  ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.stroke()
  ctx.setLineDash([]); ctx.restore()

  function linea(data, color) {
    if (data.length < 2) return
    ctx.save()
    ctx.strokeStyle = color; ctx.lineWidth = 1.7
    ctx.shadowColor = color; ctx.shadowBlur = 5
    ctx.beginPath()
    data.forEach(function(v, i) {
      var x = (i/(HMAX-1))*W, y = H/2 - v*H*0.41
      i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y)
    })
    ctx.stroke(); ctx.restore()
  }
  linea(hist.iR, '#f03050')
  linea(hist.iS, '#28e080')
  linea(hist.iT, '#4090ff')
}

// fasores pequeños
function drawPhasors(ctx, t) {
  var W = phasorCanvas.width, H = phasorCanvas.height
  var cx = W/2, cy = H/2, R = Math.min(W,H)*0.37
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(5,10,16,0.85)'; ctx.fillRect(0,0,W,H)
  ctx.strokeStyle='rgba(0,200,240,0.07)'; ctx.lineWidth=1
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx,cy,R*0.5,0,Math.PI*2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx-R*1.1,cy); ctx.lineTo(cx+R*1.1,cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx,cy-R*1.1); ctx.lineTo(cx,cy+R*1.1); ctx.stroke()

  var w = 2*Math.PI*sim.freq
  var d = sim.dir
  var fases2 = [
    { ang: w*t,              col: '#f03050', lbl: 'ÎR' },
    { ang: w*t-d*2*Math.PI/3, col: '#28e080', lbl: 'ÎS' },
    { ang: w*t-d*4*Math.PI/3, col: '#4090ff', lbl: 'ÎT' }
  ]
  fases2.forEach(function(f) {
    var ex = cx+R*Math.cos(f.ang), ey = cy-R*Math.sin(f.ang)
    ctx.save()
    ctx.shadowColor=f.col; ctx.shadowBlur=8
    drawArrow(ctx, cx, cy, ex, ey, f.col, 1.5, 7)
    ctx.font='bold 11px Rajdhani'; ctx.fillStyle=f.col
    ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillText(f.lbl, cx+(R+14)*Math.cos(f.ang), cy-(R+14)*Math.sin(f.ang))
    ctx.restore()
  })
  ctx.save()
  ctx.font='10px Share Tech Mono'; ctx.fillStyle='rgba(0,200,240,0.35)'
  ctx.textAlign='center'; ctx.fillText('FASORES', cx, H-7); ctx.restore()
}

// actualizar datos panel
function updateData(t, p) {
  var ns = p.ns, nr = p.nr, s = sim.slip * 100
  document.getElementById('chip-ns').textContent = 'ns = '+ns.toFixed(0)+' rpm'
  document.getElementById('chip-nr').textContent = 'nr = '+nr.toFixed(0)+' rpm'
  document.getElementById('chip-s').textContent  = 's = '+s.toFixed(1)+'%'
  document.getElementById('d-t').textContent   = t.toFixed(3)+' s'
  document.getElementById('d-w').textContent   = p.omega.toFixed(1)+' rad/s'
  document.getElementById('d-b').textContent   = (p.Bmod*1.5).toFixed(3)+' T'
  document.getElementById('d-ang').textContent = (p.Bang*180/Math.PI).toFixed(1)+'°'
  var Im = sim.voltage / 230
  document.getElementById('d-ir').textContent = (p.iR*Im).toFixed(2)+' A'
  document.getElementById('d-is').textContent = (p.iS*Im).toFixed(2)+' A'
  document.getElementById('d-it').textContent = (p.iT*Im).toFixed(2)+' A'
  document.getElementById('d-ns').textContent = ns.toFixed(0)+' rpm'
  document.getElementById('d-nr').textContent = nr.toFixed(0)+' rpm'
  document.getElementById('d-s').textContent  = s.toFixed(2)+' %'
  var T = sim.slip < 0.001 ? 0 : (sim.voltage/230)*(sim.slip/0.05)*12.5
  document.getElementById('d-par').textContent = T.toFixed(1)+' N·m'
}

// loop principal
var lastT = null
function loop(ts) {
  if (!lastT) lastT = ts
  var dt = (ts - lastT) / 1000
  lastT = ts
  if (sim.running) sim.t += dt * sim.speed
  var p = calcFisica(sim.t)
  addHist(p)
  drawMotor(mc, sim.t)
  drawWave(wc, sim.t)
  drawPhasors(pc, sim.t)
  updateData(sim.t, p)
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)
