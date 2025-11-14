# Funnel de Conversión UX - Kentra

## Objetivo del Funnel

Convertir visitantes en usuarios activos que publican su primera propiedad de manera simple, clara y sin fricción.

---

## Diagrama del Funnel Principal

```
Visitante → Registro/Login → Selección de Plan → Pago en Stripe → Publicar Primera Propiedad
```

### Flujo Detallado

```
1. HOME (/)
   ↓ Usuario hace click en "Publicar Propiedad"
   
2. PUBLICAR (/publicar)
   ↓ Si NO está autenticado → Redirige a /auth?redirect=/publicar
   ↓ Si está autenticado → Muestra opciones de rol
   
3. AUTH (/auth)
   ↓ Usuario se registra o inicia sesión
   ↓ Redirige a /publicar (si vino de ahí) o a /
   
4. SELECCIÓN DE ROL (/publicar)
   ↓ Usuario elige: Agente | Inmobiliaria | Desarrolladora
   ↓ Redirige a página de pricing correspondiente
   
5. PRICING (/pricing-agente | /pricing-inmobiliaria | /pricing-desarrolladora)
   ↓ Usuario elige plan y período de facturación
   ↓ Si NO autenticado → Redirige a /auth?redirect=/pricing-[tipo]
   ↓ Si ya tiene suscripción activa → Redirige a dashboard
   ↓ Crea sesión de Stripe Checkout
   
6. STRIPE CHECKOUT (externo)
   ↓ Usuario ingresa datos de pago
   ↓ Success → Redirige a /payment-success?payment=success&plan=[nombre]
   ↓ Cancel → Redirige a /pricing-[tipo]
   
7. PAYMENT SUCCESS (/payment-success)
   ↓ Muestra confirmación de suscripción activa
   ↓ CTA PRINCIPAL: "Publicar mi primera propiedad"
   ↓ CTA SECUNDARIO: "Ir a mi dashboard"
   
8. DASHBOARD (/panel-agente | /panel-inmobiliaria)
   ↓ Si no tiene propiedades → Estado vacío con CTA grande
   ↓ Usuario hace click en "Crear propiedad" o CTA
   
9. FORMULARIO DE PROPIEDAD (tab=form)
   ✓ Usuario completa y publica su primera propiedad
```

---

## Descripción de Cada Paso

### 1. Home (/)
**Objetivo:** Captar interés y dirigir hacia publicación.

**Elementos clave:**
- Header con botón "Publicar Propiedad" visible
- Hero con propuesta de valor clara
- CTAs que dirigen a /publicar

**Salidas:**
- Click en "Publicar" → /publicar
- Click en "Buscar" → /buscar
- Click en "Login" → /auth

---

### 2. Publicar (/publicar)
**Objetivo:** Identificar el tipo de usuario (Agente, Inmobiliaria, Desarrolladora).

**Elementos clave:**
- Título: "¿Quién va a publicar?"
- 3 botones grandes con descripciones claras
- Verifica autenticación primero

**Lógica:**
```typescript
if (!user && !loading) {
  navigate('/auth?redirect=/publicar');
}
```

**CTAs:**
- "Soy Agente" → /pricing-agente
- "Soy Inmobiliaria" → /pricing-inmobiliaria  
- "Soy Desarrolladora" → /pricing-desarrolladora

**Mejoras implementadas:**
- ✅ Verifica autenticación antes de mostrar opciones
- ✅ Redirige a login si no autenticado con redirect correcto
- ✅ Guarda contexto de "rol" para uso futuro

---

### 3. Auth (/auth)
**Objetivo:** Registrar o autenticar al usuario.

**Elementos clave:**
- Tabs: Login | Registro
- Formularios con validación (zod)
- Opción de Google Sign-In
- Recuperación de contraseña

**Lógica post-autenticación:**
```typescript
if (user && redirect) {
  navigate(redirect); // Vuelve a /publicar si vino de ahí
} else if (user) {
  navigate('/'); // Va a home si entró directo
}
```

**Mejoras pendientes:**
- Pre-seleccionar rol en registro si viene de pricing
- Simplificar flujo cuando ya sabemos el rol del usuario

