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
    var jsonPages = []; // Yüklenen JSON sayfaları (pageNumber bilgisi ile)
    const STORAGE_KEY = 'bookContent';
    const BOOKMARK_KEY = 'bookmark_book1'; // Kitap 1 için ayraç anahtarı
    const MAX_PAGES = 100; // Maksimum sayfa sayısı (sayfa1.json - sayfa100.json) - İhtiyaca göre artırılabilir

    // Video klasör yolları
    const LIBRARY_VIDEOS_FOLDER = 'kütüphane/';

    // Kütüphane için video dosyaları listesi
    const libraryVideoFiles = [
        'Magical_Coffee_Library_Animation.mp4',
        'Generating_Burnt_Grounds_Cinematic_Shot.mp4',
        'Fantasy_Coffee_World_Animation.mp4',
        'Endless_Magical_Coffee_Library_Animation.mp4'
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

        // JSON sayfalarını sakla (sayfa numarası gösterimi için)
        jsonPages = pages;

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
        
        // İlk yüklemede ayraç buton durumunu güncelle
        updateBookmarkButtonState();
    }

    // Event handler'ları kur
    function setupEventHandlers() {

        // Sayfa çevrildiğinde sayfa numarasını güncelle (çift sayfa formatında)
    book.bind('turned', function(event, page) {
        // Turn.js sayfa numarasını çift sayfa formatına çevir (0-1, 2-3, 4-5 gibi)
        const pageDisplay = formatPageNumberForDisplay(page);
        $("#page-input").val(pageDisplay);
        updateBookmarkButtonState();
        // Debug için console.log
        console.log('Sayfa çevrildi - Turn.js sayfa:', page, 'Gösterilen:', pageDisplay);
    });

        // İlk sayfa numarasını ayarla (çift sayfa formatında)
        const initialPage = book.turn("page") || 1;
        $("#page-input").val(formatPageNumberForDisplay(initialPage));

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

    // Sayfa Numarası Input - Çift sayfa formatını parse et
    $("#page-input").on('keypress', function(e) {
        if (e.which === 13) { // Enter tuşu
            var inputValue = $(this).val().trim();
            var targetPage = parsePageNumberFromInput(inputValue);
            
            if (targetPage >= 1 && targetPage <= totalPages) {
                book.turn("page", targetPage);
            } else {
                // Geçersiz sayfa numarası - mevcut sayfayı göster
                const currentPage = book.turn("page");
                $(this).val(formatPageNumberForDisplay(currentPage));
            }
        }
    });

    // Input'tan çıkınca mevcut sayfayı göster (çift sayfa formatında)
    $("#page-input").on('blur', function() {
        const currentPage = book.turn("page");
        $(this).val(formatPageNumberForDisplay(currentPage));
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
        // Ayraç kontrolü - Eğer ayraç varsa modal göster
        const bookmark = getBookmark();
        if (bookmark && bookmark.pageNumber) {
            // Modal göster
            showContinueModal(bookmark.pageNumber);
        } else {
            // Ayraç yoksa direkt kitabı aç
            openBook(1);
        }
    });

    // Kitabı aç (sayfa numarası ile)
    function openBook(startPage) {
        // Arka plan geçişi: Kütüphane videosundan statik arka plana
        $('.library-video-bg').addClass('hidden');
        $('#reader-bg').addClass('active');
        
        // Rastgele okuyucu arka plan görseli yükle
        loadRandomReaderBackground();
        
        // View geçişi
        libraryView.removeClass("active").addClass("hidden");
        readerView.removeClass("hidden").addClass("active");
        
        book.turn("page", startPage);
        currentZoom = 1; // Zoom'u sıfırla
        bookStage.css({
            'transform': 'scale(1)',
            'transform-origin': 'center center'
        });
        
        // Ayraç buton durumunu güncelle
        updateBookmarkButtonState();
    }

    // Devam Et Modal'ını göster
    function showContinueModal(bookmarkPage) {
        // Sayfa numarasını kullanıcı formatına çevir (2-3, 4-5 gibi)
        const pageDisplay = formatPageNumberForDisplay(bookmarkPage);
        $('#continue-page-number').text(pageDisplay || bookmarkPage);
        $('#continue-modal').addClass('show');
    }

    // Devam Et Modal'ını gizle
    function hideContinueModal() {
        $('#continue-modal').removeClass('show');
    }

    // Modal butonları
    $('#btn-start-from-beginning').click(function() {
        hideContinueModal();
        openBook(1); // Baştan başla
    });

    $('#btn-continue-reading').click(function() {
        const bookmark = getBookmark();
        hideContinueModal();
        if (bookmark && bookmark.pageNumber) {
            openBook(bookmark.pageNumber); // Ayraç sayfasına git
        } else {
            openBook(1);
        }
    });

    // Modal overlay'e tıklanınca kapat
    $('.bookmark-modal-overlay').click(function() {
        hideContinueModal();
        // Varsayılan olarak baştan başlat
        openBook(1);
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

        // Harita Butonu - Parola korumalı
        $("#btn-open-map").on('click', function() {
            showMapPasswordModal();
        });

        // Ayraç İşlevselliği
        setupBookmarkHandlers();
    }

    // Harita Parola Modal'ı
    function showMapPasswordModal() {
        // Modal oluştur
        const modalHTML = `
            <div id="map-password-modal" class="bookmark-modal">
                <div class="bookmark-modal-overlay"></div>
                <div class="bookmark-modal-content">
                    <div class="bookmark-icon">🗺️</div>
                    <h3 class="bookmark-modal-title">Demleme Âlemi Haritası</h3>
                    <p class="bookmark-modal-text">Haritaya erişmek için parolayı girin:</p>
                    <input type="text" id="map-password-input" class="map-password-input" placeholder="Parola girin..." autocomplete="off">
                    <p id="map-password-error" class="map-password-error" style="display: none; color: #ef4444; margin-top: 10px; font-size: 0.9rem;"></p>
                    <div class="bookmark-modal-buttons">
                        <button class="bookmark-btn bookmark-btn-primary" id="btn-submit-password">
                            <span>Giriş Yap</span>
                        </button>
                        <button class="bookmark-btn bookmark-btn-secondary" id="btn-cancel-password">
                            <span>İptal</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        $('body').append(modalHTML);
        $('#map-password-modal').addClass('show');
        $('#map-password-input').focus();

        // Enter tuşu ile gönder
        $('#map-password-input').on('keypress', function(e) {
            if (e.which === 13) {
                checkMapPassword();
            }
        });

        // Giriş butonu
        $('#btn-submit-password').on('click', checkMapPassword);

        // İptal butonu
        $('#btn-cancel-password').on('click', function() {
            $('#map-password-modal').remove();
        });

        // Overlay'e tıklanınca kapat
        $('#map-password-modal .bookmark-modal-overlay').on('click', function() {
            $('#map-password-modal').remove();
        });
    }

    // Parola kontrolü
    function checkMapPassword() {
        const inputPassword = $('#map-password-input').val().trim();
        const correctPassword = 'Bir gün bu kokunun peşinden gideceğim';
        const $error = $('#map-password-error');

        if (inputPassword === correctPassword) {
            // Parola doğru - sessionStorage'a kaydet ve harita sayfasına git
            sessionStorage.setItem('mapPasswordVerified', 'true');
            window.location.href = 'harita.html';
        } else {
            // Parola yanlış - hata göster
            $error.text('Parola yanlış! Lütfen tekrar deneyin.').show();
            $('#map-password-input').val('').focus();
            
            // Hata mesajını 3 saniye sonra gizle
            setTimeout(function() {
                $error.fadeOut();
            }, 3000);
        }
    }

// /////////////////////////////////////////////////////////////

// I. SAYFA NUMARASI GÖRÜNTÜLEME (Kullanıcıya Çift Sayfa Formatı)

// /////////////////////////////////////////////////////////////



/**

 * Turn.js'ten gelen tek sayfa numarasını (Örn: 3, 4, 5...) alarak

 * kullanıcının göreceği çift sayfa aralığına çevirir (Örn: '2-3', '4-5').

 * @param {number} turnPage Turn.js'in o anki tek sayfa numarası.

 * @returns {string} 'X-Y' formatında kullanıcı sayfası numarası veya boş dize.

 */

function formatPageNumberForDisplay(turnPage) {

    // Kapaklar için boş döndür. totalPages'in global/dışarıda tanımlı olduğunu varsayar.

    if (turnPage <= 2 || turnPage >= totalPages - 1) {

        return '';

    }

    

    let leftPage; // Soldaki çift sayfa numarası (2, 4, 6...)

    

    // Turn.js'in sayfa numarası ile gösterilecek sol sayfa arasındaki ilişki:

    // Turn.js N=3 (tek) -> P=2 (P = N - 1)

    // Turn.js N=4 (çift) -> P=2 (P = N - 2)

    

    if (turnPage % 2 !== 0) {

        // Tek sayı ise (sağdaki sayfa)

        leftPage = turnPage - 1;

    } else {

        // Çift sayı ise (soldaki sayfa)

        leftPage = turnPage - 2;

    }

    

    // 2'den küçükse (yani 1-2 seti veya daha küçükse) numara gösterme

    if (leftPage < 2) {

        return '';

    }

    

    const rightPage = leftPage + 1;

    

    return leftPage + '-' + rightPage; 

}



// /////////////////////////////////////////////////////////////

// II. TEXTBOX NAVİGASYONU (Girdiden Turn.js Sayfa Numarasına Çevirme)

// /////////////////////////////////////////////////////////////



/**

 * Textbox'tan gelen kullanıcı sayfa numarasını (Örn: 4, 5) 

 * alarak Turn.js'in gideceği tek sayfa numarasına çevirir.

 * @param {string} inputValue Kullanıcının girdiği sayfa numarası.

 * @returns {number} Turn.js'in hedefleyeceği sayfa numarası.

 */

function parsePageNumberFromInput(inputValue) {

    if (!inputValue || inputValue.trim() === '') {

        return 1;

    }

    

    var targetUserPageNum = parseInt(inputValue);

    

    // Geçerli sayı değilse veya 2'den küçükse (içerik 2'den başlıyor)

    if (isNaN(targetUserPageNum) || targetUserPageNum < 2) {

        return 1;

    }

    

    let leftPage; // Girdinin dahil olduğu çift sayfa setinin sol (çift) numarası

    

    // Girdiyi her zaman setin başlangıcına (çift sayıya) yuvarla.

    if (targetUserPageNum % 2 !== 0) {

        leftPage = targetUserPageNum - 1; // 3 -> 2, 5 -> 4

    } else {

        leftPage = targetUserPageNum; // 2 -> 2, 4 -> 4

    }

    

    // Turn.js Hedef Sayfa Hesaplaması (N = P_left + 1)

    // Bu, Turn.js'te setin sağındaki tek sayfa numarasına gitmeyi hedefler.

    const targetTurnPage = leftPage + 1;

    

    // Geçerli Aralık Kontrolü

    return Math.max(1, Math.min(targetTurnPage, totalPages));

}
    // Ayraç İşlevselliği Fonksiyonları
    function setupBookmarkHandlers() {
        // Ayraç Ekle/Kaldır Butonu
        $("#btn-bookmark").click(function() {
            const currentPage = book.turn("page");
            const bookmark = getBookmark();
            
            if (bookmark && bookmark.pageNumber === currentPage) {
                // Mevcut sayfada ayraç varsa kaldır
                removeBookmark();
                updateBookmarkButtonState();
                const pageDisplay = formatPageNumberForDisplay(currentPage);
                const displayText = pageDisplay ? `: ${pageDisplay}` : '';
                showBookmarkNotification('Ayraç kaldırıldı' + displayText, false);
            } else {
                // Yeni ayraç ekle
                setBookmark(currentPage);
                updateBookmarkButtonState();
                const pageDisplay = formatPageNumberForDisplay(currentPage);
                const displayText = pageDisplay ? `: ${pageDisplay}` : '';
                showBookmarkNotification('Ayraç eklendi' + displayText, true);
            }
        });

        // Ayraca Git Butonu
        $("#btn-goto-bookmark").click(function() {
            const bookmark = getBookmark();
            if (bookmark && bookmark.pageNumber) {
                book.turn("page", bookmark.pageNumber);
                const pageDisplay = formatPageNumberForDisplay(bookmark.pageNumber);
                const displayText = pageDisplay ? `: ${pageDisplay}` : '';
                showBookmarkNotification('Ayraca gidildi' + displayText, true);
            }
        });
    }

    // Ayraç kaydet
    function setBookmark(pageNumber) {
        const bookmark = {
            pageNumber: pageNumber,
            timestamp: new Date().getTime()
        };
        localStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmark));
    }

    // Ayraç al
    function getBookmark() {
        const stored = localStorage.getItem(BOOKMARK_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Ayraç parse hatası:', e);
                return null;
            }
        }
        return null;
    }

    // Ayraç kaldır
    function removeBookmark() {
        localStorage.removeItem(BOOKMARK_KEY);
    }

    // Ayraç buton durumunu güncelle
    function updateBookmarkButtonState() {
        const currentPage = book.turn("page");
        const bookmark = getBookmark();
        const $bookmarkBtn = $("#btn-bookmark");
        const $gotoBookmarkBtn = $("#btn-goto-bookmark");

        if (bookmark && bookmark.pageNumber) {
            // Ayraç var
            if (bookmark.pageNumber === currentPage) {
                // Mevcut sayfada ayraç var - Kaldır butonu göster
                $bookmarkBtn.html('⚐<span class="bookmark-cross"></span>');
                $bookmarkBtn.attr('title', 'Kitap Ayracı Kaldır');
                $bookmarkBtn.addClass('bookmark-active');
                $gotoBookmarkBtn.hide();
            } else {
                // Başka sayfada ayraç var - Ekle butonu ve Ayraca Git butonu göster
                $bookmarkBtn.html('⚐');
                $bookmarkBtn.attr('title', 'Kitap Ayracı Ekle');
                $bookmarkBtn.removeClass('bookmark-active');
                $gotoBookmarkBtn.show();
            }
        } else {
            // Ayraç yok - Ekle butonu göster
            $bookmarkBtn.html('⚐');
            $bookmarkBtn.attr('title', 'Kitap Ayracı Ekle');
            $bookmarkBtn.removeClass('bookmark-active');
            $gotoBookmarkBtn.hide();
        }
    }

    // Ayraç bildirimi göster
    function showBookmarkNotification(message, isSuccess) {
        // Mevcut bildirimi kaldır (varsa)
        $('.bookmark-notification').remove();
        
        const $notification = $('<div class="bookmark-notification">' + message + '</div>');
        $('body').append($notification);
        
        // Bildirimi göster
        setTimeout(function() {
            $notification.addClass('show');
        }, 10);
        
        // Bildirimi gizle (daha kısa süre)
        setTimeout(function() {
            $notification.removeClass('show');
            setTimeout(function() {
                $notification.remove();
            }, 300);
        }, 1200); // 2000ms'den 1200ms'ye düşürüldü
    }

    // Sayfaları yükle ve Turn.js'i başlat
    loadPagesFromStorage();
});