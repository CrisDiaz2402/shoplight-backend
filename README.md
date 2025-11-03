# shoplight-backend
Backend para la aplicación Shoplight.

Este README documenta los endpoints disponibles, los formatos de petición y respuesta, y ejemplos prácticos para que el equipo de frontend pueda integrar la aplicación con el backend.

Base URL (en desarrollo): http://localhost:3000

## Resumen rápido
- Auth: registro y login por JWT.
- Productos: CRUD básico (listar, obtener, crear). Los productos tienen `stock` y opcionalmente `categoryId`.
- Órdenes: creación de pedidos que decrementan stock y registran ventas en un modelo `Sale` (kardex).

Revisa estas rutas en el código: `src/routes/*.ts` y los controladores en `src/controllers/*.ts`.

## Variables de entorno
Archivo: `.env` en la raíz del proyecto

Variables importantes:
- `DATABASE_URL` — cadena de conexión PostgreSQL usada por Prisma.
- `JWT_SECRET` — clave para firmar/verificar JWT.

Ejemplo:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/shoplight?schema=public"
JWT_SECRET="clave-secreta-super-segura"
```

## Autenticación
- El backend usa JWT. El endpoint `/auth/login` devuelve un token.
- Para endpoints protegidos, añadir cabecera:

	Authorization: Bearer <TOKEN>

## Endpoints (detallado)

Todos los endpoints esperan/retornan JSON salvo que se indique lo contrario. Los cuerpos deben enviarse con la cabecera `Content-Type: application/json`.

### 1) Registro de usuario
- Método: POST
- URL: `/auth/register`
- Headers: `Content-Type: application/json`
- Body JSON (requerido):
	- `email` (string)
	- `password` (string)
	- `name` (string)

Ejemplo de body:
```json
{ "email": "usuario1@gmail.com", "password": "usuario1", "name": "Usuario 1" }
```

Respuestas:
- 201 Created: devuelve el objeto `user` creado (contendrá al menos `id`, `email`, `name`, `createdAt`, `updatedAt`).
- 400 Bad Request: faltan campos o email ya registrado. Respuesta con `{ "error": "mensaje" }`.

Notas:
- El backend guarda el `password` hasheado; no deberías exponer ni almacenar el hash en el cliente.

### 2) Login
- Método: POST
- URL: `/auth/login`
- Headers: `Content-Type: application/json`
- Body JSON (requerido): `{ "email": "...", "password": "..." }`

Respuesta:
- 200 OK: `{ "token": "<JWT>" }` (puede variar, pero el proyecto devuelve `token`).
- 401 Unauthorized: credenciales inválidas.

Uso en frontend: guardar `token` en almacenamiento seguro (p. ej. HttpOnly cookie o memoria/secure storage) y enviarlo en `Authorization` para llamadas protegidas.

### 3) Listar productos
- Método: GET
- URL: `/products`
- Autorización: no requerida

Respuesta:
- 200 OK: array de objetos producto. Campos del producto (según `prisma/schema.prisma`):
	- `id` (number)
	- `name` (string)
	- `stock` (number)
	- `categoryId` (number | null)
	- `description` (string | null)
	- `price` (number)
	- `imageUrl` (string | null)
	- `createdAt`, `updatedAt` (ISO datetime)

Ejemplo (curl):
```
curl http://localhost:3000/products
```

### 4) Obtener producto por id
- Método: GET
- URL: `/products/:id`
- Autorización: no requerida

Respuesta:
- 200 OK: objeto producto
- 404 Not Found: `{ "error": "Producto no encontrado" }`

Ejemplo:
```
curl http://localhost:3000/products/1
```

### 5) Crear producto (protegido)
- Método: POST
- URL: `/products`
- Headers:
	- `Content-Type: application/json`
	- `Authorization: Bearer <TOKEN>`
- Body JSON (requerido):
	- `name` (string) — requerido
	- `price` (number) — requerido
	- `stock` (number) — opcional (default 0)
	- `categoryId` (number) — opcional
	- `description` (string) — opcional
	- `imageUrl` (string) — opcional

Ejemplo:
```json
{
	"name": "Lampara LED",
	"price": 29.99,
	"stock": 10,
	"categoryId": 1,
	"description": "Lámpara de mesa",
	"imageUrl": "https://example.com/lampara.jpg"
}
```

Respuestas:
- 201 Created: producto creado (objeto product).
- 400 Bad Request: campos faltantes o inválidos.
- 401 Unauthorized: token ausente o inválido.

### 6) Crear orden / pedido (protegido)
- Método: POST
- URL: `/orders`
- Headers:
	- `Content-Type: application/json`
	- `Authorization: Bearer <TOKEN>`
- Body JSON (requerido):
	- `items`: array de objetos `{ productId: number, quantity: number }` (requerido)
	- `paymentMethod`: string (opcional, p. ej. "card", "cash")
	- `paymentDetails`: object (opcional) — se guarda como JSON en el registro `Sale`

Ejemplo:
```json
{
	"items": [
		{ "productId": 1, "quantity": 2 },
		{ "productId": 3, "quantity": 1 }
	],
	"paymentMethod": "card",
	"paymentDetails": { "last4": "4242", "brand": "visa" }
}
```

Comportamiento:
- Valida que haya `items` y que cada `productId` exista.
- Valida que `product.stock >= quantity` para cada item; si no hay stock suficiente devuelve 400 con mensaje.
- En una transacción decrementa `product.stock`, crea registros en `Sale` (kardex) por cada item y crea la `Order` con sus `OrderItem`.

Respuestas:
- 201 Created: objeto `order` con `items` incluidos.
- 400 Bad Request: error de validación (item inválido, producto no encontrado, stock insuficiente).
- 401 Unauthorized: token ausente o inválido.

### 7) Listar órdenes del usuario (protegido)
- Método: GET
- URL: `/orders`
- Headers: `Authorization: Bearer <TOKEN>`

Respuesta:
- 200 OK: array de órdenes del usuario autenticado, cada orden incluye `items`.

## Modelo de datos (resumen)
- `User`: id, email, password(hasheado), name, createdAt, updatedAt
- `Product`: id, name, stock, categoryId, description, price, imageUrl, createdAt, updatedAt
- `Category`: id, name, description, createdAt, updatedAt
- `Order`: id, userId, total, status, createdAt, updatedAt, items (OrderItem[])
- `OrderItem`: id, orderId, productId, quantity, subtotal
- `Sale` (kardex): id, userId, productId, quantity, amount, paymentMethod, paymentDetails(Json), createdAt

## Ejemplos con fetch (frontend)

Login y guardar token:
```js
async function login(email, password) {
	const res = await fetch('http://localhost:3000/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password })
	});
	const data = await res.json();
	// data.token -> guardar en localStorage/session o cookie segura
	return data;
}
```

Obtener productos:
```js
const products = await fetch('http://localhost:3000/products').then(r => r.json());
```

Crear producto (requiere token):
```js
await fetch('http://localhost:3000/products', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'Authorization': 'Bearer ' + token
	},
	body: JSON.stringify({ name: 'Lampara', price: 19.99, stock: 5, categoryId: 1 })
});
```

Crear orden (requiere token):
```js
await fetch('http://localhost:3000/orders', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'Authorization': 'Bearer ' + token
	},
	body: JSON.stringify({ items: [{ productId: 1, quantity: 2 }], paymentMethod: 'card' })
});
```

## Errores y manejo
- Las respuestas de error usan el campo `error` con un mensaje claro, p. ej. `{ "error": "Stock insuficiente para producto 1" }`.
- Valida el código HTTP y el campo `error` en el frontend.

## Notas operativas
- Antes de usar los nuevos modelos (`stock`, `Sale`, `Category`) ejecuta las migraciones de Prisma y regenera el cliente:
```
npx prisma migrate dev --name add-category-add-stock-and-sales
npx prisma generate
```
- Instala las dependencias de tipos para TypeScript en desarrollo si trabajas con TS:
```
npm install --save-dev @types/jsonwebtoken @types/cors @types/express @types/node
```

## Próximos pasos sugeridos
- Añadir endpoints CRUD para `Category` (crear, listar, actualizar, eliminar) si el frontend necesita gestión de categorías.
- Añadir paginación y filtros en `GET /products` (por categoría, precio, búsqueda).
- Añadir endpoint para listar `Sale` (kardex) con filtros por fecha/usuario/producto.

Si quieres, puedo generar los endpoints CRUD para `Category` y un endpoint para consultar `Sale` (kardex) con paginación y filtros. También puedo ejecutar las migraciones aquí si confirmas que está bien modificar la base de datos indicada en tu `.env`.

---
Documentación generada automáticamente a partir del código fuente en `src/` y `prisma/schema.prisma`.
