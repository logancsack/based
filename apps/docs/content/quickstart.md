---
slug: quickstart
title: Quickstart
description: Install Based and run your first script in under 2 minutes.
order: 1
---

# Quickstart

Install the CLI:

```bash
npm install -g based-lang
```

Check and run a script:

```bash
based check examples/hello.fr
based run examples/hello.fr --payload '{"ok":true}'
```

Start a local webhook endpoint:

```bash
based serve --entry examples/webhook.fr --port 3000
```
