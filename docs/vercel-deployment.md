# Vercel Deployment Guide

## Overview

This app can be deployed on Vercel using the existing `vercel.json` configuration. The backend is an Express server (`server.js`) and the front-end is served from the `public` directory.

## Required Environment Variables

Configure these in the Vercel project settings:

- `SESSION_SECRET`
- `ZEGOCLOUD_APP_ID`
- `ZEGOCLOUD_SERVER_SECRET`
- `FRANCETRAVAIL_CLIENT_ID`
- `FRANCETRAVAIL_CLIENT_SECRET`
- `FRANCETRAVAIL_REDIRECT_URI`
- `REDIS_URL` (optional)
- `SENTRY_DSN` (optional)
- `DATABASE_URL` (optional; enables SQL auth fallback)

## SQL Auth Fallback

If `DATABASE_URL` is provided, the server will create the `app_users` table automatically and use it for email/password registration and login.
If `DATABASE_URL` is not provided, the server falls back to an in-memory store (not suitable for production).

## Deploy Steps

1. Install the Vercel CLI or connect the GitHub repo in Vercel.
2. Set environment variables above.
3. Deploy.

## Notes

- Ensure `FRANCETRAVAIL_REDIRECT_URI` matches the deployed URL: `https://<your-app>.vercel.app/auth/francetravail/callback`.
- Sessions use secure cookies in production; make sure HTTPS is enabled.