---

### 4. Pricing Pages
**Rutas:** 
- `/pricing-agente`
- `/pricing-inmobiliaria`
- `/pricing-desarrolladora`

**Objetivo:** Mostrar planes y convertir a suscripción.

**Elementos clave:**
- Hero con propuesta de valor por rol
- Toggle: Mensual | Anual (con descuento visual)
- Cards de planes comparativos
- Plan recomendado destacado
- FAQ con acordeón

**Validaciones implementadas:**
```typescript
// Antes de crear checkout
if (!user) {
  navigate('/auth?redirect=/pricing-[tipo]');
  return;
}

const { hasActive } = await checkActiveSubscription(user.id);
if (hasActive) {
  toast.error('Ya tienes una suscripción activa');
  navigate('/dashboard');
  return;
}
```

**CTAs:**
- "Seleccionar Plan" → Crea Stripe Checkout Session
- "Comenzar ahora" (hero) → Scroll a planes

**Mejoras implementadas:**
- ✅ No permite doble suscripción
- ✅ Mensajes claros de error
- ✅ Redirige a dashboard si ya tiene plan activo

---

### 5. Stripe Checkout (Externo)
**Objetivo:** Procesar pago de forma segura.

**Configuración:**
- Success URL: `/payment-success?payment=success&plan=[nombre]`
- Cancel URL: `/pricing-[tipo]`
- Metadata incluye: user_id, plan_slug, billing_cycle

**Sincronización:**
- Webhook stripe-webhook procesa eventos
- Actualiza user_subscriptions en DB
- Idempotente con processed_webhook_events

---

### 6. Payment Success (/payment-success)
**Objetivo:** Confirmar suscripción y guiar hacia publicación.

**Elementos clave:**
- ✅ Mensaje de éxito con ícono
- Card con detalles de suscripción:
  - Plan contratado
  - Precio y período
  - Fecha de renovación
  - Features incluidas
- **CTA PRINCIPAL:** "Publicar mi primera propiedad" (Button grande, primario)
- **CTA SECUNDARIO:** "Ir a mi dashboard" (Button outline)

**Lógica de redirección:**
```typescript
handlePublishProperty() {
  if (plan.includes('inmobiliaria')) {
    navigate('/panel-inmobiliaria?tab=inventory');
  } else {
    navigate('/panel-agente?tab=form');
  }
}
```

**Casos especiales:**
- Si es upsell → Mensaje simplificado + redirige a dashboard
- Si no se encuentra suscripción → Mensaje de error con contacto

**Mejoras implementadas:**
- ✅ CTA principal enfocado en publicar primera propiedad
- ✅ Jerarquía visual clara (primario vs secundario)
- ✅ Redirige directamente al formulario/inventario según rol

---

### 7. Dashboards
**Rutas:**
- `/panel-agente`
- `/panel-inmobiliaria`

**Objetivo:** Centro de control del usuario, orientado a publicar si no tiene propiedades.

**Tabs:**
- Agente: Lista | Crear | Analytics | Suscripción
- Inmobiliaria: Inventario | Equipo | Analytics | Suscripción

**Estado vacío (sin propiedades):**
```tsx
<Card>
  <CardHeader>
    <CardTitle>¡Bienvenido a Kentra!</CardTitle>
    <CardDescription>
      Aún no has publicado propiedades
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Button size="lg" onClick={() => setActiveTab('form')}>
      <Plus className="mr-2" />
      Publicar mi primera propiedad
    </Button>
  </CardContent>
</Card>
```

**Mejoras pendientes:**
- Hacer estado vacío más atractivo visualmente
- Agregar ilustración o ícono grande
- Mostrar beneficios de publicar primera propiedad

---

### 8. Formulario de Propiedad (PropertyForm)
**Objetivo:** Capturar datos de la propiedad y publicarla.

**Campos principales:**
- Título y descripción
- Tipo de propiedad
- Precio y moneda
- Ubicación (estado, municipio, colonia)
- Características (recámaras, baños, m², etc.)
- Imágenes
- Amenidades

