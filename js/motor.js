// motor.js -- calculo punto de funcionamiento motor asincrono
// circuito equivalente exacto con equivalente de Thevenin
// ref: "Sistemas Electricos II - Maquinas Asincronas"

// ── fisica ────────────────────────────────────────────────────

function getInputs() {
  return {
    Vff:  parseFloat(document.getElementById('m-vff').value),
    f:    parseFloat(document.getElementById('m-f').value),
    p:    parseInt(document.getElementById('m-p').value),    // polos TOTALES
    Pn:   parseFloat(document.getElementById('m-pn').value) * 1000,
    nr_n: parseFloat(document.getElementById('m-nr').value),
    R1:   parseFloat(document.getElementById('m-r1').value),
    X1:   parseFloat(document.getElementById('m-x1').value),
    R2:   parseFloat(document.getElementById('m-r2').value),
    X2:   parseFloat(document.getElementById('m-x2').value),
    gc:   parseFloat(document.getElementById('m-gc').value),
    bm:   parseFloat(document.getElementById('m-bm').value),
    tipoCarga: document.getElementById('m-tipocarga').value,
    Tc_manual: parseFloat(document.getElementById('m-tcarga').value) || 0
  }
}

// corriente de rotor: I2 = V1E / |ZE + R2/s + jX2|  (ec. 18)
function I2_rotor(V1E, RE, XE, R2, X2, s) {
  if (s < 1e-9) return 0
  var Rsum = RE + R2/s
  var Xsum = XE + X2
  return V1E / Math.sqrt(Rsum*Rsum + Xsum*Xsum)
}

// par mecanico disponible: Tm = (3/ws) * I2^2 * R2/s  (ec. 20)
function parMotor(V1E, ws, RE, XE, R2, X2, s) {
  if (s < 1e-9) return 0
  var I2 = I2_rotor(V1E, RE, XE, R2, X2, s)
  return (3/ws) * I2*I2 * (R2/s)
}

