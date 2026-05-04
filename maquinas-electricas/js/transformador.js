// transformador.js -- calculo transformador monofasico
// circuito equivalente aproximado
// ref: "Transformadores" - M.A. Rodriguez Pozueta, Univ. Cantabria

function getTrInputs() {
  return {
    SN:      parseFloat(document.getElementById('t-sn').value) * 1000,  // VA
    V1N:     parseFloat(document.getElementById('t-v1n').value),
    V2N:     parseFloat(document.getElementById('t-v2n').value),
    ecc:     parseFloat(document.getElementById('t-ecc').value) / 100,  // pu
    PCuN:    parseFloat(document.getElementById('t-pcun').value),        // W
    P0:      parseFloat(document.getElementById('t-p0').value),          // W = PFe
    I0_pct:  parseFloat(document.getElementById('t-i0').value),          // % de I1N
    cosphi0: parseFloat(document.getElementById('t-cphi0').value),
    C:       parseFloat(document.getElementById('t-C').value),           // indice de carga
    cosphi2: parseFloat(document.getElementById('t-cphi2').value),
    tipo:    document.getElementById('t-tipo').value
  }
}

function calcTrafo() {
  var d = getTrInputs()

  // relacion de transformacion (ec. 2): m = V1N/V2N
  var m = d.V1N / d.V2N

  // corrientes nominales (ec. 1): SN = V1N*I1N = V2N*I2N
  var I1N = d.SN / d.V1N
  var I2N = d.SN / d.V2N

  // ── tensiones relativas de cc (ecs. 24-26) ────────────────
  // eRcc = PCuN/SN (ec. 25)
  var eRcc = d.PCuN / d.SN
  var eRcc_pct = eRcc * 100

  // eXcc^2 = ecc^2 - eRcc^2 (ec. 26)
  var eXcc_sq = d.ecc*d.ecc - eRcc*eRcc
  var eXcc = eXcc_sq > 0 ? Math.sqrt(eXcc_sq) : 0
  var eXcc_pct = eXcc * 100

  // ── parametros circuito equivalente aproximado (ecs. 22-23) ─
  // Rcc = eRcc * V1N/I1N,  Xcc = eXcc * V1N/I1N
  var Rcc = eRcc * d.V1N / I1N
  var Xcc = eXcc * d.V1N / I1N
  var Zcc = d.ecc * d.V1N / I1N

  // ── rama de vacio ─────────────────────────────────────────
  var I0     = d.I0_pct / 100 * I1N
  var sinphi0 = Math.sqrt(Math.max(0, 1 - d.cosphi0*d.cosphi0))
  var IFe    = I0 * d.cosphi0   // componente activa (ec. 14)
  var Imu    = I0 * sinphi0     // componente magnetizante
  var RFe    = d.P0 > 0 ? d.V1N*d.V1N/d.P0 : 1e9
  var Xmu    = Imu > 1e-9 ? d.V1N/Imu : 1e9

  // ── falta de cortocircuito (ecs. 28-29) ───────────────────
  // I1falta = V1N/Zcc = I1N*100/ecc  (ec. 29a)
  var I1falta = d.V1N / Zcc
  var I2falta = I2N * 100 / (d.ecc*100)

  // ── caida de tension (ec. 36) ─────────────────────────────
  // ec = C*(eRcc*cos(phi2) +/- eXcc*sin(phi2))  [en %]
  // signo +: inductiva/resistiva,  signo -: capacitiva
  var sinphi2 = Math.sqrt(Math.max(0, 1 - d.cosphi2*d.cosphi2))
  var signo   = (d.tipo === 'cap') ? -1 : 1
  var ec_pct  = d.C * (eRcc_pct*d.cosphi2 + signo*eXcc_pct*sinphi2)

  // tension secundaria en carga (ec. 35): V2 = V2N*(1 - ec/100)
  var V2_carga = d.V2N * (1 - ec_pct/100)

  // ── balance de potencias (ecs. 40-47) ─────────────────────
  var PFe  = d.P0                    // perdidas hierro = constantes (ec. 43)
  var PCu  = d.C*d.C * d.PCuN       // perdidas cobre = variables (ec. 42)
  var P2   = d.C * d.SN * d.cosphi2 // potencia secundaria (ec. 45)
  var P1   = P2 + PCu + PFe         // potencia primaria (ec. 46)
  var eta  = P1 > 0 ? P2/P1*100 : 0 // rendimiento (ec. 48)

  // corrientes en carga
  var I2_carga = d.C * I2N
  var I1_carga = d.C * I1N  // aprox valida para C > 0.75 (ec. 30)

  // ── indice de carga optimo (ec. 51) ───────────────────────
  // Copt = sqrt(PFe/PCuN)  ->  condicion PFe = PCu
  var Copt = d.PCuN > 0 ? Math.sqrt(PFe/d.PCuN) : 1

  // rendimiento maximo (ec. 52)
  var Smax    = Copt * d.SN
  var eta_max = (Smax*d.cosphi2 + 2*PFe) > 0
                ? Smax*d.cosphi2 / (Smax*d.cosphi2 + 2*PFe) * 100
                : 0

  // curva eta vs C
  var C_arr = [], eta_arr = []
  for (var i = 0; i <= 50; i++) {
    var Cv = i/40
    var P2v = Cv * d.SN * d.cosphi2
    var P1v = P2v + Cv*Cv*d.PCuN + PFe
    C_arr.push(Cv)
    eta_arr.push((P1v > 0 && P2v > 0) ? P2v/P1v*100 : 0)
  }

  return {
    m:m, I1N:I1N, I2N:I2N,
    eRcc_pct:eRcc_pct, eXcc_pct:eXcc_pct, ecc_pct:d.ecc*100,
    Rcc:Rcc, Xcc:Xcc, Zcc:Zcc,
    RFe:RFe, Xmu:Xmu, I0:I0, IFe:IFe, Imu:Imu,
    I1falta:I1falta, I2falta:I2falta,
    ec_pct:ec_pct, V2_carga:V2_carga,
    PFe:PFe, PCu:PCu, P2:P2, P1:P1, eta:eta,
    I2_carga:I2_carga, I1_carga:I1_carga,
    Copt:Copt, Smax:Smax, eta_max:eta_max,
    C_arr:C_arr, eta_arr:eta_arr,
    d:d
  }
}