**Validación de límites:**
```typescript
const { canPublish, reason } = await validatePropertyLimits(userId);
if (!canPublish) {
  toast.error(reason);
  // Mostrar opción de upgrade o comprar slots
}
```

**CTAs:**
- "Publicar propiedad" → Crea propiedad en DB
- "Guardar borrador" → Guarda con status=borrador
- "Cancelar" → Vuelve a lista

---

## Indicadores de Progreso

### Breadcrumbs (DynamicBreadcrumbs)
Implementado en dashboards para mostrar navegación:
```
Home > Panel de Agente > Crear Propiedad
```

### Stepper de Funnel (Pendiente)
Mostrar en páginas de registro/pricing:
```
1. Crea tu cuenta
2. Elige tu plan ← Estás aquí
3. Configura tu pago
4. Publica tu primera propiedad
```

---

## Mensajes Clave por Pantalla

### Home
- Hero: "Publica, gestiona y promociona propiedades en un solo lugar"
- CTA: "Publicar Propiedad"

### Publicar
- Título: "¿Quién va a publicar?"
- Descripción: "Elige el tipo de cuenta que se adapta a tu actividad"

### Auth - Registro
- Título: "Crea tu cuenta en Kentra"
- Descripción: "Comienza a publicar propiedades en minutos"

### Pricing
- Agente: "Planes diseñados para agentes independientes"
- Inmobiliaria: "Gestiona tu equipo y administra tu inventario"
- Desarrolladora: "Promociona proyectos completos con visibilidad premium"

### Payment Success
- Título: "¡Suscripción Exitosa!"
- Mensaje: "Tu plan [nombre] está activo y listo para usar"
- CTA: "Publicar mi primera propiedad"

### Dashboard vacío
- Título: "¡Bienvenido a Kentra!"
- Mensaje: "Aún no has publicado propiedades. Comienza ahora y alcanza a miles de compradores."
- CTA: "Publicar mi primera propiedad"

---

## Manejo de Errores y Estados Especiales

### Error: Usuario sin autenticar
**Dónde:** /publicar, /pricing-*, dashboards
**Acción:** Redirige a /auth con redirect URL
**Mensaje:** Automático (redirect)

### Error: Usuario ya tiene suscripción activa
**Dónde:** Pricing pages al intentar checkout
**Acción:** Redirige a dashboard
**Mensaje:** "Ya tienes una suscripción activa. Ve a tu dashboard para gestionar tu plan."

### Error: Usuario alcanzó límite de publicaciones
**Dónde:** PropertyForm al intentar crear
**Acción:** Bloquea submit, muestra alerta
**Mensaje:** "Has alcanzado el límite de publicaciones de tu plan. Contrata slots adicionales o mejora de plan."
**CTAs:** "Ver upsells" | "Cambiar plan"

### Error: Pago fallido en Stripe
**Dónde:** Webhook o usuario vuelve de checkout cancelado
**Acción:** Redirige a pricing page
**Mensaje:** "No se pudo procesar el pago. Intenta nuevamente."

### Error: Suscripción en past_due
**Dónde:** Dashboard (PlanStatusCard)
**Acción:** Banner de alerta visible
**Mensaje:** "Hay un problema con tu pago. Actualiza tu método de pago para no perder visibilidad."
**CTA:** "Actualizar método de pago"

### Estado: Email no verificado
**Dónde:** Dashboard
**Acción:** Banner de alerta
**Mensaje:** "Verifica tu email para desbloquear todas las funciones."
**CTA:** "Reenviar email de verificación"

---

## Prevención de Fricciones

### ✅ Auto-login después de Stripe
- Usuario mantiene sesión después de volver de checkout
- No se pide login nuevamente
- Webhook sincroniza suscripción automáticamente

### ✅ No repetir selección de rol
- Una vez elegido en /publicar, va directo a pricing
- No se vuelve a pedir el rol en otros pasos

### ✅ No permitir doble suscripción
- Validación antes de crear checkout
- Si ya tiene plan activo, redirige a dashboard

### ✅ Mensajes claros de error
- Todos los errores tienen mensaje user-friendly
- Se evitan errores técnicos expuestos al usuario

