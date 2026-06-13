# Sistema de Gestión Sindical

Plataforma de gestión para sindicatos: afiliados, ayudas económicas, órdenes de compra, cuotas, cobranzas, liquidación municipal y reportes financieros.

## Stack

- **Next.js 16** (App Router, `proxy.ts`) + React 19 + TypeScript
- **Neon Postgres** + Drizzle ORM (transacciones reales vía WebSocket)
- **NextAuth v5** (credenciales + JWT, roles `admin` / `operator` / `readonly`)
- **Tailwind CSS 4** + Radix UI + sonner
- **Resend** (envío de liquidaciones por email) · **xlsx** (Excel municipal)
- Deploy pensado para **Vercel** (crons incluidos en `vercel.json`)

## Funcionalidad principal

| Módulo | Descripción |
|---|---|
| Dashboard | Métricas financieras por período: capital entregado, a cobrar, cobrado, mora, ganancia |
| Afiliados | Padrón con salario, cupo mensual (30% del bruto) y disponible en tiempo real |
| Beneficios | Ayudas económicas (hasta 3 cuotas) y órdenes de compra (1 cuota), con interés |
| Cuotas | Generación automática (regla día 19), cobro manual o automático (cron mensual) |
| Mora | Cuotas vencidas marcadas automáticamente por cron diario |
| Exportar | Excel de liquidación municipal + envío por email con log de auditoría |
| Usuarios | Gestión de cuentas y roles (solo administradores) |
| Auditoría | Todas las operaciones registran quién, qué y cuándo en `audit_logs` |

## Reglas de negocio clave

- **Tope mensual del 30%**: la suma de cuotas activas de un afiliado en un mes nunca puede superar el 30% de su salario bruto. Se valida con la función SQL `validate_monthly_credit` contra el estado actual de la base.
- **Regla del día 19**: los beneficios otorgados del 1 al 19 descuentan su primera cuota el último día de ese mismo mes; del 20 en adelante, el último día del mes siguiente. Coincide con el período de liquidación municipal (20 del mes anterior → 19 del actual).
- **Ayuda económica**: máximo 3 cuotas. **Orden de compra (supermercado)**: exactamente 1 cuota.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completar credenciales
npm run db:migrate           # aplicar migraciones
npm run seed:admin -- admin@sindicato.org "contraseña-segura" "Nombre Admin"
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) e ingresá con el usuario creado.

### Variables de entorno

Ver [.env.example](.env.example). Mínimas para arrancar: `DATABASE_URL`, `AUTH_SECRET`.

### Scripts

| Script | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `start` | Build y servidor de producción |
| `npm run lint` | ESLint |
| `npm run db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle Kit |
| `npm run seed:admin -- <email> <password> [nombre]` | Crea/actualiza un administrador |

## Seguridad

- Todas las páginas y APIs requieren sesión (verificado en `src/proxy.ts` **y** en cada route handler).
- Mutaciones requieren rol `admin` u `operator`; gestión de usuarios, solo `admin`.
- Contraseñas con bcrypt (12 rounds). Sesiones JWT de 12 horas.
- Endpoints de cron protegidos con `CRON_SECRET` (Vercel lo envía automáticamente).
- Headers de seguridad globales en `next.config.ts`.

## Crons (Vercel)

| Endpoint | Cron | Función |
|---|---|---|
| `/api/cron/auto-pay-installments` | `0 3 5 * *` | Marca como cobradas las cuotas del período (descuento por recibo) |
| `/api/cron/mark-overdue` | `30 3 * * *` | Marca cuotas vencidas como `overdue` (mora) |

## Estructura

```
src/
├── app/                  # Rutas (App Router)
│   ├── (dashboard)/      # Páginas autenticadas (shell con sidebar)
│   ├── login/            # Login
│   └── api/              # Route handlers (REST)
├── components/           # UI (ui/, layout/, por dominio)
├── lib/
│   ├── auth/             # NextAuth, guards de roles
│   ├── db/               # Drizzle (schema + cliente Neon)
│   ├── services/         # Lógica de negocio (transacciones, auditoría)
│   ├── validations/      # Schemas Zod
│   └── utils/            # Moneda, fechas, export Excel
├── proxy.ts              # Protección global de rutas (Next 16)
└── types/                # Tipos compartidos + augmentación next-auth
```
