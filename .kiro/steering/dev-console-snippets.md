---
inclusion: manual
---

# HealConnect — Dev Console Snippets

Run these in the **browser console** at `http://localhost:3000` while logged in.

---

## 1. Recharge Wallet (update amount as needed)

```js
fetch('/api/wallet/dev-recharge', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + localStorage.getItem('hc_access')
  },
  body: JSON.stringify({ amount: 9000 })
}).then(res => res.json()).then(data => console.log("Success! Wallet balance updated to:", data.data.balance));
```

---

## 2. Clear Stuck Active Sessions

```js
fetch('/api/sessions/dev-clear', {
  method: 'POST'
}).then(res => res.json()).then(data => console.log(data.message));
```

---

## 3. Verify All New Experts (so they show up in the list)

```js
fetch('/api/practitioners/dev/verify', {
  method: 'POST'
}).then(res => res.json()).then(data => console.log(data.message));
```

---

> These endpoints are **dev-only** and must be removed before production deployment.
