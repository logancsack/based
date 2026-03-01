---
slug: self-host-guide
title: Self-Host Guide
description: Run Based webhook handlers locally with optional request signing.
order: 4
---

# Self-Host Guide

Start a local endpoint:

```bash
based serve --entry examples/webhook.fr --port 3000
```

Optional signature verification:

```bash
based serve --entry examples/webhook.fr --port 3000 --secret supersecret
```

If `--secret` is set, send `x-based-signature` with HMAC SHA-256 over raw payload.

Docker baseline:

```bash
docker build -t based-site .
docker run -p 3000:3000 based-site
```
