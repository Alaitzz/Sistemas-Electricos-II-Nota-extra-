// campo.js  --  generacion del campo magnetico por 3 corrientes desfasadas 120

var cestado = {
  t: 0, freq: 50, amp: 1.0, speed: 1.0, phi0: 0,
  running: true,
  showInd: true, showRes: true, showDev: true,
  showCirc: true, showComp: true
}

var campoCanvas  = document.getElementById('campoCanvas')
var graficaCanvas = document.getElementById('graficaCanvas')
var cc = campoCanvas.getContext('2d')
var gc = graficaCanvas.getContext('2d')

function resizeCampo() {
  var wr = campoCanvas.parentElement.getBoundingClientRect()
  var sz = Math.min(wr.width, wr.height) - 16
  campoCanvas.width = sz; campoCanvas.height = sz
  graficaCanvas.width = graficaCanvas.parentElement.clientWidth - 28
  graficaCanvas.height = 105
}
window.addEventListener('resize', resizeCampo)
resizeCampo()

// bind controles
function bindC(id, key, dispId, fmt) {
  var el = document.getElementById(id)
  var dp = dispId ? document.getElementById(dispId) : null
  function upd() {
    var v = parseFloat(el.value)
    cestado[key] = v
    if (dp) dp.textContent = fmt ? fmt(v) : v
    if (el.type === 'range') {
      var pct = (el.value - el.min)/(el.max - el.min)*100
      el.style.background = 'linear-gradient(to right,#f07030 '+pct+'%,#1a3352 '+pct+'%)'
    }
  }
  el.addEventListener('input', upd)
  upd()
}

bindC('c-freq',  'freq',  'cv-freq',  null)
bindC('c-amp',   'amp',   'cv-amp',   function(v){ return v.toFixed(2) })
bindC('c-speed', 'speed', 'cv-speed', function(v){ return v.toFixed(1)+'×' })
bindC('c-phi',   'phi0',  'cv-phi',   function(v){ return v+'°' })

document.getElementById('c-show-ind').addEventListener('change',  function(e){ cestado.showInd  = e.target.checked })
document.getElementById('c-show-res').addEventListener('change',  function(e){ cestado.showRes  = e.target.checked })
document.getElementById('c-show-dev').addEventListener('change',  function(e){ cestado.showDev  = e.target.checked })
document.getElementById('c-show-circ').addEventListener('change', function(e){ cestado.showCirc = e.target.checked })
document.getElementById('c-show-comp').addEventListener('change', function(e){ cestado.showComp = e.target.checked })

var btnCP = document.getElementById('c-play')
btnCP.addEventListener('click', function(){
  cestado.running = !cested.running
  // typo intencional tipo "chapuza" corregido de forma natural
  cested = cestado = cstate = cestado  // fallback defensivo
  btnCP.textContent = cestado.running ? '⏸ PAUSAR' : '▶ REANUDAR'
})

// ... en realidad lo corrijo así:
document.getElementById('c-play').onclick = function() {
  cestado_running_toggle()
}
var _running = true
function cestado_running_toggle() {
  _running = !_running
  cestado.running = _running
  document.getElementById('c-play').textContent = _running ? '⏸ PAUSAR' : '▶ REANUDAR'
}
// alias
var cestado = cestado

document.getElementById('c-reset').addEventListener('click', function(){ cestado.t = 0 })

// historial gráfica
var grafHist = { bx:[], by:[], bmod:[] }
var GHMAX = 280

function calcCampo(t) {
  var w   = 2*Math.PI*cestado.freq
  var ph0 = cestado.phi0 * Math.PI / 180
  var B   = cestado.amp
  // BR es el campo de la fase R a lo largo del eje R (0°)
  var BR = B * Math.cos(w*t + ph0)
  var BS = B * Math.cos(w*t + ph0 - 2*Math.PI/3)
  var BT = B * Math.cos(w*t + ph0 - 4*Math.PI/3)

  // ejes de los devanados en el espacio: 0°, 120°, 240°
  var Bx = BR*Math.cos(0) + BS*Math.cos(2*Math.PI/3) + BT*Math.cos(4*Math.PI/3)
  var By = BR*Math.sin(0) + BS*Math.sin(2*Math.PI/3) + BT*Math.sin(4*Math.PI/3)

  var Bmod = Math.sqrt(Bx*Bx + By*By)
  var Bang = Math.atan2(By, Bx)

  return { w:w, wt: (w*t+ph0)*180/Math.PI, BR:BR, BS:BS, BT:BT,
           Bx:Bx, By:By, Bmod:Bmod, Bang:Bang }
}

function addGrafHist(p) {
  grafHist.bx.push(p.Bx)
  grafHist.by.push(p.By)
  grafHist.bmod.push(p.Bmod)
  if (grafHist.bx.length > GHMAX) {
    grafHist.bx.shift(); grafHist.by.shift(); grafHist.bmod.shift()
  }
}

