import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const AD_INTERVAL = 7;
const MAX_POST_LENGTH = 280;
const STREAK_KEY = 'visio_streak_count';
const STREAK_DATE_KEY = 'visio_streak_date';

const safeLocalStorage = {
    getItem: (key, fallback = null) => {
        try {
            const value = localStorage.getItem(key);
            return value ?? fallback;
        } catch (storageError) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn('Unable to read from local storage', storageError);
            }
            return fallback;
        }
    },
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (storageError) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn('Unable to write to local storage', storageError);
            }
            return false;
        }
    }
};

const getUtcDateKey = (date) => new Date(date).toISOString().split('T')[0];

const sanitizeInput = (value) => value.replace(/<[^>]*>?/gm, '').trim();

const formatTimeAgo = (date, now = new Date(), locale = 'en') => {
    const diffInSeconds = Math.round((new Date(date).getTime() - now.getTime()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const divisions = [
        { amount: 60, unit: 'second' },
        { amount: 60, unit: 'minute' },
        { amount: 24, unit: 'hour' },
        { amount: 7, unit: 'day' },
        { amount: 4.34524, unit: 'week' },
        { amount: 12, unit: 'month' },
        { amount: Number.POSITIVE_INFINITY, unit: 'year' }
    ];

    let duration = diffInSeconds;
    for (let index = 0; index < divisions.length; index += 1) {
        const division = divisions[index];
        if (Math.abs(duration) < division.amount) {
            return rtf.format(duration, division.unit);
        }
        duration = Math.trunc(duration / division.amount);
    }

    return rtf.format(duration, 'year');
};

const parseContent = (content) => {
    const tokenRegex = /([#@][\w-]+)/g;
    return content.split(tokenRegex).filter(Boolean).map((segment) => {
        if (segment.startsWith('#')) {
            return { type: 'hashtag', value: segment };
        }
        if (segment.startsWith('@')) {
            return { type: 'mention', value: segment };
        }
        return { type: 'text', value: segment };
    });
};

const extractHashtags = (content) => {
    const matches = content.match(/#[\w-]+/g);
    return matches ? matches.map((tag) => tag.toLowerCase()) : [];
};

const apiRequest = async (url, method = 'POST', body) => {
    const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Request failed');
    }

    return response.json().catch(() => ({}));
};

const AdContainer = ({ title, body, cta }) => {
    if (!title && !body) {
        return null;
    }

    return (
        <section
            className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-slate-900 shadow-sm"
            aria-label="Sponsored content"
        >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">Sponsored</p>
            <h3 className="mt-2 text-lg font-semibold">{title}</h3>
            {body && <p className="mt-2 text-base text-amber-900/80">{body}</p>}
            {cta && (
                <a
                    className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-amber-500 px-4 text-base font-semibold text-white transition hover:bg-amber-600"
                    href={cta.href}
                >
                    {cta.label}
                </a>
            )}
        </section>
    );
};

const initialPosts = [
        {
            id: 'post-1',
            author: {
                id: 'alex',
                name: 'Alex Rivera',
                handle: '@alex',
                avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=facearea&w=96&h=96&q=80'
            },
            content: 'Launching our #TechAndStream community today. Say hi to @team!',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            likes: 128,
            reshares: 34,
            saves: 12,
            likedByMe: false,
            resharedByMe: false,
            savedByMe: false,
            imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80'
        },
        {
            id: 'post-2',
            author: {
                id: 'maya',
                name: 'Maya Chen',
                handle: '@maya',
                avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=facearea&w=96&h=96&q=80'
            },
            content: 'Daily streak check ✅ Posting with our new #CreatorTools and tagging @techandstream.',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
            likes: 94,
            reshares: 20,
            saves: 8,
            likedByMe: true,
            resharedByMe: false,
            savedByMe: false
        },
        {
            id: 'post-3',
            author: {
                id: 'marco',
                name: 'Marco Diaz',
                handle: '@marco',
                avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&w=96&h=96&q=80'
            },
            content: 'New playlist drop for #TechAndStream creators. DM @support if you want early access.',
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            likes: 56,
            reshares: 9,
            saves: 14,
            likedByMe: false,
            resharedByMe: false,
            savedByMe: true
        }
    ];

const SocialFeed = ({ currentUser }) => {
    const { t, i18n } = useTranslation();
    const safeUser = currentUser || { id: 'guest', name: t('feed_guest_name'), handle: '@guest' };
    const [posts, setPosts] = useState(initialPosts);
    const [sortMode, setSortMode] = useState('trending');
    const [composerText, setComposerText] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [editingPostId, setEditingPostId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [streakCount, setStreakCount] = useState(1);
    const [streakDate, setStreakDate] = useState(getUtcDateKey(new Date()));

    useEffect(() => {
        const storedCount = Number(safeLocalStorage.getItem(STREAK_KEY, 1));
        const storedDate = safeLocalStorage.getItem(STREAK_DATE_KEY, getUtcDateKey(new Date()));
        setStreakCount(Number.isNaN(storedCount) ? 1 : storedCount);
        setStreakDate(storedDate);
    }, []);

    useEffect(() => {
        let isActive = true;
        apiRequest('/api/posts', 'GET')
            .then((payload) => {
                if (!isActive) {
                    return;
                }
                if (payload?.posts?.length) {
                    setPosts(payload.posts);
                }
            })
            .catch(() => {
                if (!isActive) {
                    return;
                }
                setPosts(initialPosts);
            });

        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        safeLocalStorage.setItem(STREAK_KEY, String(streakCount));
        safeLocalStorage.setItem(STREAK_DATE_KEY, streakDate);
    }, [streakCount, streakDate]);

    const updateStreak = useCallback(() => {
        const today = getUtcDateKey(new Date());
        if (streakDate === today) {
            return;
        }
        const yesterday = getUtcDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
        const nextCount = streakDate === yesterday ? streakCount + 1 : 1;
        setStreakCount(nextCount);
        setStreakDate(today);
    }, [streakCount, streakDate]);

    const trendingTags = useMemo(() => {
        const counts = posts.reduce((accumulator, post) => {
            extractHashtags(post.content).forEach((tag) => {
                accumulator[tag] = (accumulator[tag] || 0) + 1;
            });
            return accumulator;
        }, {});
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag, count]) => ({ tag, count }));
    }, [posts]);

    const sortedPosts = useMemo(() => {
        const nextPosts = [...posts];
        if (sortMode === 'newest') {
            return nextPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        return nextPosts.sort((a, b) => (b.likes + b.reshares + b.saves) - (a.likes + a.reshares + a.saves));
    }, [posts, sortMode]);

    const feedItems = useMemo(() => {
        const items = [];
        sortedPosts.forEach((post, index) => {
            items.push({ type: 'post', id: post.id, post });
            if ((index + 1) % AD_INTERVAL === 0) {
                items.push({ type: 'ad', id: `ad-${post.id}` });
            }
        });
        return items;
    }, [sortedPosts]);

    const handleComposerChange = useCallback((event) => {
        setComposerText(event.target.value.slice(0, MAX_POST_LENGTH));
        if (statusMessage) {
            setStatusMessage('');
        }
    }, [statusMessage]);

    const handleEditChange = useCallback((event) => {
        setEditingText(event.target.value.slice(0, MAX_POST_LENGTH));
        if (statusMessage) {
            setStatusMessage('');
        }
    }, [statusMessage]);

    const remainingCharacters = MAX_POST_LENGTH - composerText.length;
    const isComposerDisabled = !sanitizeInput(composerText);

    const handleCreatePost = useCallback(async () => {
        const sanitized = sanitizeInput(composerText);
        if (!sanitized) {
            setStatusMessage(t('feed_compose_error'));
            return;
        }

        const newPost = {
            id: `post-${Date.now()}`,
            author: {
                id: safeUser.id,
                name: safeUser.name,
                handle: safeUser.handle || `@${safeUser.id}`,
                avatarUrl: safeUser.avatarUrl
            },
            content: sanitized,
            createdAt: new Date().toISOString(),
            likes: 0,
            reshares: 0,
            saves: 0,
            likedByMe: false,
            resharedByMe: false,
            savedByMe: false
        };

        setPosts((prev) => [newPost, ...prev]);
        setComposerText('');
        setStatusMessage('');
        updateStreak();

        try {
            await apiRequest('/api/posts', 'POST', newPost);
        } catch (error) {
            setPosts((prev) => prev.filter((post) => post.id !== newPost.id));
            setStatusMessage(t('feed_post_failed'));
        }
    }, [composerText, safeUser, t, updateStreak]);

    const performOptimisticUpdate = useCallback(
        async (postId, updater, endpoint) => {
            let previousPost = null;
            setPosts((prev) =>
                prev.map((post) => {
                    if (post.id !== postId) {
                        return post;
                    }
                    previousPost = post;
                    return updater(post);
                })
            );

            try {
                await apiRequest(endpoint, 'POST', { postId });
            } catch (error) {
                if (previousPost) {
                    setPosts((prev) =>
                        prev.map((post) => (post.id === postId ? previousPost : post))
                    );
                }
                setStatusMessage(t('feed_action_failed'));
            }
        },
        [t]
    );

    const toggleLike = useCallback(
        (postId, isLiked) =>
            performOptimisticUpdate(
                postId,
                (post) => ({
                    ...post,
                    likes: isLiked ? post.likes - 1 : post.likes + 1,
                    likedByMe: !isLiked
                }),
                `/api/posts/${postId}/like`
            ),
        [performOptimisticUpdate]
    );

    const toggleSave = useCallback(
        (postId, isSaved) =>
            performOptimisticUpdate(
                postId,
                (post) => ({
                    ...post,
                    saves: isSaved ? post.saves - 1 : post.saves + 1,
                    savedByMe: !isSaved
                }),
                `/api/posts/${postId}/save`
            ),
        [performOptimisticUpdate]
    );

    const toggleReshare = useCallback(
        (postId, isReshared) =>
            performOptimisticUpdate(
                postId,
                (post) => ({
                    ...post,
                    reshares: isReshared ? post.reshares - 1 : post.reshares + 1,
                    resharedByMe: !isReshared
                }),
                `/api/posts/${postId}/reshare`
            ),
        [performOptimisticUpdate]
    );

    const startEditing = useCallback((post) => {
        if (post.author.id !== safeUser.id) {
            setStatusMessage(t('feed_edit_denied'));
            return;
        }
        setEditingPostId(post.id);
        setEditingText(post.content);
    }, [safeUser.id, t]);

    const cancelEditing = useCallback(() => {
        setEditingPostId(null);
        setEditingText('');
    }, []);

    const saveEdit = useCallback(async () => {
        const sanitized = sanitizeInput(editingText);
        if (!sanitized) {
            setStatusMessage(t('feed_compose_error'));
            return;
        }

        let previousPost = null;
        setPosts((prev) =>
            prev.map((post) => {
                if (post.id !== editingPostId) {
                    return post;
                }
                if (post.author.id !== safeUser.id) {
                    return post;
                }
                previousPost = post;
                return { ...post, content: sanitized };
            })
        );

        setEditingPostId(null);
        setEditingText('');

        try {
            await apiRequest(`/api/posts/${editingPostId}`, 'PUT', { content: sanitized });
        } catch (error) {
            if (previousPost) {
                setPosts((prev) =>
                    prev.map((post) => (post.id === previousPost.id ? previousPost : post))
                );
            }
            setStatusMessage(t('feed_edit_failed'));
        }
    }, [editingPostId, editingText, safeUser.id, t]);

    const deletePost = useCallback(
        async (postId) => {
            let deletedPost = null;
            setPosts((prev) => {
                const target = prev.find((post) => post.id === postId);
                if (!target || target.author.id !== safeUser.id) {
                    setStatusMessage(t('feed_delete_denied'));
                    return prev;
                }
                deletedPost = target;
                return prev.filter((post) => post.id !== postId);
            });

            if (!deletedPost) {
                return;
            }

            try {
                await apiRequest(`/api/posts/${postId}`, 'DELETE');
            } catch (error) {
                setPosts((prev) => [deletedPost, ...prev]);
                setStatusMessage(t('feed_delete_failed'));
            }
        },
        [safeUser.id, t]
    );

    return (
        <section className="grid gap-4 lg:grid-cols-12" aria-label={t('feed_aria_label')}>
            <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm lg:col-span-3">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-200">
                        {safeUser.avatarUrl ? (
                            <img src={safeUser.avatarUrl} alt={safeUser.name} loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-base font-semibold text-slate-700">
                                {safeUser.name?.charAt(0) || 'U'}
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-base font-semibold text-slate-900">{safeUser.name}</p>
                        <p className="text-sm text-slate-500">{safeUser.handle || `@${safeUser.id}`}</p>
                    </div>
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-indigo-900">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">{t('feed_streak_label')}</p>
                    <p className="mt-2 text-2xl font-semibold">{streakCount}</p>
                    <p className="text-base text-indigo-700">{t('feed_streak_helper')}</p>
                </div>
                <div className="space-y-2">
                    <h2 className="text-base font-semibold text-slate-900">{t('feed_sidebar_title')}</h2>
                    <p className="text-base text-slate-600">{t('feed_sidebar_subtitle')}</p>
                    <button type="button" className="min-h-[44px] w-full rounded-full bg-indigo-600 px-4 text-base font-semibold text-white transition hover:bg-indigo-700">
                        {t('feed_follow_cta')}
                    </button>
                </div>
            </aside>

            <section className="space-y-4 lg:col-span-6">
                <article className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm" aria-label={t('feed_compose_label')}>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-200">
                            {safeUser.avatarUrl ? (
                                <img src={safeUser.avatarUrl} alt={safeUser.name} loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-base font-semibold text-slate-700">
                                    {safeUser.name?.charAt(0) || 'U'}
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-base font-semibold text-slate-900">{t('feed_compose_title')}</p>
                            <p className="text-sm text-slate-500">{t('feed_compose_subtitle')}</p>
                        </div>
                    </div>
                    <label htmlFor="composer" className="sr-only">
                        {t('feed_compose_label')}
                    </label>
                    <textarea
                        id="composer"
                        value={composerText}
                        onChange={handleComposerChange}
                        placeholder={t('feed_compose_placeholder')}
                        className="mt-4 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 shadow-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                        maxLength={MAX_POST_LENGTH}
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                        <span>{t('feed_compose_count', { count: remainingCharacters })}</span>
                        <button
                            type="button"
                            onClick={handleCreatePost}
                            disabled={isComposerDisabled}
                            className={`min-h-[44px] rounded-full px-5 text-base font-semibold text-white transition ${
                                isComposerDisabled ? 'cursor-not-allowed bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            {t('feed_compose_cta')}
                        </button>
                    </div>
                    {statusMessage && (
                        <p className="mt-2 text-base text-rose-600" role="alert">
                            {statusMessage}
                        </p>
                    )}
                </article>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 text-base font-semibold text-slate-700 shadow-sm">
                    <span>{t('feed_sort_label')}</span>
                    <div className="flex gap-2">
                        {[
                            { id: 'trending', label: t('feed_sort_trending') },
                            { id: 'newest', label: t('feed_sort_newest') }
                        ].map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setSortMode(option.id)}
                                className={`min-h-[44px] rounded-full px-4 text-base font-semibold transition ${
                                    sortMode === option.id
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                                aria-pressed={sortMode === option.id}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {feedItems.map((item, index) => {
                    if (item.type === 'ad') {
                        const adContent = index === 6
                            ? {
                                title: t('feed_ad_title'),
                                body: t('feed_ad_body'),
                                cta: { label: t('feed_ad_cta'), href: '/ads' }
                            }
                            : null;
                        return (
                            <AdContainer
                                key={item.id}
                                title={adContent?.title}
                                body={adContent?.body}
                                cta={adContent?.cta}
                            />
                        );
                    }

                    const post = item.post;
                    const isOwner = post.author.id === safeUser.id;

                    const locale = i18n.resolvedLanguage || i18n.language || 'en';
                    return (
                        <article
                            key={post.id}
                            className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm"
                            aria-label={`${post.author.name} ${t('feed_posted')}`}
                        >
                            <header className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-200">
                                        {post.author.avatarUrl ? (
                                            <img
                                                src={post.author.avatarUrl}
                                                alt={post.author.name}
                                                loading="lazy"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-base font-semibold text-slate-700">
                                                {post.author.name?.charAt(0) || 'U'}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-base font-semibold text-slate-900">{post.author.name}</p>
                                        <p className="text-sm text-slate-500">{post.author.handle}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span>{formatTimeAgo(post.createdAt, new Date(), locale)}</span>
                                    {isOwner && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => startEditing(post)}
                                                className="min-h-[44px] rounded-full px-3 text-base font-semibold text-indigo-600 hover:bg-indigo-50"
                                            >
                                                {t('feed_edit')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deletePost(post.id)}
                                                className="min-h-[44px] rounded-full px-3 text-base font-semibold text-rose-600 hover:bg-rose-50"
                                            >
                                                {t('feed_delete')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </header>

                            {editingPostId === post.id ? (
                                <div className="mt-4 space-y-3">
                                    <textarea
                                        value={editingText}
                                        onChange={handleEditChange}
                                        className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-base text-slate-700 shadow-sm focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                                        maxLength={MAX_POST_LENGTH}
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={saveEdit}
                                            disabled={!sanitizeInput(editingText)}
                                            className={`min-h-[44px] rounded-full px-4 text-base font-semibold text-white ${
                                                sanitizeInput(editingText)
                                                    ? 'bg-indigo-600 hover:bg-indigo-700'
                                                    : 'cursor-not-allowed bg-indigo-300'
                                            }`}
                                        >
                                            {t('feed_save')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={cancelEditing}
                                            className="min-h-[44px] rounded-full border border-slate-200 px-4 text-base font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                            {t('feed_cancel')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    <p className="text-base text-slate-700">
                                        {parseContent(post.content).map((segment, idx) => {
                                            if (segment.type === 'hashtag') {
                                                return (
                                                    <a
                                                        key={`${segment.value}-${idx}`}
                                                        href={`/tags/${segment.value.slice(1)}`}
                                                        className="font-semibold text-indigo-600 hover:underline"
                                                    >
                                                        {segment.value}
                                                    </a>
                                                );
                                            }
                                            if (segment.type === 'mention') {
                                                return (
                                                    <a
                                                        key={`${segment.value}-${idx}`}
                                                        href={`/user/${segment.value.slice(1)}`}
                                                        className="font-semibold text-slate-900 hover:underline"
                                                    >
                                                        {segment.value}
                                                    </a>
                                                );
                                            }
                                            return <span key={`${segment.value}-${idx}`}>{segment.value}</span>;
                                        })}
                                    </p>
                                    {post.imageUrl && (
                                        <img
                                            src={post.imageUrl}
                                            alt={t('feed_post_media_alt', { name: post.author.name })}
                                            loading="lazy"
                                            className="w-full rounded-2xl object-cover"
                                        />
                                    )}
                                </div>
                            )}

                            <footer className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                                <button
                                    type="button"
                                    onClick={() => toggleLike(post.id, post.likedByMe)}
                                    className={`min-h-[44px] rounded-full px-3 text-base font-semibold ${
                                        post.likedByMe ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700'
                                    }`}
                                    aria-pressed={post.likedByMe}
                                >
                                    {t('feed_like')} · {post.likes}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggleReshare(post.id, post.resharedByMe)}
                                    className={`min-h-[44px] rounded-full px-3 text-base font-semibold ${
                                        post.resharedByMe ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                                    }`}
                                    aria-pressed={post.resharedByMe}
                                >
                                    {t('feed_reshare')} · {post.reshares}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggleSave(post.id, post.savedByMe)}
                                    className={`min-h-[44px] rounded-full px-3 text-base font-semibold ${
                                        post.savedByMe ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'
                                    }`}
                                    aria-pressed={post.savedByMe}
                                >
                                    {t('feed_save_action')} · {post.saves}
                                </button>
                                <span className="text-sm text-slate-400">{t('feed_comment_placeholder')}</span>
                            </footer>
                        </article>
                    );
                })}
            </section>

            <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm lg:col-span-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{t('feed_trends_title')}</h2>
                    <p className="text-base text-slate-600">{t('feed_trends_helper')}</p>
                </div>
                <ul className="space-y-2">
                    {trendingTags.length === 0 && (
                        <li className="rounded-2xl border border-slate-200 p-3 text-base text-slate-500">
                            {t('feed_trends_empty')}
                        </li>
                    )}
                    {trendingTags.map((trend) => (
                        <li key={trend.tag} className="rounded-2xl border border-slate-200 p-3">
                            <p className="text-base font-semibold text-slate-900">{trend.tag}</p>
                            <p className="text-sm text-slate-500">
                                {t('feed_trends_count', { count: trend.count })}
                            </p>
                        </li>
                    ))}
                </ul>
            </aside>
        </section>
    );
};

export default SocialFeed;
