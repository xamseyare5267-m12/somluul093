# Phase 8 — Ranking & Growth

## Algorithm (v1)
```
score = recency(half-life) * 4
      + engagement(log reactions/comments/shares) * 3
      + following_boost (1.8)
      + media_boost
      + pin/sponsored boost
```

- Feed half-life ~18h
- Reels half-life ~8h (faster churn)
- Following graph from `follows` table

## Endpoints
| Route | Behavior |
|-------|----------|
| `GET /api/scale/feed` | Ranked pool (default). `?ranked=0` chronological |
| `GET /api/scale/reels` | Ranked videos |
| `GET /api/scale/recommend/:postId` | Related by author + score |
| `GET /api/posts` (cutover) | Ranked on page 1 when SCALE_MODE=1 |

## Response extras
Ranked posts may include `_score`, `_reasons`, `reaction_count`, `comment_count`.

## Not yet (later phases)
- Watch-time / completion rate for reels
- Collaborative filtering
- Full ads auction
- ML model serving
