# Local Area Market Place

A small full-stack college project for local residents to list items, arrange meetings and record simulated purchases. **No real payments or wallet are included.**

## Requirements

Node.js and npm, MongoDB Community Server (or MongoDB Atlas), and a browser. Compass is optional. This project uses React, Express, Mongoose and MongoDB. Webpack is used for the frontend development server because Vite's native components were blocked on the original Windows machine.

## Setup and run on Windows

Start the local MongoDB service. In two VS Code PowerShell terminals:

```powershell
cd "C:\Users\yeomi\Desktop\SEM V\FE\Local Area Market Place\server"
npm.cmd install
npm.cmd run dev
```

```powershell
cd "C:\Users\yeomi\Desktop\SEM V\FE\Local Area Market Place\client"
npm.cmd install
npm.cmd run dev
```

Open http://localhost:3000. The backend health check is http://localhost:5000/api/health. For a fresh copy, copy `server/.env.example` to `server/.env`, then set a unique random `JWT_SECRET` of at least 32 characters. Do not commit or share `.env`. The local database defaults to `mongodb://127.0.0.1:27017/local_area_marketplace`.

## Admin account

Create an admin from the server folder. Choose a new email that is not already registered and a strong password of at least 8 characters. These commands use temporary variables in your PowerShell window; replace the example values locally and do not share the password.

```powershell
$env:ADMIN_EMAIL = 'admin@example.com'
$env:ADMIN_PASSWORD = 'replace-with-your-own-password'
node seed/createAdmin.js
Remove-Item Env:ADMIN_PASSWORD
Remove-Item Env:ADMIN_EMAIL
```

Use **Admin login** on the home page. The admin can inspect users and hide available listings. Hiding keeps records rather than physically deleting them. No default admin password is provided.

## Features

Register and log in, choose Makkawala/Rajpur/Jakhan, browse by area, search and filter categories, post an image and item, manage your listings, record a simulation purchase, request an offline meeting, and accept or decline incoming requests. Seller contact is visible to signed-in users; buyer contact appears to the seller in their purchase or meeting record. The area selector is a simple illustration, not an actual geographical map.

Simulated purchase records are embedded in the listing. MongoDB updates the sold status and purchase information in a single atomic update, preventing two purchases of the same available item. Buyer and seller records are protected by login. Listings with purchase records cannot be deleted through the seller interface. Meeting requests are separate documents and include an item title snapshot so they remain understandable if a listing is removed. A meeting is a request, not a reservation; the listing may become unavailable before a meeting takes place.

## Project structure and architecture

`client/src` contains React pages/components and CSS. `server/models` defines MongoDB documents; `server/routes` handles REST requests; `server/middleware` checks authentication; `server/config` contains the database connection and simulation area names. Uploaded images are stored in `server/uploads`, which is ignored by Git.

```text
Browser (React) -> HTTP / REST -> Express routes -> Mongoose -> MongoDB
                                  -> local uploads folder (images)
```

Main endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/areas`, `/api/listings`, `/api/listings/mine`, `/api/listings/:id/purchase`, `/api/listings/purchases`, `/api/meetings`, and `/api/admin/overview`. Edit, sold and delete use listing-specific endpoints; admin removal uses `/api/admin/listings/:id/remove`.

## Testing the simulation

Use two resident accounts to post an item, buy it or request a meeting, and inspect the corresponding records from both accounts. Try an incorrect password, an invalid image, and an item in a different area. A seller cannot buy their own item or accept a meeting after the listing is unavailable. Create a separate admin and check that a resident is denied admin APIs. No real money is charged.

## Limitations and future work

Designed for a local classroom demonstration, not public deployment: local image storage needs backups and validation hardening; session storage tokens, unrestricted sign-in attempts, and contact visibility would need stronger security and privacy controls; there are no notifications, chat, real maps, real payments or delivery. The simplified meeting availability check is not a reservation and can race with a purchase. Future improvements include notifications, a real map, secure image storage, rate limiting, accessibility review and stronger production authentication.

## Viva preparation

1. **What is React's role?** It renders the interface and sends HTTP requests with Fetch.
2. **What does Express do?** It defines REST endpoints, validates requests and enforces permissions.
3. **Why MongoDB and Mongoose?** MongoDB stores user, listing and meeting documents; Mongoose defines their shapes and connects from Node.
4. **How are passwords protected?** bcrypt hashes passwords before storage; login compares a submitted password with the hash.
5. **How are routes protected?** A signed JWT identifies the user, and middleware loads the account and checks its role or listing ownership.
6. **What prevents double purchase?** A conditional single-document update changes an available listing to sold while recording the buyer.
7. **Is a meeting a purchase?** No. It is a request the seller accepts or declines; an offline transaction is arranged separately.
8. **What are the main limitations?** No real payment, live map or delivery, and the security/storage setup is intended for a local simulation.
