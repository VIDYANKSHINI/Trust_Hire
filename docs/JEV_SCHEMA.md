# JEV_SCHEMA.md — TypeSafe Jev Decision Model Schema

## Overview
Jev answers bounded yes/no ("noul") statements and returns a calibrated probability (0.0 to 1.0) that the statement is true.

## Endpoints
- **TypeSafe Direct / AI/ML API:** `POST https://api.aimlapi.com/v1/decisions` (model `typesafe/jev`)
- **NanoGPT:** `POST https://nano-gpt.com/api/v1/decisions` (model `typesafe/jev-1.13`)
- **OpenRouter:** Decisions API

## Request Shape
```json
{
  "model": "typesafe/jev",
  "state": "<data>Brief and deliverable content...</data>",
  "questions": [
    {
      "id": "criteria",
      "type": "noul",
      "instructions": "The deliverable satisfies every acceptance criterion listed in the brief."
    },
    {
      "id": "substantive",
      "type": "noul",
      "instructions": "The deliverable is real, substantive work for the described job, not placeholder, empty, or off-topic content."
    }
  ]
}
```

## Response Shape
```json
{
  "answers": {
    "criteria": 0.94,
    "substantive": 0.98
  }
}
```
