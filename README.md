# Madarsa Backend Server

Production-ready Express.js backend base for the Madarsa Management System.

## Stack

- Express.js
- MySQL
- Prisma ORM
- dotenv
- cors
- helmet
- morgan

## Run Steps

1. Copy `.env.example` to `.env`
2. Update your MySQL credentials in `.env`
3. Install dependencies:
   - `npm install`
4. Generate Prisma client:
   - `npm run prisma:generate`
5. Run migrations:
   - `npm run prisma:migrate`
6. Start server:
   - `npm run dev`

## Base API

- `GET /`
- `GET /api/health`