function calcMotor() {
  var d = getInputs()

  // tension de fase
  var V1 = d.Vff / Math.sqrt(3)

  // velocidad angular sincronismo: ws = 2*pi*f / (p/2)  (ec. 1)
  var ws = 2*Math.PI*d.f / (d.p/2)

  // velocidad sincronismo en rpm: ns = 120*f/p  (ec. 2)
  var ns = 120*d.f / d.p

  // deslizamiento nominal: sn = (ns-nr)/ns  (ec. 3)
  var sn = (ns - d.nr_n) / ns

  // par nominal de placa
  var wr_n = 2*Math.PI*d.nr_n/60
  var Tn = d.Pn / wr_n

  // par de carga
  var Tc_nom = d.Tc_manual > 0 ? d.Tc_manual : Tn

  // ── equivalente de Thevenin (ec. 16) ─────────────────────
  // Y = gc - jbm,  Z1 = R1 + jX1
  // 1 + Y*Z1: re = 1 + gc*R1 + bm*X1,  im = gc*X1 - bm*R1
  var den_re = 1 + d.gc*d.R1 + d.bm*d.X1
  var den_im = d.gc*d.X1 - d.bm*d.R1
  var den2   = den_re*den_re + den_im*den_im

  var V1E = V1 / Math.sqrt(den2)

  // Z_Th = Z1 / (1 + Y*Z1)
  var RE = (d.R1*den_re + d.X1*den_im) / den2
  var XE = (d.X1*den_re - d.R1*den_im) / den2

  // ── puntos clave de la curva T(s) ────────────────────────
  // deslizamiento critico (ec. 21): s_Tmax = R2/sqrt(RE^2+(XE+X2)^2)
  var raiz = Math.sqrt(RE*RE + (XE+d.X2)*(XE+d.X2))
  var s_Tmax = d.R2 / raiz

  // par maximo (ec. 22): T_max = (3*V1E^2/ws)/(RE + raiz)
  var T_max = (3*V1E*V1E/ws) / (RE + raiz)

  // par de arranque (ec. 23): s=1
  var dArr = (RE+d.R2)*(RE+d.R2) + (XE+d.X2)*(XE+d.X2)
  var T_arr = (3*V1E*V1E/ws) * d.R2 / dArr
  var I2_arr = V1E / Math.sqrt(dArr)
  var I2_nom = I2_rotor(V1E, RE, XE, d.R2, d.X2, sn)

  // ── curvas T(s) y Tc(n) ───────────────────────────────────
  var N = 400
  var s_arr = [], T_arr_m = [], n_arr = [], Tc_arr = [], I2_arr_c = []

  for (var i = 0; i <= N; i++) {
    var s = 0.0005 + i/N * 0.9995
    var T = parMotor(V1E, ws, RE, XE, d.R2, d.X2, s)
    var n = ns*(1-s)
    var frac = Math.max(0, n/d.nr_n)
    var Tc
    if (d.tipoCarga === 'constante')   Tc = Tc_nom
    else if (d.tipoCarga === 'cuadratico') Tc = Tc_nom * frac*frac
    else Tc = Tc_nom * frac
    s_arr.push(s); T_arr_m.push(T); n_arr.push(n)
    Tc_arr.push(Tc)
    I2_arr_c.push(I2_rotor(V1E, RE, XE, d.R2, d.X2, s))
  }

  // ── punto de trabajo (cruce T_motor con T_carga) ──────────
  var s_work = sn, T_work = Tn, n_work = d.nr_n
  for (var j = 0; j < N; j++) {
    if ((T_arr_m[j]-Tc_arr[j]) * (T_arr_m[j+1]-Tc_arr[j+1]) < 0
        && s_arr[j] < s_Tmax*1.05) {
      var frac2 = (T_arr_m[j]-Tc_arr[j]) /
                  ((T_arr_m[j]-Tc_arr[j]) - (T_arr_m[j+1]-Tc_arr[j+1]))
      s_work = s_arr[j] + frac2*(s_arr[j+1]-s_arr[j])
      T_work = parMotor(V1E, ws, RE, XE, d.R2, d.X2, s_work)
      n_work = ns*(1-s_work)
      break
    }
  }

  // ── magnitudes en el punto de trabajo ────────────────────
  var I2_w = I2_rotor(V1E, RE, XE, d.R2, d.X2, s_work)

  // I1 = I2*(1 + Y*Z2s)  (ec. 17)
  var R2s_w  = d.R2/s_work
  var YZ2_re = d.gc*R2s_w + d.bm*d.X2
  var YZ2_im = d.gc*d.X2  - d.bm*R2s_w
  var I1_w   = I2_w * Math.sqrt((1+YZ2_re)*(1+YZ2_re) + YZ2_im*YZ2_im)

  // balance de potencias (ecs. 28-30)
  var Pcu1 = 3*I1_w*I1_w*d.R1
  var Ph   = 3*V1*V1*d.gc
  var Pcu2 = 3*I2_w*I2_w*d.R2
  var Peh  = Pcu2 / s_work
  var Pm   = Peh * (1-s_work)
  var PE   = Pcu1 + Ph + Peh
  var eta  = PE > 0 ? Pm/PE*100 : 0
  var cosphi = (3*V1*I1_w > 0) ? Math.min(1, PE/(3*V1*I1_w)) : 0

  // corriente de vacio
  var I_phi = V1 * Math.sqrt(d.gc*d.gc + d.bm*d.bm)

  // curva rendimiento vs s (para la segunda grafica)
  var eta_arr = s_arr.map(function(s, i) {
    var I2v = I2_arr_c[i]
    var I1v = I2v  // aprox
    var Pcu2v = 3*I2v*I2v*d.R2
    var Pehv  = s > 1e-6 ? Pcu2v/s : 0
    var Pmv   = Pehv*(1-s)
    var PEv   = 3*I1v*I1v*d.R1 + Ph + Pehv
    return PEv > 1 ? Math.min(Pmv/PEv*100, 100) : 0
  })

  return {
    ns:ns, ws:ws, sn:sn, Tn:Tn,
    V1E:V1E, RE:RE, XE:XE,
    s_Tmax:s_Tmax, T_max:T_max, T_arr_arranque:T_arr,
    I2_arr:I2_arr, I2_nom:I2_nom, I_phi:I_phi,
    s_arr:s_arr, T_arr:T_arr_m, n_arr:n_arr, Tc_arr:Tc_arr,
    I2_arr_c:I2_arr_c, eta_arr:eta_arr,
    s_work:s_work, T_work:T_work, n_work:n_work,
    I2_w:I2_w, I1_w:I1_w,
    Pcu1:Pcu1, Ph:Ph, Pcu2:Pcu2, Peh:Peh, Pm:Pm, PE:PE,
    eta:eta, cosphi:cosphi
  }
}

