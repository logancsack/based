---
slug: cookbook
title: Cookbook
description: Practical recipes for webhook transforms and social notifications.
order: 5
---

# Cookbook

## Webhook Transform

```fr
cook main(payload)
  secure { ok: bet, normalized: payload }
```

## Discord Notification

```fr
yoink discord outta stdlib

cook main(payload)
  discord.send("deploy " + payload.service + " is " + payload.status)
  secure { sent: bet }
```

## API Bridge

```fr
yoink network outta stdlib

cook main(payload)
  lowkey upstream is network.get(payload.url)
  secure { status: upstream.status, body: upstream.body }
```
