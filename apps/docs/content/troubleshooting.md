---
slug: troubleshooting
title: Troubleshooting
description: Common runtime and syntax errors with direct fixes.
order: 6
---

# Troubleshooting

## Mixed indentation style at the same depth

Cause: a block mixes tabs and spaces.
Fix: use one style per depth level.

## Cannot reassign highkey

Cause: attempting to mutate a constant.
Fix: declare mutable values with `lowkey`.

## No module provider configured for yoink

Cause: running parser/evaluator directly without runtime module loader.
Fix: run through CLI or server-kit execution path.

## network call blocked

Cause: allowlist is enabled and target host is not included.
Fix: pass allowed hosts in runtime config.