// ── actualizar panel de resultados ───────────────────────────

function updateResultados(r) {
  document.getElementById('r-nr').textContent  = r.n_work.toFixed(0)
  document.getElementById('r-s').textContent   = (r.s_work*100).toFixed(2)
  document.getElementById('r-t').textContent   = r.T_work.toFixed(1)
  document.getElementById('r-i').textContent   = r.I1_w.toFixed(2)
  document.getElementById('r-p1').textContent  = (r.PE/1000).toFixed(2)
  document.getElementById('r-eta').textContent = r.eta.toFixed(1)

  // datos adicionales si existen esos elementos
  var elV1E = document.getElementById('r-v1e')
  if (elV1E) elV1E.textContent = r.V1E.toFixed(2) + ' V'
  var elTmax = document.getElementById('r-tmax')
  if (elTmax) elTmax.textContent = r.T_max.toFixed(1) + ' N·m'
  var elStmax = document.getElementById('r-stmax')
  if (elStmax) elStmax.textContent = (r.s_Tmax*100).toFixed(2) + ' %'
  var elTarr = document.getElementById('r-tarr')
  if (elTarr) elTarr.textContent = r.T_arr_arranque.toFixed(1) + ' N·m'
  var elIarr = document.getElementById('r-iarr')
  if (elIarr) elIarr.textContent = r.I2_arr.toFixed(2) + ' A'
  var elPm = document.getElementById('r-pm')
  if (elPm) elPm.textContent = (r.Pm/1000).toFixed(2) + ' kW'
  var elPcu2 = document.getElementById('r-pcu2')
  if (elPcu2) elPcu2.textContent = r.Pcu2.toFixed(0) + ' W'
  var elPeh = document.getElementById('r-peh')
  if (elPeh) elPeh.textContent = (r.Peh/1000).toFixed(2) + ' kW'
  var elCosphi = document.getElementById('r-cosphi')
  if (elCosphi) elCosphi.textContent = r.cosphi.toFixed(3)
}

// ── dibujo curva T(s) ─────────────────────────────────────────

