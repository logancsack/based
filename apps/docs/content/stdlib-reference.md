---
slug: stdlib-reference
title: Stdlib Reference
description: Built-in modules for networking, messaging, and secret access.
order: 3
---

# Stdlib Reference

The default stdlib modules are:

- `network`
- `vault`
- `discord`
- `slack`

Example:

```fr
yoink network, vault outta stdlib

cook main(payload)
  lowkey token is vault.get("API_TOKEN")
  lowkey res is network.get("https://api.example.com")
  secure { token: token, status: res.status, body: res.body }
```

Notes:

- `network.get` and `network.post` return `{ status, headers, body, ok }`.
- `body` is auto-parsed as JSON when possible, otherwise plain text.
- `vault.get` reads environment variables in local runtime mode.
