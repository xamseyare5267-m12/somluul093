# SomLuul Live production
Production Live uses a real SFU through LiveKit; a database row is never treated as a video stream.
Set LIVE_PROVIDER=livekit, LIVEKIT_URL=wss://..., LIVEKIT_API_URL=https://..., LIVEKIT_API_KEY and LIVEKIT_API_SECRET.
The browser uses the LiveKit client to publish/subscribe. The API creates rooms and short-lived participant tokens.
Recording/VOD, adaptive transcoding and CDN retention are provider-side capabilities and must be enabled in the chosen LiveKit deployment.