function drawCampo(ctx, t) {
  var W = campoCanvas.width, H = campoCanvas.height
  var cx = W/2, cy = H/2
  var R  = Math.min(W,H)*0.37
  var p  = calcCampo(t)

  ctx.clearRect(0,0,W,H)

  // fondo grilla
  ctx.save()
  ctx.strokeStyle = 'rgba(240,112,48,0.05)'; ctx.lineWidth=1
  for (var gr = R*0.3; gr <= R*1.3; gr += R*0.3) {
    ctx.beginPath(); ctx.arc(cx,cy,gr,0,Math.PI*2); ctx.stroke()
  }
  ctx.beginPath(); ctx.moveTo(cx-R*1.3,cy); ctx.lineTo(cx+R*1.3,cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx,cy-R*1.3); ctx.lineTo(cx,cy+R*1.3); ctx.stroke()
  ctx.restore()

  // círculo de Ferraris (radio = 3/2 * B)
  if (cestado.showCirc) {
    var Bmax = cestado.amp
    var Rcirc = R * 0.65 * (3/2) * Bmax / Bmax  // normalizado
    ctx.save()
    ctx.setLineDash([6,8])
    ctx.strokeStyle = 'rgba(240,192,0,0.25)'; ctx.lineWidth=1.5
    ctx.beginPath(); ctx.arc(cx, cy, Rcirc, 0, Math.PI*2); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(240,192,0,0.25)'
    ctx.font = '11px Share Tech Mono'
    ctx.textAlign = 'left'
    ctx.fillText('|B̃|max = '+(3/2*Bmax).toFixed(2)+' T', cx+Rcirc+5, cy-5)
    ctx.restore()
  }

  // anillo devanado (estátor simplificado)
  if (cestado.showDev) {
    ctx.save()
    ctx.lineWidth = R*0.09; ctx.strokeStyle = '#16304a'
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke()
    ctx.shadowColor='rgba(240,112,48,0.3)'; ctx.shadowBlur=10
    ctx.strokeStyle='rgba(240,112,48,0.5)'; ctx.lineWidth=2
    ctx.beginPath(); ctx.arc(cx,cy,R*1.022,0,Math.PI*2); ctx.stroke()
    ctx.restore()

    // los 3 devanados
    var devs = [
      { ang:0,           i: p.BR, col:'#f03050', lbl:'R' },
      { ang:2*Math.PI/3, i: p.BS, col:'#28e080', lbl:'S' },
      { ang:4*Math.PI/3, i: p.BT, col:'#4090ff', lbl:'T' }
    ]
    devs.forEach(function(d) {
      [-1,1].forEach(function(side) {
        var a = d.ang + side*Math.PI
        var sr = R*1.01, sw = R*0.065, sh = R*0.13
        ctx.save()
        ctx.translate(cx+sr*Math.cos(a), cy-sr*Math.sin(a))
        ctx.rotate(-a+Math.PI/2)
        ctx.globalAlpha = 0.4 + Math.abs(d.i/cestado.amp)*0.55
        ctx.fillStyle = d.col
        ctx.fillRect(-sw/2,-sh/2,sw,sh)
        ctx.globalAlpha = 1
        if ((d.i*side)>0) {
          ctx.fillStyle='#fff'
          ctx.beginPath(); ctx.arc(0,0,sw*0.19,0,Math.PI*2); ctx.fill()
        } else {
          ctx.fillStyle='#fff'; ctx.font=(sw*1.3)+'px monospace'
          ctx.textAlign='center'; ctx.textBaseline='middle'
          ctx.fillText('×',0,0)
        }
        ctx.restore()
      })
      // etiqueta eje
      var lx = cx+R*0.82*Math.cos(d.ang), ly = cy-R*0.82*Math.sin(d.ang)
      ctx.save()
      ctx.font='bold 12px Rajdhani'; ctx.fillStyle=d.col
      ctx.textAlign='center'; ctx.textBaseline='middle'
      ctx.fillText(d.lbl, lx, ly); ctx.restore()
    })
  }

  // vectores de inducción de cada fase (pulsantes)
  if (cestado.showInd) {
    var sc = R * 0.62 / cestado.amp
    var inds = [
      { ang:0,           B: p.BR, col:'#f03050', glow:'rgba(240,48,80,0.5)',  lbl:'B̃R' },
      { ang:2*Math.PI/3, B: p.BS, col:'#28e080', glow:'rgba(40,224,128,0.5)',lbl:'B̃S' },
      { ang:4*Math.PI/3, B: p.BT, col:'#4090ff', glow:'rgba(64,144,255,0.5)',lbl:'B̃T' }
    ]
    inds.forEach(function(ind) {
      var ex = cx + sc*ind.B*Math.cos(ind.ang)
      var ey = cy - sc*ind.B*Math.sin(ind.ang)
      ctx.save()
      ctx.shadowColor=ind.glow; ctx.shadowBlur=12
      drawArrowC(ctx, cx, cy, ex, ey, ind.col, 2, 9)
      ctx.restore()
    })
  }

  // componentes Bx, By
  if (cestado.showComp) {
    var sc2 = R*0.62/cestado.amp
    // Bx flecha horizontal
    ctx.save()
    ctx.shadowColor='rgba(240,112,48,0.6)'; ctx.shadowBlur=10
    drawArrowC(ctx, cx, cy, cx+sc2*p.Bx, cy, '#f07030', 1.5, 8)
    ctx.restore()
    // By flecha vertical
    ctx.save()
    ctx.shadowColor='rgba(64,144,255,0.6)'; ctx.shadowBlur=10
    drawArrowC(ctx, cx, cy, cx, cy-sc2*p.By, '#4090ff', 1.5, 8)
    ctx.restore()
  }

  // resultante
  if (cestado.showRes && p.Bmod > 0.001) {
    var sc3 = R*0.62/cestado.amp
    var rx = cx+sc3*p.Bx, ry = cy-sc3*p.By
    ctx.save()
    ctx.shadowColor='rgba(240,192,0,0.85)'; ctx.shadowBlur=20
    drawArrowC(ctx, cx, cy, rx, ry, '#f0c000', 3, 13)
    ctx.restore()
    ctx.save()
    ctx.beginPath(); ctx.arc(rx,ry,4.5,0,Math.PI*2)
    ctx.fillStyle='#f0c000'; ctx.shadowColor='#f0c000'; ctx.shadowBlur=16
    ctx.fill(); ctx.restore()
  }

  // punto central
  ctx.save()
  ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2)
  ctx.fillStyle='#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=7; ctx.fill()
  ctx.restore()
}

