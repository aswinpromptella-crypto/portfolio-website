(() => {
    'use strict';

    function initializeNavigation() {
        const toggle = document.querySelector('.menu-toggle');
        const navigation = document.getElementById('nav-links');
        if (!toggle || !navigation) return;
        navigation.dataset.enhanced = 'true';

        const setOpen = (open) => {
            navigation.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', String(open));
        };

        setOpen(false);
        toggle.addEventListener('click', () => {
            setOpen(toggle.getAttribute('aria-expanded') !== 'true');
        });

        navigation.addEventListener('click', (event) => {
            if (event.target.closest('a')) setOpen(false);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
                setOpen(false);
                toggle.focus();
            }
        });

        document.addEventListener('pointerdown', (event) => {
            if (!navigation.contains(event.target) && !toggle.contains(event.target)) {
                setOpen(false);
            }
        });

        if (typeof window.matchMedia === 'function') {
            const desktop = window.matchMedia('(min-width: 801px)');
            const closeOnDesktop = (event) => {
                if (event.matches) setOpen(false);
            };
            closeOnDesktop(desktop);
            if (typeof desktop.addEventListener === 'function') {
                desktop.addEventListener('change', closeOnDesktop);
            } else if (typeof desktop.addListener === 'function') {
                desktop.addListener(closeOnDesktop);
            }
        }
    }

    function initializeProjects() {
        const cards = Array.from(document.querySelectorAll('.project-card'));
        const filters = Array.from(document.querySelectorAll('.filter-btn'));
        const loadMore = document.getElementById('load-more');
        const count = document.getElementById('project-count');
        if (!cards.length) {
            if (loadMore) loadMore.hidden = true;
            if (count) count.textContent = 'Showing 0 of 0 projects';
            return;
        }

        const pageSize = 6;
        const supportedFilters = new Set(['all', 'ai-video', 'ai-poster']);
        let activeFilter = 'all';
        let visibleLimit = loadMore ? pageSize : cards.length;

        const update = () => {
            const matching = cards.filter((card) => (
                activeFilter === 'all' || card.dataset.category === activeFilter
            ));
            const visible = new Set(matching.slice(0, visibleLimit));
            cards.forEach((card) => {
                card.hidden = !visible.has(card);
            });
            filters.forEach((button) => {
                button.setAttribute('aria-pressed', String(button.dataset.filter === activeFilter));
            });
            if (loadMore) loadMore.hidden = visible.size >= matching.length;
            if (count) count.textContent = `Showing ${visible.size} of ${matching.length} projects`;
            document.dispatchEvent(new Event('projects:updated'));
        };

        filters.forEach((button) => {
            button.addEventListener('click', () => {
                if (!supportedFilters.has(button.dataset.filter)) return;
                activeFilter = button.dataset.filter;
                visibleLimit = loadMore ? pageSize : cards.length;
                update();
            });
        });

        if (loadMore) {
            loadMore.addEventListener('click', () => {
                const previouslyVisible = new Set(cards.filter((card) => !card.hidden));
                visibleLimit += pageSize;
                update();
                const firstRevealed = cards.find((card) => !card.hidden && !previouslyVisible.has(card));
                if (firstRevealed) {
                    const link = firstRevealed.querySelector('.project-open');
                    if (link) link.focus({ preventScroll: true });
                }
            });
        }

        update();
    }

    function initializeProjectDialog() {
        const dialog = document.getElementById('project-dialog');
        const title = document.getElementById('dialog-title');
        const media = document.getElementById('dialog-media');
        const external = document.getElementById('dialog-external');
        const close = dialog && dialog.querySelector('.dialog-close');
        const supportsDialog = typeof window.HTMLDialogElement !== 'undefined'
            && dialog instanceof window.HTMLDialogElement
            && typeof dialog.showModal === 'function';
        if (!supportsDialog || !title || !media || !external || !close) return;

        let opener = null;
        let backdropPointer = null;

        const clearMedia = () => {
            media.replaceChildren();
            media.removeAttribute('aria-busy');
        };

        const cleanup = () => {
            clearMedia();
            document.body.classList.remove('dialog-open');
            backdropPointer = null;
            const previousOpener = opener;
            opener = null;
            if (previousOpener && previousOpener.isConnected) {
                previousOpener.focus({ preventScroll: true });
            }
        };

        dialog.addEventListener('close', cleanup);
        close.addEventListener('click', () => dialog.close());

        const isOutside = (event) => {
            const bounds = dialog.getBoundingClientRect();
            return event.clientX < bounds.left || event.clientX > bounds.right
                || event.clientY < bounds.top || event.clientY > bounds.bottom;
        };

        dialog.addEventListener('pointerdown', (event) => {
            backdropPointer = event.button === 0 && event.target === dialog && isOutside(event)
                ? event.pointerId : null;
        });
        dialog.addEventListener('pointerup', (event) => {
            const shouldClose = backdropPointer === event.pointerId
                && event.target === dialog && isOutside(event);
            backdropPointer = null;
            if (shouldClose) dialog.close();
        });
        dialog.addEventListener('pointercancel', () => {
            backdropPointer = null;
        });

        document.querySelectorAll('.project-open').forEach((link) => {
            link.addEventListener('click', (event) => {
                // Preserve new-tab, download, and other ordinary link behavior.
                if (event.defaultPrevented || event.button !== 0
                    || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

                const videoId = link.dataset.videoId;
                const imageSource = link.dataset.imageSrc;
                const projectTitle = link.dataset.title || link.textContent.trim() || 'Project preview';
                if ((!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) && !imageSource) return;

                clearMedia();
                title.textContent = projectTitle;
                external.href = link.href;

                if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
                    const frame = document.createElement('iframe');
                    frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0`;
                    frame.title = `${projectTitle} — video preview`;
                    frame.allow = 'autoplay; encrypted-media; picture-in-picture';
                    frame.allowFullscreen = true;
                    frame.referrerPolicy = 'strict-origin-when-cross-origin';
                    media.append(frame);
                } else {
                    const status = document.createElement('p');
                    status.className = 'dialog-message';
                    status.setAttribute('role', 'status');
                    status.textContent = 'Loading image…';
                    const preview = document.createElement('img');
                    preview.className = 'dialog-media-image';
                    preview.alt = projectTitle;
                    preview.decoding = 'async';
                    preview.hidden = true;
                    media.setAttribute('aria-busy', 'true');
                    preview.addEventListener('load', () => {
                        if (!media.contains(preview)) return;
                        preview.hidden = false;
                        status.hidden = true;
                        status.textContent = '';
                        media.removeAttribute('aria-busy');
                    }, { once: true });
                    preview.addEventListener('error', () => {
                        if (!media.contains(preview)) return;
                        preview.hidden = true;
                        status.textContent = 'This image could not be loaded. Use the source link below to view the project.';
                        media.removeAttribute('aria-busy');
                    }, { once: true });
                    media.append(status, preview);
                    preview.src = imageSource;
                }

                opener = link;
                try {
                    dialog.showModal();
                } catch {
                    cleanup();
                    return;
                }
                event.preventDefault();
                document.body.classList.add('dialog-open');
                close.focus({ preventScroll: true });
            });
        });
    }

    function initializeMediaFallbacks() {
        document.querySelectorAll('.media-image').forEach((image) => {
            const markUnavailable = () => {
                const frame = image.closest('.media-frame');
                if (frame) frame.classList.add('media-unavailable');
            };
            image.addEventListener('error', markUnavailable, { once: true });
            if (image.complete && image.naturalWidth === 0 && image.currentSrc) {
                markUnavailable();
            }
        });
    }

    function initializeVideoPreviews() {
        const toggle = document.getElementById('preview-toggle');
        const dialog = document.getElementById('project-dialog');
        if (!toggle || !('IntersectionObserver' in window)) return;

        const previews = Array.from(document.querySelectorAll('.project-open[data-video-id]'))
            .filter((link) => /^[A-Za-z0-9_-]{11}$/.test(link.dataset.videoId))
            .map((link) => ({
                link,
                card: link.closest('.project-card'),
                media: link.querySelector('.project-media'),
                player: null,
                frame: null,
                ready: false,
                failed: false,
                requested: false,
                lastUsed: 0
            })).filter((preview) => preview.card && preview.media);
        if (!previews.length) return;

        // Keep the initial page light and respect visitors who disable automatic motion.
        let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            || Boolean(navigator.connection && navigator.connection.saveData);
        let apiRequested = false;
        let apiReady = Boolean(window.YT && window.YT.Player);
        let useCounter = 0;
        const maxPlayers = 3;
        let selected = new Set();

        const updateToggle = () => {
            toggle.hidden = false;
            toggle.setAttribute('aria-pressed', String(paused));
            toggle.textContent = paused ? 'Play previews' : 'Pause previews';
        };

        const removePlayer = (preview) => {
            const player = preview.player;
            const frame = preview.frame;
            preview.player = null;
            preview.frame = null;
            preview.ready = false;
            preview.requested = false;
            preview.media.classList.remove('is-preview-playing');
            if (player) player.destroy();
            if (frame) frame.remove();
        };

        const applyPlayback = (preview) => {
            if (!preview.ready || !preview.player) return;
            const shouldPlay = selected.has(preview);
            if (preview.requested === shouldPlay) return;
            preview.requested = shouldPlay;
            if (shouldPlay) {
                // Mute before every play, including when resuming after scrolling back.
                preview.player.mute();
                preview.player.playVideo();
                preview.lastUsed = ++useCounter;
            } else {
                preview.player.pauseVideo();
                preview.media.classList.remove('is-preview-playing');
            }
        };

        const createPlayer = (preview) => {
            const frame = document.createElement('iframe');
            const url = new URL('https://www.youtube-nocookie.com/embed/' + preview.link.dataset.videoId);
            url.search = new URLSearchParams({
                enablejsapi: '1', autoplay: '0', mute: '1', playsinline: '1',
                controls: '0', disablekb: '1', loop: '1',
                playlist: preview.link.dataset.videoId, rel: '0'
            }).toString();
            if (location.protocol === 'http:' || location.protocol === 'https:') {
                url.searchParams.set('origin', location.origin);
            }
            frame.src = url.href;
            frame.className = 'inline-video';
            frame.title = (preview.link.dataset.title || 'Brand film') + ' — muted preview';
            frame.allow = 'autoplay; encrypted-media';
            frame.referrerPolicy = 'strict-origin-when-cross-origin';
            frame.tabIndex = -1;
            frame.setAttribute('aria-hidden', 'true');
            preview.frame = frame;
            preview.lastUsed = ++useCounter;
            preview.media.append(frame);
            preview.player = new window.YT.Player(frame, {
                events: {
                    onReady: () => {
                        if (preview.frame !== frame) return;
                        preview.ready = true;
                        preview.player.mute();
                        synchronize();
                    },
                    onStateChange: (event) => {
                        if (preview.frame !== frame) return;
                        const playing = event.data === window.YT.PlayerState.PLAYING;
                        if (playing && !selected.has(preview)) {
                            preview.player.pauseVideo();
                            preview.requested = false;
                        }
                        preview.media.classList.toggle('is-preview-playing', playing && selected.has(preview));
                    },
                    onAutoplayBlocked: () => {
                        if (preview.frame !== frame) return;
                        preview.requested = false;
                        preview.media.classList.remove('is-preview-playing');
                    },
                    onError: () => {
                        if (preview.frame !== frame) return;
                        preview.failed = true;
                        removePlayer(preview);
                        synchronize();
                    }
                }
            });
        };

        const loadApi = () => {
            if (apiRequested) return;
            apiRequested = true;
            const previousReady = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                apiReady = true;
                synchronize();
                if (typeof previousReady === 'function') previousReady();
            };
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.async = true;
            script.addEventListener('error', () => {
                // Static thumbnails and the full preview links stay usable offline.
                toggle.hidden = true;
            }, { once: true });
            document.head.append(script);
        };

        function synchronize() {
            const canPlay = !paused && !document.hidden && !(dialog && dialog.open);
            const candidates = canPlay ? previews.filter((preview) => {
                if (preview.card.hidden || preview.failed) return false;
                const rect = preview.media.getBoundingClientRect();
                const visible = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 90));
                return rect.height > 0 && visible / rect.height >= 0.45;
            }) : [];
            selected = new Set(candidates.slice(0, maxPlayers));
            previews.forEach(applyPlayback);
            if (!selected.size) return;
            if (!apiReady) {
                loadApi();
                return;
            }
            selected.forEach((preview) => {
                if (preview.player) return;
                // Reuse nearby paused players; evict the oldest offscreen one at the cap.
                const loaded = previews.filter((item) => item.player);
                if (loaded.length >= maxPlayers) {
                    const oldest = loaded.filter((item) => !selected.has(item))
                        .sort((a, b) => a.lastUsed - b.lastUsed)[0];
                    if (!oldest) return;
                    removePlayer(oldest);
                }
                createPlayer(preview);
            });
        }

        const observer = new IntersectionObserver(synchronize, {
            rootMargin: '-90px 0px 0px 0px',
            threshold: [0, 0.45, 0.75, 1]
        });
        previews.forEach((preview) => observer.observe(preview.media));
        toggle.addEventListener('click', () => {
            paused = !paused;
            updateToggle();
            synchronize();
        });
        document.addEventListener('visibilitychange', synchronize);
        document.addEventListener('projects:updated', synchronize);
        if (dialog) new MutationObserver(synchronize).observe(dialog, {
            attributes: true, attributeFilter: ['open']
        });
        updateToggle();
    }

    function initialize() {
        initializeNavigation();
        initializeProjects();
        initializeProjectDialog();
        initializeMediaFallbacks();
        initializeVideoPreviews();
        const year = document.getElementById('current-year');
        if (year) year.textContent = String(new Date().getFullYear());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