function updateRes(r) {
  document.getElementById('r-u2').textContent  = r.V2_carga.toFixed(2)
  document.getElementById('r-du').textContent  = r.ec_pct.toFixed(3)
  document.getElementById('r-eta').textContent = r.eta.toFixed(3)
  document.getElementById('r-i2').textContent  = r.I2_carga.toFixed(3)
  document.getElementById('r-i1').textContent  = r.I1_carga.toFixed(3)
  document.getElementById('r-p2').textContent  = (r.P2/1000).toFixed(3)

  // panel de parametros del CE
  var html = ''
  html += '<div class="bal-item"><span>Relación transf. m</span><span>' + r.m.toFixed(3) + '</span></div>'
  html += '<div class="bal-item"><span>I1N / I2N</span><span>' + r.I1N.toFixed(3) + ' / ' + r.I2N.toFixed(3) + ' A</span></div>'
  html += '<div class="bal-item"><span>εcc / εRcc / εXcc</span><span>' + r.ecc_pct.toFixed(2) + ' / ' + r.eRcc_pct.toFixed(2) + ' / ' + r.eXcc_pct.toFixed(2) + ' %</span></div>'
  html += '<div class="bal-item"><span>Rcc (ec. 22a)</span><span>' + r.Rcc.toFixed(4) + ' Ω</span></div>'
  html += '<div class="bal-item"><span>Xcc (ec. 22b)</span><span>' + r.Xcc.toFixed(4) + ' Ω</span></div>'
  html += '<div class="bal-item"><span>Zcc (ec. 23)</span><span>' + r.Zcc.toFixed(4) + ' Ω</span></div>'
  html += '<div class="bal-item"><span>RFe</span><span>' + r.RFe.toFixed(1) + ' Ω</span></div>'
  html += '<div class="bal-item"><span>Xμ</span><span>' + r.Xmu.toFixed(1) + ' Ω</span></div>'
  html += '<div class="bal-item"><span>I0 / IFe / Iμ</span><span>' + r.I0.toFixed(4) + ' / ' + r.IFe.toFixed(4) + ' / ' + r.Imu.toFixed(4) + ' A</span></div>'
  html += '<div class="bal-item"><span>I1falta (ec. 29a)</span><span>' + r.I1falta.toFixed(2) + ' A = ' + (r.I1falta/r.I1N).toFixed(1) + '·I1N</span></div>'
  html += '<div class="bal-item"><span>PFe = P0 (ec. 43)</span><span>' + r.PFe.toFixed(0) + ' W</span></div>'
  html += '<div class="bal-item"><span>PCu = C²·PCuN (ec. 44)</span><span>' + r.PCu.toFixed(0) + ' W</span></div>'
  html += '<div class="bal-item"><span>Copt (ec. 51)</span><span>' + r.Copt.toFixed(3) + ' → Smax = ' + (r.Smax/1000).toFixed(2) + ' kVA</span></div>'
  html += '<div class="bal-item"><span>η_max (ec. 52)</span><span>' + r.eta_max.toFixed(3) + ' %</span></div>'
  document.getElementById('circ-params').innerHTML = html
}

