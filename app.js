$(document).ready(function() {
    
    var book = $("#flipbook");
    var libraryView = $("#library-view");
    var readerView = $("#reader-view");
    var bookStage = $("#book-stage");
    var toolbar = $(".book-toolbar");
    var currentZoom = 1;
    var minZoom = 0.5;
    var maxZoom = 2;
    var zoomStep = 0.25;
    var totalPages = 12;
    const STORAGE_KEY = 'bookContent';
    const MAX_PAGES = 50; // Maksimum sayfa sayısı (sayfa1.json - sayfa50.json) - İhtiyaca göre artırılabilir

    // Video klasör yolları
    const LIBRARY_VIDEOS_FOLDER = 'kütüphane/';

    // Kütüphane için video dosyaları listesi
    const libraryVideoFiles = [
        'Magical_Coffee_Library_Animation.mp4',
        'Generating_Burnt_Grounds_Cinematic_Shot.mp4',
        'Fantasy_Coffee_World_Animation.mp4'
    ];

    // Okuyucu arka plan görselleri (rastgele seçilecek) - Fantastik evrenlerden büyülü görseller
    // Hem Unsplash linkleri hem de okuyucu klasöründeki yerel fotoğraflar
    const READER_IMAGES_FOLDER = 'okuyucu/';
    const readerBackgroundImages = [
        // Unsplash linkleri
        'https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=2544&auto=format&fit=crop', // Mağara meşale (orijinal)
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2071&auto=format&fit=crop', // Mistik orman yolu
        'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop', // Büyülü orman
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2070&auto=format&fit=crop', // Epik fantastik manzara
        'https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?auto=format&fit=crop&w=2070&q=80',
        'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=2070&q=80',
        // Yerel fotoğraflar (okuyucu klasöründen)
        READER_IMAGES_FOLDER + 'christoph-nolte-k4ykrW0HJJA-unsplash.jpg',
        READER_IMAGES_FOLDER + 'intricate-explorer-hlj6xJG30FE-unsplash.jpg',
        READER_IMAGES_FOLDER + 'jonatan-pie-IK07OmXSnmU-unsplash.jpg',
        READER_IMAGES_FOLDER + 'jonatan-pie-iokiwAq05UU-unsplash.jpg',
        READER_IMAGES_FOLDER + 'jonny-gios-2vVhfhbj5-s-unsplash.jpg',
        READER_IMAGES_FOLDER + 'michael-pointner-nzag76y-GjE-unsplash.jpg'
    ];

    // Rastgele okuyucu arka plan görseli seç ve yükle
    function loadRandomReaderBackground() {
        const randomIndex = Math.floor(Math.random() * readerBackgroundImages.length);
        const selectedImage = readerBackgroundImages[randomIndex];
        const bgImageElement = document.getElementById('reader-bg-image');
        
        if (bgImageElement) {
            bgImageElement.src = selectedImage;
            console.log('Okuyucu arka plan görseli yüklendi:', selectedImage);
        }
    }

    // Kütüphane için rastgele video seç ve yükle
    function loadRandomLibraryVideo() {
        const randomIndex = Math.floor(Math.random() * libraryVideoFiles.length);
        const selectedVideo = libraryVideoFiles[randomIndex];
        const videoElement = document.getElementById('library-video');
        
        if (videoElement) {
            videoElement.src = LIBRARY_VIDEOS_FOLDER + selectedVideo;
            videoElement.load();
            console.log('Kütüphane videosu yüklendi:', LIBRARY_VIDEOS_FOLDER + selectedVideo);
        }
    }

    // Sayfa yüklendiğinde kütüphane videosunu seç
    loadRandomLibraryVideo();

    // sayfa*.json dosyalarını yükle
    function loadPagesFromStorage() {
        const loadedPages = [];
        const promises = [];
        let completedCount = 0;

        // sayfa1.json'dan sayfa100.json'a kadar kontrol et
        for (let i = 1; i <= MAX_PAGES; i++) {
            const fileName = `jsonlar/sayfa${i}.json`;
            
            const promise = new Promise(function(resolve) {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', fileName, true);
                
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200 || xhr.status === 0) { // 0 = file:// protocol
                            try {
                                const pageData = JSON.parse(xhr.responseText);
                                // Sayfa numarası ve içerik veya resim olmalı
                                if (pageData.pageNumber && (pageData.content || pageData.imageUrl)) {
                                    loadedPages.push(pageData);
                                    console.log(`Sayfa ${pageData.pageNumber} yüklendi: ${fileName}`);
                                }
                            } catch (e) {
                                console.error(`JSON parse hatası (${fileName}):`, e);
                            }
                        }
                        completedCount++;
                        resolve();
                    }
                };
                
                xhr.onerror = function() {
                    completedCount++;
                    resolve();
                };
                
                xhr.send();
            });
            
            promises.push(promise);
        }

        // Tüm istekler tamamlandığında
        Promise.all(promises).then(function() {
            if (loadedPages.length > 0) {
                // Sayfaları numaraya göre sırala
                loadedPages.sort((a, b) => a.pageNumber - b.pageNumber);
                console.log(`${loadedPages.length} sayfa bulundu ve yükleniyor...`);
                processPageData(loadedPages);
            } else {
                console.log('Hiç sayfa JSON dosyası bulunamadı. Lütfen sayfa*.json dosyalarını jsonlar klasörüne ekleyin.');
                initializeTurnJS();
            }
        });
    }

    // Sayfa verilerini işle ve ekle
    function processPageData(pages) {
        if (!pages || pages.length === 0) {
            initializeTurnJS();
            return;
        }

        // İç kapaktan sonra ve iç arka kapaktan önce sayfaları ekle
        const $innerCover = book.find('.hard').eq(1); // İç kapak (2. hard)
        const $innerBackCover = book.find('.hard').eq(-2); // İç arka kapak (sondan 2. hard)

        // Mevcut soft sayfaları temizle (varsa)
        book.find('.soft').remove();

        // Sayfaları ekle
        pages.forEach(function(page) {
            const pageHTML = createPageHTML(page);
            $innerBackCover.before(pageHTML);
        });

        // Toplam sayfa sayısını güncelle (kapaklar + içerik sayfaları)
        totalPages = 4 + pages.length; // 2 ön kapak + 2 arka kapak + içerik sayfaları

        console.log(`${pages.length} sayfa yüklendi.`);
        
        // Turn.js'i başlat
        initializeTurnJS();
    }

    // Sayfa HTML'i oluştur
    function createPageHTML(page) {
        let contentHTML = '';
        
        // Sayfa ayarlarını al (varsa, yoksa varsayılan değerler)
        const settings = page.pageSettings || {
            fontSize: 0.8,
            lineHeight: 1.4,
            chapterSize: 1.1   ,
            paddingSize: 40
        };
        
        // Bölüm başlığı varsa ekle
        if (page.chapterTitle && page.chapterTitle.trim()) {
            // Bölüm başlığını parse et (örn: "BÖLÜM I - Demleme Âlemi")
            const chapterParts = page.chapterTitle.split(' - ');
            let chapterNum = '';
            let chapterName = '';
            
            if (chapterParts.length > 1) {
                chapterNum = chapterParts[0].trim();
                chapterName = chapterParts.slice(1).join(' - ').trim();
            } else {
                chapterName = page.chapterTitle.trim();
            }
            
            if (chapterNum) {
                contentHTML += `<div class="chapter-head"><span class="chapter-num">${chapterNum}</span>`;
                if (chapterName) {
                    contentHTML += `<span class="chapter-name" style="font-size: ${settings.chapterSize}rem; font-weight: bold;">${chapterName}</span>`;
                }
                contentHTML += `</div>`;
            } else if (chapterName) {
                contentHTML += `<div class="chapter-head"><span class="chapter-name" style="font-size: ${settings.chapterSize}rem; font-weight: bold;">${chapterName}</span></div>`;
            }
        }

        // Resim (tam sayfa olarak göster)
        if (page.imageUrl && page.imageUrl.trim()) {
            // Base64 data URL'leri doğrudan kullanabiliriz, escape gerekmez
            const imageUrl = page.imageUrl.trim();
            contentHTML += `<div class="page-image-full"><img src="${imageUrl}" alt="Sayfa resmi" class="full-page-image" onerror="this.style.display='none'; console.error('Resim yüklenemedi');"></div>`;
        }

        // İçerik
        if (page.content && page.content.trim()) {
            // İçeriği text-body div'ine sar
            contentHTML += `<div class="text-body">${page.content}</div>`;
        }

        // Sayfa numarası
        contentHTML += `<span class="page-footer">${page.pageNumber}</span>`;

        // Başlık var mı kontrol et (büyük harf efekti için)
        const hasChapterTitle = page.chapterTitle && page.chapterTitle.trim();
        const textPageClass = hasChapterTitle ? 'text-page has-chapter' : 'text-page';

        // Sayfa ayarlarını style olarak uygula
        const pageStyle = `font-size: ${settings.fontSize}rem; line-height: ${settings.lineHeight}; width: 100%; height: 100%; box-sizing: border-box; overflow: hidden;`;
        const contentStyle = `padding: ${settings.paddingSize}px !important; width: 100%; height: 100%; box-sizing: border-box;`;

        return `
            <div class="soft">
                <div class="page-content" style="${contentStyle}">
                    <div class="${textPageClass}" style="${pageStyle}">
                        ${contentHTML}
                    </div>
                </div>
            </div>
        `;
    }

    // Turn.js'i başlat
    function initializeTurnJS() {
    // Turn.js Yapılandırması
    book.turn({
            width: 850,         // İki sayfanın toplam genişliği
            height: 620,        // Yükseklik
        autoCenter: true,   // Ortala
        gradients: true,    // Bükülme gölgesi (Gerçekçilik için şart)
        acceleration: true, // Donanım hızlandırma
        duration: 1000,     // Çevirme süresi (ms)
        elevation: 50,      // Sayfanın kalkma yüksekliği
        pages: totalPages   // Toplam sayfa sayısı (Kapaklar dahil)
    });

        // Event handler'ları bağla
        setupEventHandlers();
    }

    // Event handler'ları kur
    function setupEventHandlers() {

        // Sayfa çevrildiğinde sayfa numarasını güncelle
    book.bind('turned', function(event, page) {
        $("#page-input").val(page);
    });

        // İlk sayfa numarasını ayarla
        $("#page-input").val(1);

        // Zoom In Butonu
        $("#btn-zoom-in").click(function() {
            currentZoom = Math.min(currentZoom + zoomStep, maxZoom);
            applyZoom();
        });

        // Zoom Out Butonu
        $("#btn-zoom-out").click(function() {
            currentZoom = Math.max(currentZoom - zoomStep, minZoom);
            applyZoom();
        });

        // Zoom uygula
        function applyZoom() {
        bookStage.css({
            'transform': 'scale(' + currentZoom + ')',
            'transform-origin': 'center center',
            'transition': 'transform 0.3s ease'
        });
        }

        // En Başa Dön Butonu
    $("#btn-first-page").click(function() {
        book.turn("page", 1);
    });

    // Önceki Sayfa Butonu
    $("#btn-previous").click(function() {
        book.turn("previous");
    });

    // Sonraki Sayfa Butonu
    $("#btn-next").click(function() {
        book.turn("next");
    });

        // En Sona Git Butonu
    $("#btn-last-page").click(function() {
        book.turn("page", totalPages);
    });

    // Sayfa Numarası Input
    $("#page-input").on('keypress', function(e) {
        if (e.which === 13) { // Enter tuşu
            var pageNum = parseInt($(this).val());
            if (pageNum >= 1 && pageNum <= totalPages) {
                book.turn("page", pageNum);
            } else {
                $(this).val(book.turn("page"));
            }
        }
    });

    // Input'tan çıkınca mevcut sayfayı göster
    $("#page-input").on('blur', function() {
        $(this).val(book.turn("page"));
    });

    // Klavye Kontrolleri
    $(document).keydown(function(e){
        if (readerView.hasClass("active")) {
            if (e.keyCode == 37) book.turn("previous");
            if (e.keyCode == 39) book.turn("next");
            if (e.keyCode == 36) book.turn("page", 1); // Home - İlk sayfa
            if (e.keyCode == 35) book.turn("page", totalPages); // End - Son sayfa
        }
    });

    // Kütüphaneden Kitaba Geçiş
    $("#book-1-trigger").click(function() {
            // Arka plan geçişi: Kütüphane videosundan statik arka plana
            $('.library-video-bg').addClass('hidden');
            $('#reader-bg').addClass('active');
            
            // Rastgele okuyucu arka plan görseli yükle
            loadRandomReaderBackground();
            
            // View geçişi
        libraryView.removeClass("active").addClass("hidden");
        readerView.removeClass("hidden").addClass("active");
            
        book.turn("page", 1); // Her açılışta kapağa dön
        currentZoom = 1; // Zoom'u sıfırla
        bookStage.css({
            'transform': 'scale(1)',
            'transform-origin': 'center center'
        });
    });

    // Kitaptan Kütüphaneye Dönüş
    $("#btn-back-library").click(function() {
            // Arka plan geçişi: Statik arka plandan video'ya
            $('#reader-bg').removeClass('active');
            $('.library-video-bg').removeClass('hidden');
            
            // Yeni rastgele kütüphane videosu yükle
            loadRandomLibraryVideo();
            
            // View geçişi
        readerView.removeClass("active").addClass("hidden");
        libraryView.removeClass("hidden").addClass("active");
    });

        // Arka Plan Değiştir Butonu - Daha güvenilir event handler
        $("#btn-change-background").on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Rastgele yeni arka plan görseli yükle
            loadRandomReaderBackground();
            console.log('Arka plan değiştir butonu tıklandı');
        });
    }

    // Sayfaları yükle ve Turn.js'i başlat
    loadPagesFromStorage();
});