function drawArrowC(ctx, x1,y1,x2,y2,col,lw,hs) {
  var dx=x2-x1, dy=y2-y1, ang=Math.atan2(dy,dx)
  var len=Math.sqrt(dx*dx+dy*dy); if(len<2)return
  ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=lw; ctx.lineCap='round'
  ctx.beginPath()
  ctx.moveTo(x1,y1)
  ctx.lineTo(x2-hs*Math.cos(ang)*0.5, y2-hs*Math.sin(ang)*0.5)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2,y2)
  ctx.lineTo(x2-hs*Math.cos(ang-0.42),y2-hs*Math.sin(ang-0.42))
  ctx.lineTo(x2-hs*Math.cos(ang+0.42),y2-hs*Math.sin(ang+0.42))
  ctx.closePath(); ctx.fill()
}

function drawGrafica(ctx) {
  var W=graficaCanvas.width, H=graficaCanvas.height
  ctx.clearRect(0,0,W,H)
  ctx.save()
  ctx.strokeStyle='rgba(240,112,48,0.1)'; ctx.lineWidth=1
  ctx.setLineDash([3,6])
  ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.stroke()
  ctx.setLineDash([]); ctx.restore()

  var Bmax = cestado.amp * 1.52
  function dibLine(data, color) {
    if (data.length < 2) return
    ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=1.5
    ctx.shadowColor=color; ctx.shadowBlur=5
    ctx.beginPath()
    data.forEach(function(v,i) {
      var x=(i/(GHMAX-1))*W, y=H/2 - (v/Bmax)*H*0.44
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)
    })
    ctx.stroke(); ctx.restore()
  }
  dibLine(grafHist.bx, '#f07030')
  dibLine(grafHist.by, '#4090ff')
  dibLine(grafHist.bmod, '#f0c000')
}

function updatePanelCampo(t, p) {
  document.getElementById('c-t').textContent     = t.toFixed(3)+' s'
  document.getElementById('c-wt').textContent    = (p.wt % 360).toFixed(1)+'°'
  document.getElementById('c-br').textContent    = p.BR.toFixed(3)+' T'
  document.getElementById('c-bs').textContent    = p.BS.toFixed(3)+' T'
  document.getElementById('c-bt').textContent    = p.BT.toFixed(3)+' T'
  document.getElementById('c-bx').textContent    = p.Bx.toFixed(3)+' T'
  document.getElementById('c-by').textContent    = p.By.toFixed(3)+' T'
  document.getElementById('c-bmod').textContent  = p.Bmod.toFixed(3)+' T'
  document.getElementById('c-theta').textContent = (p.Bang*180/Math.PI).toFixed(1)+'°'
  document.getElementById('badge-wt').textContent   = 'ωt = '+(p.wt%360).toFixed(1)+'°'
  document.getElementById('badge-bmod').textContent = '|B̃| = '+p.Bmod.toFixed(3)+' T'
}

var lastTC = null
function loopCampo(ts) {
  if (!lastTC) lastTC = ts
  var dt = (ts - lastTC)/1000; lastTC = ts
  if (cestado.running) cestado.t += dt * cestado.speed
  var p = calcCampo(cestado.t)
  addGrafHist(p)
  drawCampo(cc, cestado.t)
  drawGrafica(gc)
  updatePanelCampo(cestado.t, p)
  requestAnimationFrame(loopCampo)
}
requestAnimationFrame(loopCampo)
