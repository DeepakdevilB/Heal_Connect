# HealConnect: Tech Stack & Planning Flaws Review

While the chosen stack (React Native, Node.js, PostgreSQL, Azure) is modern and capable of scaling, the 45-day MVP execution plan has several critical architectural and business risks that need to be addressed before writing any code.

## 1. The Apple In-App Purchase (IAP) Trap
> [!CAUTION]
> **Risk Level: Critical (Launch Blocker)**
> The project plan relies on **Razorpay** for all wallet recharges. According to Apple's App Store Review Guidelines (Guideline 3.1.1), any app selling *digital services* (like online consultations) must use **Apple's In-App Purchase system**, which takes a 15% to 30% cut.
> 
> **The Flaw:** If you submit the iOS app using Razorpay to buy wallet credits for chat/audio, Apple will almost certainly reject it. AstroTalk uses Apple IAP on iOS and Razorpay/other gateways on Android/Web to bypass this.
> **Mitigation:** You must implement Apple IAP for the iOS app or rely heavily on the Android/Web platforms initially.

## 2. Per-Minute Billing Engine Vulnerability
> [!WARNING]
> **Risk Level: High**
> The plan mentions a backend "billing timer" that runs every 60 seconds to debit the user's wallet.
> 
> **The Flaw:** Node.js runs on a single-threaded event loop. Under heavy load, timers (`setTimeout` / `setInterval`) can drift, meaning 60 seconds might become 62 or 65 seconds, losing revenue. Furthermore, if a server node crashes and restarts during an active session, in-memory timers are destroyed. 
> **Mitigation:** Do not rely on in-memory polling for billing. Instead, calculate session cost based on absolute `start_time` and `end_time` events. Use Agora's server-side webhooks (which send absolute duration) to finalize billing, while only doing lightweight "wallet balance checks" in Redis during the session to enforce cutoffs.

## 3. Database Bottleneck: Chat Messages in PostgreSQL
> [!WARNING]
> **Risk Level: High (Scalability)**
> The plan proposes storing all chat messages directly in the primary PostgreSQL database.
> 
> **The Flaw:** Real-time chat generates massive, high-velocity data. Storing millions of chat rows in your primary relational DB will lead to index bloat, slower queries for critical financial transactions, and increased storage costs.
> **Mitigation:** Store chat messages in a NoSQL database (like MongoDB or Azure Cosmos DB) or persist them temporarily in Redis and batch-archive them to Azure Blob Storage / PostgreSQL. Keep your primary PostgreSQL database strictly for users, wallets, and transactions.

## 4. React Native Expo + Agora SDK Complexity
> [!NOTE]
> **Risk Level: Medium**
> The plan uses React Native with the **Expo Managed Workflow**.
> 
> **The Flaw:** Historically, integrating heavy native SDKs like Agora.io (for audio/video calls) into Expo's managed workflow has been challenging. You cannot simply `npm install` them without modifying native iOS/Android code.
> **Mitigation:** You will need to use **Expo Prebuild** or **Custom Dev Clients (EAS Build)** rather than Expo Go. Make sure the frontend team is aware that they will need to handle native builds earlier than usual.

## 5. Overly Aggressive Timeline vs. Scope
> [!IMPORTANT]
> **Risk Level: High**
> Building a User App, a Practitioner App, an Admin Panel, a Landing Page, Real-time Chat, Voice Calling, and a complex Wallet system from scratch in 45 days is extremely optimistic for a small team.
> 
> **The Flaw:** The QA and DevOps tasks are single points of failure. The plan expects one person to set up Azure infra, Docker, CI/CD, load test 10k users, do an OWASP audit, and manage app store submissions in just a few days.
> **Mitigation:** Drastically cut the MVP scope. For example:
> - Delay the Next.js Admin Panel and just use a tool like Retool or Forest Admin for the first 2 months.
> - Launch Android-only first to bypass Apple's strict review process and IAP requirements.
> - Simplify the Landing Page to a basic static site instead of a full Next.js web app.

## 6. Socket.IO + Azure Web PubSub Redundancy
> [!NOTE]
> **Risk Level: Low/Medium**
> The plan mentions using Socket.IO *with* Azure Web PubSub. 
>
> **The Flaw:** Azure Web PubSub natively supports WebSockets and has its own pub/sub mechanics. Wrapping Socket.IO on top of it often adds unnecessary abstraction overhead and debugging complexity.
> **Mitigation:** If you use Socket.IO, just deploy it on Azure App Service with a managed Redis Cache instance (using the `socket.io-redis` adapter). This is the standard, battle-tested way to scale Socket.IO horizontally.
