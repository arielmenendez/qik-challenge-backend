# Backend — Accounts & Ledger Service

Backend construido con:

- **NestJS**
- **TypeORM**
- **PostgreSQL**
- **Redis**
- **GraphQL (Apollo)**
- **REST (Auth)**
- **JWT Authentication**
- **Docker Compose**

---

# Requisitos

Solo necesitas:

- **Docker Desktop** (o Docker Engine + Compose)

No necesitas instalar Node ni Postgres localmente si usas Docker.

---

# Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto.

### Configuración para Docker

```env
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_HOST=db
DATABASE_NAME=qik_database
DATABASE_PORT=5432

PORT=3000

BCRYPT_SALT_ROUNDS=12
JWT_SECRET=super_ultra_secret_key
JWT_EXPIRES_IN=15m

REDIS_HOST=redis
REDIS_PORT=6379
```

---

# Levantar el proyecto con Docker

Desde la raíz del proyecto:

```bash
docker compose up --build
```

Esto levanta:

| Servicio | URL |
|---------|-----|
| Backend API | http://localhost:3000 |
| GraphQL | http://localhost:3000/graphql |
| Swagger REST | http://localhost:3000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

# Autenticación (REST)

Base URL REST:

```
http://localhost:3000/api/v1
```

---

## Registro de usuario

**POST**  
`/auth/register`

```json
{
  "name": "Ariel",
  "email": "arielmenendez19@gmail.com",
  "password": "123456"
}
```

Respuesta:

```json
{
  "id": "2b51ac57-9050-463d-a5fa-09b36b78595f",
  "name": "Ariel",
  "email": "arielmenendez19@gmail.com",
  "role": "client"
}
```

---

## Login

**POST**  
`/auth/login`

```json
{
  "email": "arielmenendez19@gmail.com",
  "password": "123456"
}
```

Respuesta:

```json
{
  "access_token": "JWT_TOKEN_AQUI",
  "user": {
    "id": "2b51ac57-9050-463d-a5fa-09b36b78595f",
    "name": "Ariel",
    "email": "arielmenendez19@gmail.com",
    "role": "client"
  }
}
```

---

## Autorización

Todos los endpoints protegidos requieren:

```
Authorization: Bearer TU_TOKEN_AQUI
```

---

# GraphQL API

URL:

```
http://localhost:3000/graphql
```

En GraphQL Playground, agregar en **HTTP HEADERS**:

```json
{
  "Authorization": "Bearer TU_TOKEN_AQUI"
}
```

---

# Cuentas

### Crear cuenta

```graphql
mutation {
  createAccount {
    id
    balance
    createdAt
  }
}
```

---

### Mis cuentas

```graphql
query {
  myAccounts {
    id
    balance
    createdAt
  }
}
```

---

### Obtener cuenta por ID

```graphql
query GetAccount($accountId: ID!) {
  account(id: $accountId) {
    id
    balance
    createdAt
  }
}
```

Variables:

```json
{
  "accountId": "319060fa-b058-46a2-9a05-8d83dd9561dc"
}
```

---

### Balance de una cuenta

```graphql
query GetBalance($accountId: ID!) {
  accountBalance(id: $accountId)
}
```

Variables:

```json
{
  "accountId": "319060fa-b058-46a2-9a05-8d83dd9561dc"
}
```

---

# Transacciones

### Crédito

```graphql
mutation Credit($accountId: ID!, $amount: Float!, $description: String) {
  credit(accountId: $accountId, amount: $amount, description: $description) {
    id
    type
    amount
    createdAt
  }
}
```

Variables:

```json
{
  "accountId": "319060fa-b058-46a2-9a05-8d83dd9561dc",
  "amount": 100,
  "description": "lo que te debo"
}
```

---

### Débito

```graphql
mutation Debit($accountId: ID!, $amount: Float!) {
  debit(accountId: $accountId, amount: $amount) {
    id
    type
    amount
    createdAt
  }
}
```

Variables:

```json
{
  "accountId": "319060fa-b058-46a2-9a05-8d83dd9561dc",
  "amount": 40
}
```

---

### Listar transacciones