// curva rendimiento vs C
function drawCurvaEta(r) {
  var canvas = document.getElementById('circCanvas')
  var W = canvas.clientWidth || 600
  canvas.width = W; canvas.height = 220
  var ctx = canvas.getContext('2d')
  ctx.clearRect(0,0,W,220)
  var H=220, pad={l:50,r:20,t:20,b:35}
  var cw=W-pad.l-pad.r, ch=H-pad.t-pad.b

  function xp(C) { return pad.l + (C/1.25)*cw }
  function yp(e) { return pad.t+ch - (e/105)*ch }

  ctx.strokeStyle='rgba(240,192,0,0.07)'; ctx.lineWidth=1
  for (var gi=0;gi<=4;gi++) {
    ctx.beginPath(); ctx.moveTo(pad.l,pad.t+gi*(ch/4)); ctx.lineTo(pad.l+cw,pad.t+gi*(ch/4)); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(pad.l+gi*(cw/4),pad.t); ctx.lineTo(pad.l+gi*(cw/4),pad.t+ch); ctx.stroke()
  }
  ctx.strokeStyle='rgba(200,220,240,0.35)'; ctx.lineWidth=1.5
  ctx.beginPath(); ctx.moveTo(pad.l,pad.t); ctx.lineTo(pad.l,pad.t+ch); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(pad.l,pad.t+ch); ctx.lineTo(pad.l+cw,pad.t+ch); ctx.stroke()

  ctx.fillStyle='rgba(180,210,240,0.5)'; ctx.font='10px Share Tech Mono'
  ctx.textAlign='right'; ctx.textBaseline='middle'
  for (var li=0;li<=4;li++) ctx.fillText((li*25)+'%', pad.l-4, yp(li*25))
  ctx.textAlign='center'; ctx.textBaseline='top'
  for (var ci=0;ci<=5;ci++) ctx.fillText((ci*0.25).toFixed(2), xp(ci*0.25), pad.t+ch+4)
  ctx.fillText('Índice de carga C', pad.l+cw/2, H-7)
  ctx.textAlign='left'; ctx.fillText('η (%)', pad.l+4, pad.t+6)

  // linea Copt
  ctx.save(); ctx.strokeStyle='rgba(240,192,0,0.35)'; ctx.lineWidth=1; ctx.setLineDash([4,6])
  ctx.beginPath(); ctx.moveTo(xp(r.Copt),pad.t); ctx.lineTo(xp(r.Copt),pad.t+ch); ctx.stroke()
  ctx.setLineDash([]); ctx.restore()

  // curva eta
  ctx.save(); ctx.strokeStyle='#f0c000'; ctx.lineWidth=2.5
  ctx.shadowColor='rgba(240,192,0,0.5)'; ctx.shadowBlur=8
  ctx.beginPath()
  r.C_arr.forEach(function(C,i) {
    i===0?ctx.moveTo(xp(C),yp(r.eta_arr[i])):ctx.lineTo(xp(C),yp(r.eta_arr[i]))
  })
  ctx.stroke(); ctx.restore()

  // punto actual
  ctx.save(); ctx.beginPath(); ctx.arc(xp(r.d.C), yp(r.eta), 6, 0, Math.PI*2)
  ctx.fillStyle='#f03050'; ctx.shadowColor='#f03050'; ctx.shadowBlur=14; ctx.fill()
  ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke(); ctx.restore()

  ctx.save(); ctx.font='10px Share Tech Mono'; ctx.fillStyle='rgba(240,192,0,0.6)'
  ctx.textAlign='center'
  ctx.fillText('Copt='+r.Copt.toFixed(2), xp(r.Copt), pad.t+5); ctx.restore()
}

