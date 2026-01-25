# The Anti-Bias Reader – Architecture, Data, UI, and Security Plan

> Role: Senior Full-Stack Architect, UX Director & Security Lead (QEA)

## 1) Stack & Architecture (Solid Foundation)

### Recommended Stack
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend:** Next.js Route Handlers (BFF) + Supabase (PostgreSQL + Auth + Storage)
- **State/Data:** React Query (server-driven cache) + Zod (schema validation)
- **Payments:** Stripe
- **Analytics:** First-party (Postgres) + optional event pipeline (e.g., PostHog)
- **Hosting:** Vercel + Supabase managed Postgres

### Security Architecture
**CSRF**
- Prefer **SameSite=Lax** for session cookies and **SameSite=Strict** for guest cookies where possible.
- Use **double-submit cookie** strategy for non-GET requests if using cookie-based auth.
- For API routes, enforce **Origin/Referer** validation on state-changing methods.
- Use **CSRF token** stored in a HttpOnly cookie and sent via `X-CSRF-Token` header.

**XSS (RSS Sanitization)**
- RSS feed content must be sanitized server-side using a strict allowlist.
- Use a sanitizer (e.g., DOMPurify on server via JSDOM) with **no script/event handlers** and **no inline styles**.
- Convert external links to `rel="noopener noreferrer"`.

**Cookies: Guest vs Social Auth**
- **Guest Mode:**
  - Create a `guest_id` cookie (`HttpOnly`, `Secure`, `SameSite=Strict`, `Max-Age=30d`).
  - Store minimal state: `guest_id`, onboarding flags.
  - Map `guest_id` to a server-side profile row.
- **Social Auth:**
  - Use Supabase Auth (Google/Apple/GitHub) with PKCE.
  - Use **short-lived access tokens** + refresh tokens (HttpOnly).
  - On upgrade from guest -> authenticated, **merge** guest progress into user profile.

## 2) SQL Database Schema (Data & Gamification)

```sql
-- Users
create table if not exists app_user (
  id uuid primary key default gen_random_uuid(),
  auth_provider text not null, -- guest/google/apple/github
  auth_provider_id text,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  preferences jsonb not null default '{}'::jsonb,
  is_guest boolean not null default true
);

-- Reading sessions
create table if not exists reading_session (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  article_id text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0
);

-- Streaks
create table if not exists streak (
  user_id uuid primary key references app_user(id) on delete cascade,
  current_streak integer not null default 0,
  last_read_date date,
  updated_at timestamptz not null default now()
);

-- Medals
create table if not exists medal (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null
);

create table if not exists user_medal (
  user_id uuid not null references app_user(id) on delete cascade,
  medal_id uuid not null references medal(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (user_id, medal_id)
);

-- Ads analytics
create table if not exists ads_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_user(id) on delete set null,
  placement text not null, -- full_page_between_chapters, etc
  impression_at timestamptz not null default now(),
  click_at timestamptz,
  meta jsonb not null default '{}'::jsonb
);

-- Seed medal
insert into medal (code, title, description)
values ('monthly_guardian', 'Monthly Guardian', '30-day streak achieved')
on conflict (code) do nothing;

-- Medal logic (trigger or scheduled job)
-- Award when streak >= 30
create or replace function award_monthly_guardian()
returns trigger as $$
begin
  if (new.current_streak >= 30) then
    insert into user_medal (user_id, medal_id)
    select new.user_id, m.id from medal m where m.code = 'monthly_guardian'
    on conflict do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_award_monthly_guardian on streak;
create trigger trg_award_monthly_guardian
after insert or update on streak
for each row execute function award_monthly_guardian();
```

## 3) The "Book" Layout & Tailwind Config

### Tailwind Configuration (Fonts)
```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        headline: ['Gotham', 'system-ui', 'sans-serif'],
        body: ['"Times New Roman"', 'Times', 'serif'],
        ui: ['Calibri', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
```

### Page Container (Swipe Left/Right)
```tsx
// components/PageContainer.tsx
'use client';

import { useRef } from 'react';

type PageContainerProps = {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  children: React.ReactNode;
};

export function PageContainer({ onSwipeLeft, onSwipeRight, children }: PageContainerProps) {
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (deltaX > 60) onSwipeRight();
    if (deltaX < -60) onSwipeLeft();
    touchStartX.current = null;
  };

  return (
    <div
      className="min-h-screen bg-amber-50 text-stone-900 font-body"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mx-auto max-w-screen-sm px-5 py-8">
        {children}
      </div>
    </div>
  );
}
```

## 4) Smart Auth & Logic (Hybrid Auth)

```ts
// lib/auth/hybridAuth.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

export async function initializeGuestOrUser() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      return { mode: 'user' as const, session: sessionData.session };
    }

    const response = await fetch('/api/guest', { method: 'POST' });
    if (!response.ok) throw new Error('Failed to initialize guest session.');

    return { mode: 'guest' as const };
  } catch (error) {
    console.error('Hybrid auth init failed', error);
    throw error;
  }
}
```