function drawCurvasTn(r) {
  var canvas = document.getElementById('curvasCanvas')
  var W = canvas.clientWidth || 600
  canvas.width = W; canvas.height = 300
  var ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, W, 300)
  var H = 300
  var pad = { l:55, r:20, t:20, b:35 }
  var cw = W-pad.l-pad.r, ch = H-pad.t-pad.b
  var Tmax = Math.max(Math.max.apply(null,r.T_arr), Math.max.apply(null,r.Tc_arr)) * 1.1

  function xp(n) { return pad.l + (n/r.ns)*cw }
  function yp(T) { return pad.t + ch - (T/Tmax)*ch }

  // grid
  ctx.strokeStyle='rgba(0,200,240,0.07)'; ctx.lineWidth=1
  for (var gi=0; gi<=5; gi++) {
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t+gi*(ch/5)); ctx.lineTo(pad.l+cw, pad.t+gi*(ch/5)); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(pad.l+gi*(cw/5), pad.t); ctx.lineTo(pad.l+gi*(cw/5), pad.t+ch); ctx.stroke()
  }
  // ejes
  ctx.strokeStyle='rgba(200,220,240,0.35)'; ctx.lineWidth=1.5
  ctx.beginPath(); ctx.moveTo(pad.l,pad.t); ctx.lineTo(pad.l,pad.t+ch); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(pad.l,pad.t+ch); ctx.lineTo(pad.l+cw,pad.t+ch); ctx.stroke()
  // labels
  ctx.fillStyle='rgba(180,210,240,0.5)'; ctx.font='11px Share Tech Mono'
  ctx.textAlign='right'; ctx.textBaseline='middle'
  for (var li=0; li<=4; li++) ctx.fillText((Tmax*li/4).toFixed(0), pad.l-5, yp(Tmax*li/4))
  ctx.textAlign='center'; ctx.textBaseline='top'
  for (var ni=0; ni<=4; ni++) ctx.fillText((r.ns*ni/4).toFixed(0), xp(r.ns*ni/4), pad.t+ch+5)
  ctx.save(); ctx.translate(14, pad.t+ch/2); ctx.rotate(-Math.PI/2)
  ctx.fillStyle='rgba(200,220,240,0.5)'; ctx.textAlign='center'; ctx.textBaseline='middle'
  ctx.fillText('Par (N·m)', 0, 0); ctx.restore()
  ctx.fillStyle='rgba(200,220,240,0.5)'; ctx.textAlign='center'
  ctx.fillText('Velocidad (rpm)', pad.l+cw/2, H-8)

  // T_max linea
  ctx.save()
  ctx.strokeStyle='rgba(240,192,0,0.25)'; ctx.lineWidth=1; ctx.setLineDash([4,6])
  ctx.beginPath(); ctx.moveTo(pad.l, yp(r.T_max)); ctx.lineTo(pad.l+cw, yp(r.T_max)); ctx.stroke()
  ctx.setLineDash([]); ctx.restore()

  // curva motor
  ctx.save(); ctx.strokeStyle='#28e080'; ctx.lineWidth=2.5
  ctx.shadowColor='rgba(40,224,128,0.4)'; ctx.shadowBlur=8
  ctx.beginPath()
  r.n_arr.forEach(function(n,i) { i===0?ctx.moveTo(xp(n),yp(r.T_arr[i])):ctx.lineTo(xp(n),yp(r.T_arr[i])) })
  ctx.stroke(); ctx.restore()

  // curva carga
  ctx.save(); ctx.strokeStyle='#f07030'; ctx.lineWidth=2; ctx.setLineDash([6,5])
  ctx.beginPath()
  r.n_arr.forEach(function(n,i) { i===0?ctx.moveTo(xp(n),yp(r.Tc_arr[i])):ctx.lineTo(xp(n),yp(r.Tc_arr[i])) })
  ctx.stroke(); ctx.setLineDash([]); ctx.restore()

  // punto Tmax
  var xTmax = xp(r.ns*(1-r.s_Tmax)), yTmax = yp(r.T_max)
  ctx.save(); ctx.beginPath(); ctx.arc(xTmax, yTmax, 5, 0, Math.PI*2)
  ctx.fillStyle='#f0c000'; ctx.shadowColor='#f0c000'; ctx.shadowBlur=12; ctx.fill(); ctx.restore()

  // punto trabajo
  ctx.save(); ctx.beginPath(); ctx.arc(xp(r.n_work), yp(r.T_work), 7, 0, Math.PI*2)
  ctx.fillStyle='#f03050'; ctx.shadowColor='#f03050'; ctx.shadowBlur=18; ctx.fill()
  ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke(); ctx.restore()

  // leyenda
  ctx.save(); ctx.font='11px Rajdhani'; ctx.textBaseline='middle'
  ctx.fillStyle='#28e080'; ctx.fillRect(pad.l+8, pad.t+8, 18, 3)
  ctx.fillText('Motor T(n)', pad.l+30, pad.t+9)
  ctx.setLineDash([6,5]); ctx.strokeStyle='#f07030'; ctx.lineWidth=2
  ctx.beginPath(); ctx.moveTo(pad.l+8,pad.t+22); ctx.lineTo(pad.l+26,pad.t+22); ctx.stroke()
  ctx.setLineDash([]); ctx.fillStyle='#f07030'; ctx.fillText('Carga Tc(n)', pad.l+30, pad.t+22)
  ctx.fillStyle='#f0c000'; ctx.fillText('T_max', pad.l+30, pad.t+35)
  ctx.restore()
}

// ── segunda grafica: I2 y rendimiento vs s ────────────────────

