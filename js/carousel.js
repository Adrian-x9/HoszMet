class LanguageCarousel {
    constructor(worldElement, onLanguageSelectCallback) {
        if (!worldElement) {
            console.error('LanguageCarousel: World element not found.');
            return;
        }
        this.world = worldElement;
        this.onLanguageSelect = onLanguageSelectCallback;
        
        // --- ZAKTUALIZOWANA I POSORTOWANA LISTA KRAJÓW (ZACHÓD -> WSCHÓD) ---
        this.countries = [
            { code: 'us', name: 'USA' },
            { code: 'br', name: 'Brazil' },
            { code: 'es', name: 'Spain' },
            { code: 'fr', name: 'France' },
            { code: 'it', name: 'Italy' },
            { code: 'de', name: 'Germany' },
            { code: 'cz', name: 'Czechia' },
            { code: 'sk', name: 'Slovakia' },
            { code: 'pl', name: 'Poland' },
            { code: 'ua', name: 'Ukraine' },
            { code: 'in', name: 'India' },
            { code: 'cn', name: 'China' },
            { code: 'sg', name: 'Singapore' },
            { code: 'id', name: 'Indonesia' },
            { code: 'jp', name: 'Japan' }
        ];

        this.colors = {
            main: '#E57200',
            defaultBg: 'rgba(209, 213, 219, 0.2)',
            defaultBorder: 'rgba(209, 213, 219, 0.4)'
        };

        this.resizeTimer = null;
        this.init();
    }

    rebuildCarousel() {
        this.world.innerHTML = '';
        const scale = window.innerWidth <= 600 ? 0.7 : 1.0;

        const base = {
            sceneSize: 250, perspective: 1000, itemWidth: 90,
            itemHeight: 50, fontSize: 14, flagSize: 19,
            gap: 7, radius: 220
        };

        const root = document.documentElement;
        root.style.setProperty('--scene-size', `${base.sceneSize * scale}px`);
        root.style.setProperty('--perspective', `${base.perspective * scale}px`);
        root.style.setProperty('--item-width', `${base.itemWidth * scale}px`);
        root.style.setProperty('--item-height', `${base.itemHeight * scale}px`);
        root.style.setProperty('--font-size', `${base.fontSize * scale}px`);
        root.style.setProperty('--flag-size', `${base.flagSize * scale}px`);
        root.style.setProperty('--gap', `${base.gap * scale}px`);

        const totalItems = this.countries.length;
        const radius = base.radius * scale;
        this.hasDragged = false;

        this.countries.forEach((country, index) => {
            const item = document.createElement('div');
            item.className = 'item';

            const flagImg = document.createElement('img');
            flagImg.className = 'flag-icon';
            flagImg.src = `https://hatscripts.github.io/circle-flags/flags/${country.code}.svg`;
            flagImg.alt = '';
            flagImg.draggable = false;

            const codeSpan = document.createElement('span');
            codeSpan.innerText = country.code.toUpperCase();
            
            item.appendChild(flagImg);
            item.appendChild(codeSpan);

            const angle = (360 / totalItems) * index;
            item.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
            item.style.backgroundColor = this.colors.defaultBg;
            item.style.borderColor = this.colors.defaultBorder;

            item.addEventListener('click', () => {
                if (!this.hasDragged && typeof this.onLanguageSelect === 'function') {
                    this.onLanguageSelect(country.code);
                }
            });

            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = this.colors.main;
                item.style.borderColor = this.colors.main;
            });
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = this.colors.defaultBg;
                item.style.borderColor = this.colors.defaultBorder;
            });

            this.world.appendChild(item);
        });
        
        if(!document.getElementById('carousel-styles')) {
            const styleSheet = document.createElement("style");
            styleSheet.id = 'carousel-styles';
            styleSheet.innerText = `
                .scene { width: var(--scene-size); height: var(--scene-size); perspective: var(--perspective); }
                .world { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; cursor: grab; }
                .world.is-dragging { cursor: grabbing; }
                .item { color: #fff; position: absolute; top: calc(50% - (var(--item-height) / 2)); left: calc(50% - (var(--item-width) / 2)); width: var(--item-width); height: var(--item-height); display: flex; justify-content: center; align-items: center; gap: var(--gap); border: 1px solid; border-radius: 6px; font-size: var(--font-size); font-weight: bold; cursor: pointer; transition: transform 0.3s ease, background-color 0.3s ease, border-color 0.3s ease; backface-visibility: hidden; user-select: none; }
                .flag-icon { width: var(--flag-size); height: var(--flag-size); border-radius: 50%; object-fit: cover; flex-shrink: 0; }
            `;
            document.head.appendChild(styleSheet);
        }
    }

    init() {
        this.rebuildCarousel();

        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => this.rebuildCarousel(), 150);
        });
        window.addEventListener('orientationchange', () => {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => this.rebuildCarousel(), 150);
        });

        this.setupInteraction();
    }

    setupInteraction() {
        let currentRotationY = 0, isDragging = false, startX = 0, lastX = 0, velocity = 0, animationFrame = null;
        const friction = 0.95, rotationSensitivity = 0.4;
        
        const updateRotation = () => { this.world.style.transform = `rotateY(${currentRotationY}deg)`; };
        
        const inertiaAnimate = () => {
            currentRotationY += velocity; velocity *= friction; updateRotation();
            if (Math.abs(velocity) > 0.1) {
                animationFrame = requestAnimationFrame(inertiaAnimate);
            } else {
                velocity = 0;
            }
        };

        const onDragStart = (e) => {
            e.preventDefault();
            this.hasDragged = false;
            isDragging = true;
            this.world.classList.add('is-dragging');
            if (animationFrame) cancelAnimationFrame(animationFrame);
            velocity = 0;
            startX = e.clientX || e.touches[0].clientX;
            lastX = startX;
            
            window.addEventListener('mousemove', onDragMove);
            window.addEventListener('mouseup', onDragEnd);
            window.addEventListener('touchmove', onDragMove, { passive: false });
            window.addEventListener('touchend', onDragEnd);
        };

        const onDragMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const currentX = e.clientX || e.touches[0].clientX;
            
            if (Math.abs(currentX - startX) > 5) {
                this.hasDragged = true;
            }
            
            const deltaX = currentX - lastX;
            velocity = deltaX * rotationSensitivity;
            currentRotationY += velocity;
            lastX = currentX;
            updateRotation();
        };

        const onDragEnd = () => {
            isDragging = false;
            this.world.classList.remove('is-dragging');
            
            window.removeEventListener('mousemove', onDragMove);
            window.removeEventListener('mouseup', onDragEnd);
            window.removeEventListener('touchmove', onDragMove);
            window.removeEventListener('touchend', onDragEnd);
            
            if (Math.abs(velocity) > 0.1) inertiaAnimate();
            
            setTimeout(() => { this.hasDragged = false; }, 50);
        };

        this.world.addEventListener('mousedown', onDragStart);
        this.world.addEventListener('touchstart', onDragStart, { passive: true });
    }
}