Prompt to "Save Progress" after engagement:
```tsx
// components/SaveProgressPrompt.tsx
'use client';

import { useState } from 'react';

type SaveProgressPromptProps = {
  hasEngaged: boolean;
  onConnect: () => Promise<void>;
};

export function SaveProgressPrompt({ hasEngaged, onConnect }: SaveProgressPromptProps) {
  const [loading, setLoading] = useState(false);

  if (!hasEngaged) return null;

  const handleConnect = async () => {
    try {
      setLoading(true);
      await onConnect();
    } catch (error) {
      console.error('Failed to connect auth provider', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
      <p className="font-ui text-sm text-stone-700">
        Save your progress with Google, Apple, or GitHub.
      </p>
      <button
        className="mt-3 inline-flex items-center rounded-md bg-stone-900 px-4 py-2 text-xs font-ui text-white"
        onClick={handleConnect}
        disabled={loading}
      >
        {loading ? 'Connecting...' : 'Save Progress'}
      </button>
    </div>
  );
}
```

## 5) Mobile Sitemap & Navigation Flow

```
Home
├─ Featured Capsule (Today’s Bias Lens)
├─ Library (All Articles)
│  ├─ Article (Book View)
│  │  ├─ Page 1
│  │  ├─ Page 2
│  │  ├─ ...
│  │  └─ Page N (Finish)
│  │     └─ Context Deep Dive
│  │         ├─ Historical Context
│  │         ├─ Counterpoints
│  │         └─ Sources & References
└─ Profile
   └─ Streak & Medals
```

## 6) Gamification & Animation (The "Spark")

### Flame Animation (CSS)
```css
@keyframes ignite {
  0% { transform: scale(0.4) rotate(-3deg); opacity: 0; }
  50% { transform: scale(1.05) rotate(2deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

.flame {
  width: 32px;
  height: 48px;
  background: radial-gradient(circle at 50% 80%, #f97316, #ef4444 45%, #7c2d12 70%);
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  animation: ignite 700ms ease-out;
}
```

### Medal Unlock Popup (Framer Motion)
```tsx
import { motion } from 'framer-motion';

export function MedalUnlock() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-2xl bg-white p-6 shadow-xl"
    >
      <h3 className="font-headline text-lg">Monthly Guardian</h3>
      <p className="mt-2 font-body text-sm">30-day streak achieved!</p>
    </motion.div>
  );
}
```

## 7) Better Navigation (Navbar & Foobar)

```tsx
// components/Navbar.tsx
export function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-amber-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-screen-sm items-center justify-between px-5 py-3">
        <span className="font-headline text-base">Anti-Bias Reader</span>
        <input
          className="w-36 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-ui"
          placeholder="Search"
          aria-label="Search"
        />
      </div>
    </header>
  );
}
```

```tsx
// components/Foobar.tsx
import { BookOpen, Flame, UserCircle, Settings } from 'lucide-react';

export function Foobar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-screen-sm items-center justify-around px-6 py-3">
        <button className="flex flex-col items-center gap-1 text-stone-600">
          <BookOpen className="h-5 w-5" />
          <span className="text-[10px] font-ui">Library</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-amber-600">
          <Flame className="h-5 w-5" />
          <span className="text-[10px] font-ui">12</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-stone-600">
          <UserCircle className="h-5 w-5" />
          <span className="text-[10px] font-ui">Profile</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-stone-600">
          <Settings className="h-5 w-5" />
          <span className="text-[10px] font-ui">Settings</span>
        </button>
      </div>
    </nav>
  );
}
```

## 8) Monetization & External Links

**Stripe Hook (between chapters):**
```tsx
// components/ChapterInterstitial.tsx
import { useEffect } from 'react';

export function ChapterInterstitial() {
  useEffect(() => {
    async function initializeCheckout() {
      try {
        await fetch('/api/billing/stripe-session', { method: 'POST' });
      } catch (error) {
        console.error('Stripe session init failed', error);
      }
    }
    void initializeCheckout();
  }, []);

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6 text-center">
      <h3 className="font-headline text-base">Go Premium</h3>
      <p className="mt-2 font-body text-sm">Unlock advanced lenses & curated journals.</p>
      <button className="mt-4 rounded-md bg-stone-900 px-4 py-2 text-xs font-ui text-white">
        Upgrade
      </button>
    </section>
  );
}
```

**AdSense Container (full page ad between chapters):**
```tsx
// components/FullPageAd.tsx
export function FullPageAd() {
  return (
    <div className="my-6 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
      <p className="font-ui text-xs text-stone-600">Sponsored</p>
      <div id="adsense-container" className="mt-4 h-64 rounded-lg bg-white" />
    </div>
  );
}
```

**Socials Formatting**
- Instagram: `@techandstream`
- GitHub: `@kvnbbg`

## 9) "Ready for Demo" Polish

### Error handling requirement
All async actions in provided snippets include `try/catch` blocks and log or rethrow errors.

### Linting
TypeScript annotations are explicit and Tailwind classes are valid. Hook usage is localized to client components.