function drawCurvas2(r) {
  var canvas = document.getElementById('curvas2Canvas')
  var W = canvas.clientWidth || 600
  canvas.width = W; canvas.height = 220
  var ctx = canvas.getContext('2d')
  ctx.clearRect(0,0,W,220)
  var H=220, pad={l:55,r:60,t:20,b:30}
  var cw=W-pad.l-pad.r, ch=H-pad.t-pad.b
  var Imax = Math.max.apply(null,r.I2_arr_c)*1.1

  function xps(s) { return pad.l + s*cw }
  function ypI(I) { return pad.t+ch - (I/Imax)*ch }
  function ypE(e) { return pad.t+ch - (e/110)*ch }

  ctx.strokeStyle='rgba(0,200,240,0.07)'; ctx.lineWidth=1
  for (var gi=0;gi<=4;gi++) {
    ctx.beginPath(); ctx.moveTo(pad.l,pad.t+gi*(ch/4)); ctx.lineTo(pad.l+cw,pad.t+gi*(ch/4)); ctx.stroke()
  }
  ctx.strokeStyle='rgba(200,220,240,0.35)'; ctx.lineWidth=1.5
  ctx.beginPath(); ctx.moveTo(pad.l,pad.t); ctx.lineTo(pad.l,pad.t+ch); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(pad.l,pad.t+ch); ctx.lineTo(pad.l+cw,pad.t+ch); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(pad.l+cw,pad.t); ctx.lineTo(pad.l+cw,pad.t+ch); ctx.stroke()

  ctx.fillStyle='rgba(180,210,240,0.5)'; ctx.font='10px Share Tech Mono'
  ctx.textAlign='right'; ctx.textBaseline='middle'
  for (var li=0;li<=4;li++) ctx.fillText((Imax*li/4).toFixed(1), pad.l-5, ypI(Imax*li/4))
  ctx.textAlign='center'; ctx.textBaseline='top'
  for (var si=0;si<=4;si++) ctx.fillText((si*25)+'%', xps(si*0.25), pad.t+ch+4)
  ctx.fillText('Deslizamiento s', pad.l+cw/2, H-8)
  ctx.textAlign='left'; ctx.textBaseline='middle'
  for (var ei=0;ei<=4;ei++) ctx.fillText(ei*25+'%', pad.l+cw+4, ypE(ei*25))

  // s_Tmax linea vertical
  ctx.save()
  ctx.strokeStyle='rgba(240,192,0,0.3)'; ctx.lineWidth=1; ctx.setLineDash([4,6])
  ctx.beginPath(); ctx.moveTo(xps(r.s_Tmax),pad.t); ctx.lineTo(xps(r.s_Tmax),pad.t+ch); ctx.stroke()
  ctx.setLineDash([]); ctx.restore()

  // I2 vs s
  ctx.save(); ctx.strokeStyle='#f03050'; ctx.lineWidth=2
  ctx.beginPath()
  r.s_arr.forEach(function(s,i){ i===0?ctx.moveTo(xps(s),ypI(r.I2_arr_c[i])):ctx.lineTo(xps(s),ypI(r.I2_arr_c[i])) })
  ctx.stroke(); ctx.restore()

  // eta vs s
  ctx.save(); ctx.strokeStyle='#28e080'; ctx.lineWidth=2
  ctx.beginPath()
  r.s_arr.forEach(function(s,i){ i===0?ctx.moveTo(xps(s),ypE(r.eta_arr[i])):ctx.lineTo(xps(s),ypE(r.eta_arr[i])) })
  ctx.stroke(); ctx.restore()

  // punto trabajo
  ctx.save(); ctx.beginPath(); ctx.arc(xps(r.s_work), ypE(r.eta), 5, 0, Math.PI*2)
  ctx.fillStyle='#f03050'; ctx.shadowColor='#f03050'; ctx.shadowBlur=12; ctx.fill(); ctx.restore()

  ctx.font='11px Rajdhani'; ctx.textBaseline='middle'
  ctx.fillStyle='#f03050'; ctx.fillText('I₂ (A)', pad.l+6, pad.t+12)
  ctx.fillStyle='#28e080'; ctx.fillText('η (%)', pad.l+6, pad.t+25)
  ctx.fillStyle='rgba(240,192,0,0.6)'; ctx.fillText('s_Tmax', xps(r.s_Tmax)+4, pad.t+10)
}

// ── eventos ───────────────────────────────────────────────────

document.getElementById('m-calcular').addEventListener('click', function() {
  var r = calcMotor()
  updateResultados(r)
  drawCurvasTn(r)
  drawCurvas2(r)
})

window.addEventListener('load', function() {
  document.getElementById('m-calcular').click()
})

window.addEventListener('resize', function() {
  try { var r = calcMotor(); drawCurvasTn(r); drawCurvas2(r) } catch(e){}
})
