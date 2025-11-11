# Configuración de Google Tag Manager (GTM)

## 📋 Resumen

Este proyecto utiliza **Google Tag Manager** como capa centralizada para gestionar todos los tags de tracking (Facebook Pixel, Google Analytics 4, y eventos personalizados).

## 🚀 Pasos de Configuración

### 1. Crear Cuenta de GTM

1. Ve a [Google Tag Manager](https://tagmanager.google.com/)
2. Crea una cuenta nueva o usa una existente
3. Crea un contenedor para la web:
   - **Nombre del contenedor:** Kentra
   - **Plataforma:** Web
4. Copia el **ID del contenedor** (formato: `GTM-XXXXXXX`)

### 2. Actualizar el Código

En `index.html`, reemplaza `GTM-XXXXXXX` con tu ID real del contenedor:

```html
<!-- Línea 39 -->
})(window,document,'script','dataLayer','GTM-XXXXXXX');

<!-- Línea 66 -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
```

### 3. Configurar Tags en GTM

#### 3.1 Facebook Pixel

1. En GTM, ve a **Tags** → **Nuevo**
2. **Configuración del tag:**
   - Tipo: **Facebook Pixel**
   - Pixel ID: `TU_ID_DE_PIXEL_AQUI`
3. **Activación:**
   - Tipo: **Todas las páginas** (para PageView)
4. **Crear tags adicionales para eventos personalizados:**
   - Tipo de activación: **Evento personalizado**
   - Nombre del evento: `CompleteRegistration`, `Contact`, `Lead`, `InitiateCheckout`, `Purchase`, `ViewContent`

#### 3.2 Google Analytics 4

1. En GTM, ve a **Tags** → **Nuevo**
2. **Configuración del tag:**
   - Tipo: **Google Analytics: GA4 Configuration**
   - ID de medición: `G-XXXXXXXXXX` (tu ID de GA4)
3. **Activación:**
   - Tipo: **Todas las páginas**
4. **Crear tags para eventos GA4:**
   - Tipo: **Google Analytics: GA4 Event**
   - Nombre del evento: `sign_up`, `generate_lead`, `begin_checkout`, `purchase`, `view_item`, `view_item_list`, `select_item`, `add_to_wishlist`, `remove_from_wishlist`, `search`, `view_promotion`

#### 3.3 Variables Personalizadas

Crea las siguientes variables de capa de datos:

1. **Variables de comercio electrónico:**
   - `ecommerce.value`
   - `ecommerce.currency`
   - `ecommerce.items`

2. **Variables de contenido:**
   - `content_name`
   - `content_category`
   - `item_id`
   - `item_name`

3. **Variables de búsqueda:**
   - `search_term`

### 4. Mapeo de Eventos

El sistema envía eventos a `dataLayer` de GTM, que luego los distribuye a FB Pixel y GA4:

| Evento en Código | Facebook Pixel | Google Analytics 4 |
|------------------|----------------|-------------------|
| `CompleteRegistration` | `CompleteRegistration` | `sign_up` |
| `Contact` / `Lead` | `Contact` / `Lead` | `generate_lead` |
| `InitiateCheckout` | `InitiateCheckout` | `begin_checkout` |
| `Purchase` | `Purchase` | `purchase` |
| `ViewContent` | `ViewContent` | `view_item` |
| `view_item_list` | - | `view_item_list` |
| `select_item` | - | `select_item` |
| `add_to_wishlist` | - | `add_to_wishlist` |
| `remove_from_wishlist` | - | `remove_from_wishlist` |
| `search` | - | `search` |
| `view_promotion` | - | `view_promotion` |

### 5. Activadores (Triggers)

Crea los siguientes activadores en GTM:

#### Para Facebook Pixel:
- **Activador:** Evento personalizado
- **Nombre del evento:** `CompleteRegistration|Contact|Lead|InitiateCheckout|Purchase|ViewContent`
- **Este activador se activa en:** Algunos eventos personalizados
- **Nombre del evento coincide con RegEx:** `CompleteRegistration|Contact|Lead|InitiateCheckout|Purchase|ViewContent`

#### Para GA4:
- **Activador:** Evento personalizado
- **Nombre del evento:** `sign_up|generate_lead|begin_checkout|purchase|view_item|view_item_list|select_item|add_to_wishlist|remove_from_wishlist|search|view_promotion`
- **Este activador se activa en:** Algunos eventos personalizados

### 6. Probar la Configuración

1. En GTM, haz clic en **Vista previa**
2. Ingresa tu URL de desarrollo/producción
3. Navega por el sitio y verifica que los eventos se disparen correctamente
4. Revisa el panel de depuración de GTM para ver:
   - Eventos recibidos en `dataLayer`
   - Tags disparados
   - Variables capturadas

### 7. Publicar Contenedor

Una vez que todas las pruebas sean exitosas:

1. En GTM, haz clic en **Enviar**
2. Agrega un nombre de versión (ej: "Configuración inicial - FB Pixel + GA4")
3. Agrega una descripción
4. Haz clic en **Publicar**

## 📊 Ventajas de GTM

1. **Gestión Centralizada:**
   - Todos los tags en un solo lugar
   - No necesitas editar código para agregar/modificar tags

2. **Versionamiento:**
   - Historial completo de cambios
   - Rollback fácil a versiones anteriores

3. **Testing:**
   - Modo de vista previa para probar antes de publicar
   - Depuración integrada

4. **Performance:**
   - Carga asíncrona de tags
   - Optimización automática

5. **Escalabilidad:**
   - Fácil agregar nuevos tags (LinkedIn Insight, Twitter Pixel, etc.)
   - Gestión de permisos por usuario

## 🔍 Debugging

Para verificar que GTM está funcionando correctamente:

1. **Consola del navegador:**
```javascript
// Verificar que dataLayer existe
console.log(window.dataLayer);

// Ver todos los eventos enviados
window.dataLayer.forEach(event => console.log(event));
```

2. **Extensión de Chrome:**
   - Instala [Google Tag Assistant](https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk)
   - Navega por el sitio y verifica que los tags se disparen

3. **Panel de GTM:**
   - Usa el modo de vista previa para ver eventos en tiempo real

## 📝 Eventos Personalizados Implementados

El sistema actual trackea los siguientes eventos mediante GTM:

- **Registro de usuarios:** `CompleteRegistration`
- **Contacto con agentes:** `Contact` / `Lead` / `generate_lead`
- **Inicio de checkout:** `InitiateCheckout` / `begin_checkout`
- **Compras completadas:** `Purchase` / `purchase`
- **Visualización de propiedades:** `ViewContent` / `view_item` / `view_promotion`
- **Acciones de favoritos:** `add_to_wishlist` / `remove_from_wishlist`
- **Búsquedas:** `search`
- **Selección de propiedades:** `select_item`
- **Visualización de galería:** `view_item_list`

## 🆘 Troubleshooting

### GTM no carga:
- Verifica que el ID del contenedor es correcto
- Revisa la consola del navegador por errores
- Asegúrate que no haya bloqueadores de ads activos

### Eventos no se disparan:
- Verifica que `dataLayer` está inicializado
- Revisa el modo de vista previa de GTM
- Confirma que los activadores están configurados correctamente

### Tags no se ejecutan:
- Verifica que los tags tienen los activadores correctos
- Revisa que las variables personalizadas están capturando datos
- Asegúrate que el contenedor está publicado (no solo en vista previa)

## 📚 Recursos

- [Documentación oficial de GTM](https://support.google.com/tagmanager)
- [Guía de Facebook Pixel con GTM](https://www.facebook.com/business/help/1021909254506499)
- [Guía de GA4 con GTM](https://support.google.com/analytics/answer/9744165)
