# Simuladores de Máquinas Eléctricas

Proyecto web con simuladores interactivos para la asignatura de Máquinas Eléctricas. Todo está hecho con HTML, CSS y JavaScript puro, sin librerías externas.

## Qué hay

- **Página principal** (`index.html`) — menú de acceso a los 4 simuladores
- **Teorema de Ferraris / Motor asíncrono** — campo magnético giratorio animado, rotor de jaula de ardilla, fasores en tiempo real
- **Campo magnético — 3 corrientes desfasadas** — cómo se forma el campo B a partir de las 3 fases, con gráfica de Bx y By
- **Punto de funcionamiento del motor** — curvas T(s), cálculo del punto de trabajo, corriente y rendimiento
- **Transformador monofásico** — caída de tensión, rendimiento, curva η vs β, diagrama fasorial

## Cómo usarlo

Abre `index.html` con un navegador, o con Live Server en VS Code si tienes problemas con las fuentes de Google.

No hay que instalar nada.

## Estructura

```
/
├── index.html
├── css/
│   └── comun.css
├── js/
│   ├── ferraris.js
│   ├── campo.js
│   ├── motor.js
│   └── transformador.js
└── pages/
    ├── ferraris.html
    ├── campo.html
    ├── motor.html
    └── transformador.html
```

## Física

**Ferraris**: B̃ = BR+BS+BT → campo giratorio con |B̃| = (3/2)·B̂

**Motor asíncrono**: modelo de Kloss. ns = 60f/p, s = (ns-nr)/ns

**Transformador**: circuito de Kapp. ΔU = I₂(Rcc·cosφ + Xcc·sinφ), η = P₂/(P₂+P₀+β²·Pcc)

## Notas

El código lo fui haciendo por partes así que hay alguna inconsistencia de estilo. Los modelos son simplificados (Kloss sin Thevenin completo, transformador sin rama de vacío en paralelo) pero son suficientes para visualización.
