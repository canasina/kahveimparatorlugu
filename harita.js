// Harita Pan/Zoom ve Hotspot Yönetimi

(function() {
    'use strict';

    // DOM Elements
    const mapContainer = document.getElementById('mapContainer');
    const mapInner = document.getElementById('mapInner');
    const mapImage = document.getElementById('mapImage');
    const regionContent = document.getElementById('regionContent');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const resetViewBtn = document.getElementById('resetViewBtn');
    const hotspots = document.querySelectorAll('.map-hotspot');

    // State
    let scale = 1; // Başlangıçta tam boyut (ekranı kaplasın)
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let isDraggingHotspot = false;
    let draggedHotspot = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartTranslateX = 0;
    let dragStartTranslateY = 0;
    let currentRegion = null;
    let isEditorMode = false;

    // Constants
    const MIN_SCALE = 0.3; // Minimum zoom (siyah boşluk görünmesin diye düşük)
    const MAX_SCALE = 5; // Maximum zoom
    const ZOOM_STEP = 0.2;
    const WHEEL_ZOOM_SENSITIVITY = 0.001;

    // Region Data
    const regionData = {
        'kopuk-tepeleri': {
            title: 'Köpük Tepeleri',
            description: 'Tatlı Demler bölgesinin kalbi. Beyaz köpük tepeleri arasından ince kahverengi akıntılar süzülür. Bu bölge, yumuşak ve tatlı kahve çeşitlerinin doğduğu yerdir.',
            features: [
                'Beyaz köpük tepeleri',
                'İnce kahverengi akıntılar',
                'Tatlı demleme teknikleri',
                'Sakin ve huzurlu atmosfer'
            ]
        },
        'cam-bardak-sehri': {
            title: 'Cam Bardak Şehri',
            description: 'Dengeli Karışımlar bölgesinin merkezi. Camdan yapılmış yüksek kuleler, akan kahve nehirleriyle çevrilidir. Bu şehir, mükemmel dengeyi arayan kahve ustalarının evidir.',
            features: [
                'Cam kuleler',
                'Akan kahve nehirleri',
                'Dengeli karışım teknikleri',
                'Modern mimari'
            ]
        },
        'aci-selaleler': {
            title: 'Acı Şelaleler',
            description: 'Acı Kavrumlar bölgesinin sert toprakları. Koyu kayalık uçurumlar, espresso-lav şelaleleriyle kesilir. Bu bölge, güçlü ve yoğun kahvelerin kaynağıdır.',
            features: [
                'Koyu kayalık uçurumlar',
                'Espresso-lav şelaleleri',
                'Güçlü kavrum teknikleri',
                'Dramatik manzara'
            ]
        },
        'cayli-tepecikler': {
            title: 'Çaylı Tepecikler',
            description: 'Demli Yapraklar bölgesinin yeşil toprakları. Hobbit tarzı küçük evler, çay tarlalarıyla çevrilidir. Bu bölge, çay ve kahvenin buluştuğu huzurlu bir köşedir.',
            features: [
                'Yeşil tepecikler',
                'Hobbit tarzı evler',
                'Çay tarlaları',
                'Huzurlu atmosfer'
            ]
        },
        'ince-kule': {
            title: 'İnce Kule',
            description: 'Demleme Âlemi\'nin merkezi. Çok ince ama çok yüksek bir kule, tüm bölgeleri birbirine bağlar. Bu kule, kahve evreninin kalbidir ve tüm bölgelerden güç alır.',
            features: [
                'Merkezi konum',
                'Tüm bölgeleri bağlar',
                'Yüksek ve ince yapı',
                'Evrenin kalbi'
            ]
        }
    };

    // Initialize
    function init() {
        setupEventListeners();
        // Harita görseli yüklendiğinde scale'i ayarla
        if (mapImage.complete) {
            adjustInitialScale();
        } else {
            mapImage.addEventListener('load', adjustInitialScale);
        }
        updateTransform();
        loadHotspotPositions();
        checkEditorAccess();
    }

    // Başlangıç scale'ini ayarla - ekranı tam kaplasın
    function adjustInitialScale() {
        const container = mapContainer;
        const img = mapImage;
        
        if (!img.naturalWidth || !img.naturalHeight) {
            // Görsel henüz yüklenmediyse tekrar dene
            setTimeout(adjustInitialScale, 100);
            return;
        }
        
        // Container'ın her iki boyutunu da kaplayacak scale hesapla
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const scaleX = containerWidth / img.naturalWidth;
        const scaleY = containerHeight / img.naturalHeight;
        
        // Daha büyük olanı kullan ki ekran tam kaplansın (siyah boşluk olmasın)
        // %10 fazla zoom ekle ki kenarlarda hiç boşluk kalmasın
        scale = Math.max(scaleX, scaleY) * 1.15;
        
        // Minimum scale'i de güncelle (siyah boşluk görünmesin)
        const minScaleForCover = Math.max(scaleX, scaleY);
        
        updateTransform();
    }

    // Editör erişim kontrolü
    function checkEditorAccess() {
        const urlParams = new URLSearchParams(window.location.search);
        const editorPassword = urlParams.get('editor');
        
        if (editorPassword === 'kahve123') {
            toggleEditorMode();
            // Editör butonu ekle
            addEditorButton();
        }
    }

    // Editör butonu ekle
    function addEditorButton() {
        // Eğer buton zaten varsa kaldır
        const existingBtn = document.getElementById('editor-toggle-btn');
        if (existingBtn) {
            existingBtn.remove();
        }

        const editorBtn = document.createElement('button');
        editorBtn.id = 'editor-toggle-btn';
        editorBtn.className = 'editor-toggle-btn';
        editorBtn.textContent = isEditorMode ? '✕ Editörü Kapat' : '✎ Editör Modu';
        
        // Event listener'ı doğru şekilde bağla
        editorBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleEditorMode();
            // Buton metnini güncelle
            editorBtn.textContent = isEditorMode ? '✕ Editörü Kapat' : '✎ Editör Modu';
        });
        
        const header = document.querySelector('.map-header');
        if (header) {
            header.appendChild(editorBtn);
        }
    }

    // Hotspot konumlarını localStorage'dan yükle veya varsayılan değerleri kullan
    function loadHotspotPositions() {
        const saved = localStorage.getItem('mapHotspotPositions');
        let positions;
        
        if (saved) {
            try {
                positions = JSON.parse(saved);
            } catch (e) {
                positions = getDefaultPositions();
            }
        } else {
            positions = getDefaultPositions();
        }

        hotspots.forEach(hotspot => {
            const region = hotspot.dataset.region;
            if (positions[region]) {
                hotspot.style.top = positions[region].top;
                hotspot.style.left = positions[region].left;
            }
        });
    }

    // Varsayılan hotspot konumları
    function getDefaultPositions() {
        return {
            'kopuk-tepeleri': { top: '15%', left: '20%' },
            'cam-bardak-sehri': { top: '15%', left: '80%' },
            'aci-selaleler': { top: '75%', left: '20%' },
            'cayli-tepecikler': { top: '75%', left: '80%' },
            'ince-kule': { top: '45%', left: '50%' }
        };
    }

    // Hotspot konumlarını localStorage'a kaydet
    function saveHotspotPositions() {
        const positions = {};
        hotspots.forEach(hotspot => {
            const region = hotspot.dataset.region;
            positions[region] = {
                top: hotspot.style.top || '50%',
                left: hotspot.style.left || '50%'
            };
        });
        localStorage.setItem('mapHotspotPositions', JSON.stringify(positions));
    }

    // Editör modunu aç/kapat
    function toggleEditorMode() {
        isEditorMode = !isEditorMode;
        
        if (isEditorMode) {
            // Editör modu açık
            hotspots.forEach(hotspot => {
                hotspot.classList.add('editor-mode');
                hotspot.style.cursor = 'move';
            });
            document.body.classList.add('editor-active');
            showEditorNotification('Editör Modu Aktif - Hotspot\'ları sürükleyerek konumlarını ayarlayın');
        } else {
            // Editör modu kapalı
            hotspots.forEach(hotspot => {
                hotspot.classList.remove('editor-mode');
                hotspot.style.cursor = 'pointer';
            });
            document.body.classList.remove('editor-active');
            saveHotspotPositions();
            showEditorNotification('Değişiklikler kaydedildi');
        }
        
        // Buton metnini güncelle
        const editorBtn = document.getElementById('editor-toggle-btn');
        if (editorBtn) {
            editorBtn.textContent = isEditorMode ? '✕ Editörü Kapat' : '✎ Editör Modu';
        }
    }

    // Editör bildirimi göster
    function showEditorNotification(message) {
        let notification = document.getElementById('editor-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'editor-notification';
            notification.className = 'editor-notification';
            document.body.appendChild(notification);
        }
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Update transform
    function updateTransform() {
        mapInner.style.transform = `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(${scale})`;
    }

    // Zoom functions
    function zoomIn() {
        scale = Math.min(scale + ZOOM_STEP, MAX_SCALE);
        updateTransform();
    }

    function zoomOut() {
        scale = Math.max(scale - ZOOM_STEP, MIN_SCALE);
        updateTransform();
    }

    function resetView() {
        scale = 1; // Sıfırlarken tam boyut
        translateX = 0;
        translateY = 0;
        updateTransform();
        clearRegionSelection();
    }

    // Pan/Drag functions
    function startDrag(e) {
        // Editör modunda hotspot sürükleme
        const hotspot = e.target.closest('.map-hotspot');
        if (isEditorMode && hotspot) {
            isDraggingHotspot = true;
            draggedHotspot = hotspot;
            dragStartX = e.clientX || e.touches[0].clientX;
            dragStartY = e.clientY || e.touches[0].clientY;
            const rect = mapContainer.getBoundingClientRect();
            const hotspotRect = hotspot.getBoundingClientRect();
            dragStartTranslateX = hotspotRect.left - rect.left;
            dragStartTranslateY = hotspotRect.top - rect.top;
            hotspot.style.cursor = 'grabbing';
            return;
        }

        // Normal modda hotspot'a tıklanırsa sürükleme başlamasın
        if (hotspot && !isEditorMode) {
            return;
        }

        isDragging = true;
        dragStartX = e.clientX || e.touches[0].clientX;
        dragStartY = e.clientY || e.touches[0].clientY;
        dragStartTranslateX = translateX;
        dragStartTranslateY = translateY;

        mapContainer.classList.add('is-dragging');
        mapInner.classList.add('is-dragging');
    }

    function drag(e) {
        // Hotspot sürükleme (editör modu)
        if (isDraggingHotspot && draggedHotspot) {
            const currentX = e.clientX || e.touches[0].clientX;
            const currentY = e.clientY || e.touches[0].clientY;
            const rect = mapContainer.getBoundingClientRect();
            
            const newX = currentX - rect.left;
            const newY = currentY - rect.top;
            
            // Yüzde olarak hesapla
            const percentX = (newX / rect.width) * 100;
            const percentY = (newY / rect.height) * 100;
            
            draggedHotspot.style.left = percentX + '%';
            draggedHotspot.style.top = percentY + '%';
            return;
        }

        if (!isDragging) return;

        const currentX = e.clientX || e.touches[0].clientX;
        const currentY = e.clientY || e.touches[0].clientY;

        translateX = dragStartTranslateX + (currentX - dragStartX);
        translateY = dragStartTranslateY + (currentY - dragStartY);

        updateTransform();
    }

    function endDrag() {
        if (isDraggingHotspot && draggedHotspot) {
            // Hotspot konumunu kaydet
            saveHotspotPositions();
            isDraggingHotspot = false;
            if (draggedHotspot) {
                draggedHotspot.style.cursor = 'move';
            }
            draggedHotspot = null;
        }
        
        if (isDragging) {
            isDragging = false;
            mapContainer.classList.remove('is-dragging');
            mapInner.classList.remove('is-dragging');
        }
    }

    // Wheel zoom
    function handleWheel(e) {
        e.preventDefault();

        const delta = e.deltaY * WHEEL_ZOOM_SENSITIVITY;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale - delta));

        if (newScale !== scale) {
            // Zoom towards mouse position
            const rect = mapContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const containerCenterX = rect.width / 2;
            const containerCenterY = rect.height / 2;

            const offsetX = mouseX - containerCenterX;
            const offsetY = mouseY - containerCenterY;

            const scaleChange = newScale / scale;
            translateX += offsetX * (1 - scaleChange);
            translateY += offsetY * (1 - scaleChange);

            scale = newScale;
            updateTransform();
        }
    }

    // Region selection
    function selectRegion(regionId) {
        // Remove active class from all hotspots
        hotspots.forEach(h => h.classList.remove('active'));

        // Add active class to clicked hotspot
        const hotspot = document.querySelector(`[data-region="${regionId}"]`);
        if (hotspot) {
            hotspot.classList.add('active');
        }

        // Update info panel
        const region = regionData[regionId];
        if (region) {
            currentRegion = regionId;
            regionContent.innerHTML = `
                <div class="region-detail">
                    <h3>${region.title}</h3>
                    <p>${region.description}</p>
                    <ul>
                        ${region.features.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    }

    function clearRegionSelection() {
        hotspots.forEach(h => h.classList.remove('active'));
        currentRegion = null;
        regionContent.innerHTML = '<p class="info-placeholder">Haritada bir bölgeye tıklayarak detayları görüntüleyin.</p>';
    }

    // Event listeners
    function setupEventListeners() {
        // Zoom buttons
        zoomInBtn.addEventListener('click', zoomIn);
        zoomOutBtn.addEventListener('click', zoomOut);
        resetViewBtn.addEventListener('click', resetView);

        // Pan/Drag
        mapContainer.addEventListener('mousedown', startDrag);
        mapContainer.addEventListener('mousemove', drag);
        mapContainer.addEventListener('mouseup', endDrag);
        mapContainer.addEventListener('mouseleave', endDrag);

        // Touch events
        mapContainer.addEventListener('touchstart', startDrag, { passive: false });
        mapContainer.addEventListener('touchmove', drag, { passive: false });
        mapContainer.addEventListener('touchend', endDrag);

        // Wheel zoom
        mapContainer.addEventListener('wheel', handleWheel, { passive: false });

        // Hotspot clicks
        hotspots.forEach(hotspot => {
            hotspot.addEventListener('click', (e) => {
                e.stopPropagation();
                const regionId = hotspot.dataset.region;
                selectRegion(regionId);
            });
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

