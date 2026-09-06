# SomLuul Media Moderation Worker

Production worker for `REQUIRE_MEDIA_MODERATION=1`.

It receives a signed request from SomLuul, downloads the private object from Supabase Storage using server credentials, checks images with Gemini, and samples video frames every ~5 seconds (up to 12 frames) through FFmpeg + Gemini.

Required environment variables:
- `MEDIA_MODERATION_WEBHOOK_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET`
- `GEMINI_API_KEY`

Deploy the container to Cloud Run, Railway, Render, Fly.io, or another private HTTPS service. Put its HTTPS `/moderate` URL into SomLuul's `MEDIA_MODERATION_WEBHOOK_URL` and use the same token in `MEDIA_MODERATION_WEBHOOK_TOKEN`.

The worker intentionally fails closed: a provider error returns `approved:false`.