// diagrama fasorial
function drawFasorial(r) {
  var canvas = document.getElementById('fasCanvas')
  var W = canvas.width || 420, H = canvas.height || 280
  var ctx = canvas.getContext('2d')
  ctx.clearRect(0,0,W,H)
  ctx.fillStyle='rgba(5,10,16,0.9)'; ctx.fillRect(0,0,W,H)

  // referencia: V'2 horizontal desde el centro izquierdo
  var cx = W*0.3, cy = H/2
  var U2_len = W*0.28
  var sinphi2 = Math.sqrt(Math.max(0, 1 - r.d.cosphi2*r.d.cosphi2))
  var signo   = (r.d.tipo === 'cap') ? -1 : 1

  // escala de tension
  var Vscale = U2_len / r.d.V2N
  // caidas
  var dRx = Vscale * r.Rcc * r.I2_carga * r.d.cosphi2
  var dRy = Vscale * r.Rcc * r.I2_carga * sinphi2 * signo
  var dXx = -Vscale * r.Xcc * r.I2_carga * sinphi2 * signo
  var dXy = Vscale * r.Xcc * r.I2_carga * r.d.cosphi2

  // V'2 horizontal
  var V2x = cx + U2_len, V2y = cy

  // I2 con angulo phi2 (ref: V'2)
  var phi2 = Math.acos(r.d.cosphi2)
  var Ilen = H*0.22
  var I2ex = cx + Ilen*Math.cos(-phi2*signo)
  var I2ey = cy + Ilen*Math.sin(-phi2*signo)

  // V1 = V'2 + I2*Rcc + jI2*Xcc  (en el circuito aprox.)
  var V1x = V2x + dRx + dXx
  var V1y = V2y - dRy - dXy

  function flecha(x1,y1,x2,y2,col,lw,hs,lbl) {
    var dx=x2-x1,dy=y2-y1,ang=Math.atan2(dy,dx)
    var len=Math.sqrt(dx*dx+dy*dy); if(len<2) return
    ctx.save(); ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=lw
    ctx.shadowColor=col; ctx.shadowBlur=8
    ctx.beginPath(); ctx.moveTo(x1,y1)
    ctx.lineTo(x2-hs*Math.cos(ang)*0.5, y2-hs*Math.sin(ang)*0.5); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x2,y2)
    ctx.lineTo(x2-hs*Math.cos(ang-0.42),y2-hs*Math.sin(ang-0.42))
    ctx.lineTo(x2-hs*Math.cos(ang+0.42),y2-hs*Math.sin(ang+0.42))
    ctx.closePath(); ctx.fill()
    if (lbl) {
      ctx.font='bold 12px Rajdhani'; ctx.fillStyle=col
      ctx.textAlign='center'; ctx.textBaseline='middle'
      var mx=(x1+x2)/2, my=(y1+y2)/2
      var nx=Math.cos(ang-Math.PI/2)*14, ny=Math.sin(ang-Math.PI/2)*14
      ctx.fillText(lbl, mx+nx, my+ny)
    }
    ctx.restore()
  }

  flecha(cx,cy, V2x,V2y, '#f0c000', 2.5, 11, "V'₂")
  flecha(cx,cy, I2ex,I2ey, '#4090ff', 2, 9, 'I₂')
  // caida Rcc: desde V'2
  flecha(V2x,V2y, V2x+dRx,V2y-dRy, '#f03050', 1.8, 8, 'I₂Rcc')
  // caida Xcc: desde V'2+dRcc
  flecha(V2x+dRx,V2y-dRy, V1x,V1y, '#28e080', 1.8, 8, 'jI₂Xcc')
  // V1
  flecha(cx,cy, V1x,V1y, '#f07030', 2.5, 11, 'V₁')

  // punto origen
  ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2)
  ctx.fillStyle='#fff'; ctx.fill()

  // info
  ctx.font='10px Share Tech Mono'; ctx.fillStyle='rgba(240,192,0,0.5)'
  ctx.textAlign='center'
  var tipo_s = r.d.tipo==='ind'?'inductiva':r.d.tipo==='res'?'resistiva':'capacitiva'
  ctx.fillText('C='+r.d.C.toFixed(2)+'  cos(φ₂)='+r.d.cosphi2.toFixed(2)+'  '+tipo_s, W/2, H-7)
  if (r.ec_pct < 0)
    ctx.fillText('⚡ EFECTO FERRANTI: V₂ > V₂N', W/2, H-19)
}

// ── eventos ─────────────────────────────────────────────────

document.getElementById('t-calcular').addEventListener('click', function() {
  var r = calcTrafo()
  updateRes(r)
  drawCurvaEta(r)
  drawFasorial(r)
})

// sliders en vivo
;['t-C','t-cphi2'].forEach(function(id) {
  document.getElementById(id).addEventListener('input', function(e) {
    var dispId = id==='t-C' ? 'tv-C' : 'tv-cphi2'
    document.getElementById(dispId).textContent = parseFloat(e.target.value).toFixed(2)
    var pct = (e.target.value-e.target.min)/(e.target.max-e.target.min)*100
    e.target.style.background = 'linear-gradient(to right,#f0c000 '+pct+'%,#1a3352 '+pct+'%)'
  })
})

window.addEventListener('load', function() {
  ;['t-C','t-cphi2'].forEach(function(id) {
    var el = document.getElementById(id)
    var pct = (el.value-el.min)/(el.max-el.min)*100
    el.style.background = 'linear-gradient(to right,#f0c000 '+pct+'%,#1a3352 '+pct+'%)'
  })
  document.getElementById('t-calcular').click()
})

window.addEventListener('resize', function() {
  try { var r = calcTrafo(); drawCurvaEta(r); drawFasorial(r) } catch(e){}
})