### ✅ CTAs siempre visibles
- En payment-success: CTA principal destacado
- En estado vacío: Botón grande para crear primera propiedad
- En límites alcanzados: Opciones claras de upgrade/upsell

---

## Métricas de Éxito del Funnel

### Puntos de medición:
1. **Home → /publicar:** % de visitantes que hacen click
2. **Publicar → Auth:** % que necesitan registrarse
3. **Auth → Pricing:** % que completan registro
4. **Pricing → Stripe:** % que inician checkout
5. **Stripe → Payment Success:** % de pagos exitosos (conversión)
6. **Payment Success → Dashboard:** % que continúan
7. **Dashboard → Primera propiedad publicada:** % de activación

### Evento de conversión principal:
**"Primera propiedad publicada"** - Usuario activo exitoso

---

## Oportunidades de Mejora

### A corto plazo:
1. ✅ Mejorar estado vacío en dashboards con ilustración
2. ✅ Agregar stepper visual de progreso en funnel
3. ⚠️ Optimizar formulario de propiedad (wizard multi-paso)
4. ⚠️ Agregar tooltips explicativos en campos complejos

### A mediano plazo:
1. Onboarding interactivo (tour guiado)
2. Video tutorial de "Cómo publicar tu primera propiedad"
3. Templates de propiedades para comenzar rápido
4. Notificaciones push para completar funnel

### A largo plazo:
1. Personalización del funnel según fuente de tráfico
2. A/B testing de mensajes y CTAs
3. Scoring de calidad de perfil (gamificación)
4. Programa de referidos integrado en funnel

---

## Checklist de Implementación

### Completado ✅:
- [x] Verificación de autenticación en /publicar
- [x] Redirect apropiado en todas las páginas
- [x] Validación de suscripción activa antes de checkout
- [x] Prevención de doble-click en botones de pago
- [x] CTA principal en payment-success enfocado en publicar
- [x] Manejo de estados: active, trialing, past_due, canceled
- [x] Mensajes de error user-friendly
- [x] Documentación completa del funnel

### Pendiente ⚠️:
- [ ] Mejorar estado vacío visual en dashboards
- [ ] Agregar stepper de progreso en registro/pricing
- [ ] Optimizar formulario de propiedad (UX más simple)
- [ ] Tests E2E del funnel completo
- [ ] Analytics tracking en cada paso del funnel

---

## Testing del Funnel

### Escenarios de prueba:

#### Happy Path:
1. Usuario nuevo visita home
2. Click en "Publicar"
3. Redirige a auth
4. Se registra como Agente
5. Vuelve a /publicar
6. Elige "Soy Agente"
7. Va a /pricing-agente
8. Selecciona plan y período
9. Completa pago en Stripe
10. Ve confirmación en /payment-success
11. Click en "Publicar mi primera propiedad"
12. Completa formulario
13. ✅ Propiedad publicada exitosamente

#### Usuario con suscripción activa:
1. Usuario autenticado con plan activo
2. Intenta acceder a /pricing-agente
3. Sistema detecta suscripción activa
4. Redirige a /panel-agente
5. ✅ Evita doble suscripción

#### Pago cancelado:
1. Usuario inicia checkout
2. Cancela en Stripe
3. Vuelve a /pricing-agente
4. ✅ Puede reintentar

#### Usuario alcanza límite:
1. Agente con 3 propiedades (límite de su plan)
2. Intenta publicar cuarta propiedad
3. Sistema bloquea acción
4. Muestra mensaje de límite
5. Ofrece opciones: comprar slots o upgrade
6. ✅ Conversión a upsell o plan superior

---

## Conclusión

Este funnel está diseñado para:
- **Simplicidad:** Mínimos pasos necesarios
- **Claridad:** Mensajes directos y CTAs visibles
- **Conversión:** Guía al usuario hacia publicar su primera propiedad
- **Seguridad:** Validaciones en cada paso para evitar errores

El objetivo final es que cualquier visitante pueda convertirse en usuario activo (con al menos 1 propiedad publicada) en menos de 10 minutos.