```graphql
query GetTransactions($accountId: ID!) {
  transactions(accountId: $accountId) {
    total
    data {
      id
      type
      amount
      description
      createdAt
    }
  }
}
```

Variables:

```json
{
  "accountId": "319060fa-b058-46a2-9a05-8d83dd9561dc"
}
```

---

### Filtros disponibles

- Por tipo (CREDIT / DEBIT)
- Por rango de fechas
- Paginación (limit / offset)

## Ejemplos de uso de filtros

### Filtrar solo créditos

```graphql
query GetCredits($accountId: ID!) {
  transactions(accountId: $accountId, type: CREDIT) {
    total
    data {
      id
      type
      amount
      createdAt
    }
  }
}
```

Variables:

```json
{
  "accountId": "319060fa-b058-46a2-9a05-8d83dd9561dc"
}
```

---

### Filtrar solo débitos

```graphql
query GetDebits($accountId: ID!) {
  transactions(accountId: $accountId, type: DEBIT) {
    total
    data {
      id
      type
      amount
      createdAt
    }
  }
}
```

Variables:

```json
{
  "accountId": "319060fa-b058-46a2-9a05-8d83dd9561dc"
}
```

---

### Filtrar por rango de fechas

```graphql
query GetByDate($accountId: ID!, $from: DateTime!, $to: DateTime!) {
  transactions(accountId: $accountId, from: $from, to: $to) {
    total
    data {
      id
      type
      amount
      createdAt
    }
  }
}
```

Variables:

```json
{
  "accountId": "319060fa-b058-46a2-9a05-8d83dd9561dc",
  "from": "2026-01-01T00:00:00.000Z",
  "to": "2026-12-31T23:59:59.999Z"
}
```

---

### Paginación de resultados

```graphql
query GetPaged($accountId: ID!, $limit: Int!, $offset: Int!) {
  transactions(accountId: $accountId, limit: $limit, offset: $offset) {
    total
    data {
      id
      type
      amount
      createdAt
    }
  }
}
```

Variables:

```json
{
  "accountId": "319060fa-b058-46a2-9a05-8d83dd9561dc",
  "limit": 2,
  "offset": 0
}
```

---

### Filtros combinados (tipo + fecha + paginación)

```graphql
query GetFiltered(
  $accountId: ID!,
  $from: DateTime!,
  $to: DateTime!,
  $limit: Int!,
  $offset: Int!
) {
  transactions(
    accountId: $accountId
    type: CREDIT
    from: $from
    to: $to
    limit: $limit
    offset: $offset
  ) {
    total
    data {
      id
      type
      amount
      description
      createdAt
    }
  }
}
```

Variables:

```json
{
  "accountId": "319060fa-b058-46a2-9a05-8d83dd9561dc",
  "from": "2026-01-01T00:00:00.000Z",
  "to": "2026-12-31T23:59:59.999Z",
  "limit": 2,
  "offset": 0
}
```
---

# Resumen de cuenta (con Redis Cache)

```graphql
query GetSummary($accountId: ID!) {
  accountSummary(accountId: $accountId) {
    balance
    totalCredits
    totalDebits
  }
}
```

Variables:

```json
{
  "accountId": "319060fa-b058-46a2-9a05-8d83dd9561dc"
}
```

Este endpoint usa Redis para cachear resultados.  
El cache se invalida automáticamente al crear una transacción.

---

# Historial de balance

```graphql
query GetBalanceHistory($accountId: ID!) {
  balanceHistory(accountId: $accountId) {
    date
    balance
    type
    amount
    transactionId
  }
}
```

Variables:

```json
{
  "accountId": "319060fa-b058-46a2-9a05-8d83dd9561dc"
}
```

---

# Tests

```bash
npm run test
```

---

# Notas

- Swagger: `http://localhost:3000/docs`
- GraphQL: `http://localhost:3000/graphql`
- Redis se usa para mejorar performance
- PostgreSQL guarda datos persistentes
- JWT protege todos los endpoints sensibles

---

**Proyecto desarrollado como parte de la Prueba Técnica Full‑Stack para Qik Banco Digital por Ariel Menéndez Méndez.**
