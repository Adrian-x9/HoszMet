// Plik: js/gallery.js
// Logika galerii, w tym parser danych i obsługa panelu
// Gallery logic, including data parser and panel handling
"use strict";

// =================================================================
// 🔹 ZMIENNE GLOBALNE GALERII / GALLERY GLOBAL VARS
// =================================================================
let isGalleryOpen = false;
let hasGalleryBeenBuilt = false; // Śledzi, czy siatka została już zbudowana / Tracks if grid has been built
let currentGalleryPhotos = []; // Przechowuje aktualnie wyświetlaną (potasowaną) kolejność / Holds the current (shuffled) order

// ZMIENNE LIGHTBOXA / LIGHTBOX VARS
let isLightboxOpen = false;
let currentLightboxIndex = 0;
let slideshowTimer = null;
const SLIDESHOW_INTERVAL = 4000; // 4 sekundy

// Shorthand dla pobierania elementów / Shorthand for getting elements
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// =================================================================
// 🔹 PARSER DANYCH / DATA PARSER
// =================================================================
/**
 * Generuje czystą tablicę obiektów zdjęć z surowego stringa 'dir /w'.
 * Generates a clean array of photo objects from a raw 'dir /w' string.
 * @param {string} rawData - Surowy string z rawPhotoData (z photos.js)
 * @returns {Array<Object>} Tablica obiektów zdjęć
 */
function generateGalleryData(rawData) {
  // Definiujemy, co chcemy wyciąć z listingu (pliki niebędące zdjęciami)
  // Define what to filter out (non-image files)
  const excludedFiles = ["[.]", "[..]", "dir1.txt", "dir2.txt"];

  // Logika parsowania / Parsing logic
  const galleryPhotos = rawData
    .split(/\s+/) // Dzielimy po dowolnych białych znakach / Split by any whitespace
    .filter((filename) => filename.trim().length > 0) // Usuwamy puste wpisy / Remove empty entries
    .filter((filename) => !excludedFiles.includes(filename)) // Usuwamy wykluczone pliki / Remove excluded files
    .filter((filename) => /\.(jpg|jpeg|png|gif)$/i.test(filename)) // Bierzemy tylko obrazy / Take only images (case-insensitive)
    .map((filename) => {
      // Zamieniamy '20180111_123512.jpg' na '20180111_123512'
      // Change '20180111_123512.jpg' to '20180111_123512'
      const id = filename.replace(/\.[^/.]+$/, "");

      return {
        id: id,
        thumb: `./photos-mini/${filename}`, // Ścieżka do miniaturki / Path to thumbnail
        full: `./photos/${filename}`, // Ścieżka do pełnego zdjęcia / Path to full image
        alt_key: `gallery_${id}_alt`, // Klucz do tłumaczenia / Translation key
      };
    });

  return galleryPhotos;
}

// Wygenerowanie naszej finalnej, czystej tablicy z danymi
// Generate our final, clean data array
// Zmienna 'rawPhotoData' pochodzi z wczytanego pliku photos.js
// 'rawPhotoData' variable comes from the loaded photos.js file
const allGalleryPhotos = generateGalleryData(rawPhotoData);
// Kopiujemy oryginalną tablicę do naszej roboczej / Copy original array to our working array
currentGalleryPhotos = [...allGalleryPhotos];
console.log(
  `HoszMet Gallery: Załadowano i przetworzono ${currentGalleryPhotos.length} zdjęć.`
);

// =================================================================
// 🔹 LOGIKA SIATKI MASONRY / MASONRY GRID LOGIC
// =================================================================

/**
 * Tasuje tablicę "w miejscu" używając algorytmu Fisher-Yates.
 * Shuffles an array in-place using Fisher-Yates algorithm.
 * @param {Array} array - Tablica do potasowania.
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Zamiana miejscami / Swap elements
  }
}

/**
 * Buduje siatkę zdjęć masonry w kontenerze.
 * Builds the masonry photo grid in the container.
 * @param {Array<Object>} photos - Tablica obiektów zdjęć do wyświetlenia.
 */
function buildMasonryGrid(photos) {
  const container = $("#gallery-masonry-container");
  if (!container) return;

  // Pobranie aktualnego języka i tłumaczeń / Get current language and strings
  const currentLang = document.documentElement.lang;
  const strings = allStrings[currentLang] || allStrings["us"];
  // Tłumaczenie zastępcze, gdyby brakowało alt_key / Fallback translation if alt_key is missing
  const fallbackAlt = strings.galleryTitle || "Gallery image";

  let gridHTML = "";
  photos.forEach((photo, index) => {
    // Pobranie właściwego tekstu 'alt' lub użycie zastępczego
    // Get the correct 'alt' text or use the fallback
    const altText = strings[photo.alt_key] || `${fallbackAlt} ${index + 1}`;

    gridHTML += `
            <figure class="gallery-item" data-index="${index}" data-full-src="${photo.full}">
                <img src="${photo.thumb}" alt="${altText}" loading="lazy">
                <div class="gallery-item-overlay">
                    <i class="fas fa-search-plus"></i>
                </div>
            </figure>
        `;
  });

  container.innerHTML = gridHTML;
  hasGalleryBeenBuilt = true;

  // Podpinamy listenery do nowo stworzonych miniaturek
  // Attach listeners to the newly created thumbnails
  addGridClickListeners();
}

/**
 * Obsługuje kliknięcie przycisku "Shuffle" z animacją.
 * Handles the "Shuffle" button click with animation.
 */
function handleShuffleClick() {
  if (!isGalleryOpen) return;
  const container = $("#gallery-masonry-container");
  if (!container) return;

  // 1. Uruchom fade-out / Start fade-out
  container.classList.add("shuffling");

  // 2. Poczekaj na zakończenie animacji / Wait for animation to end
  setTimeout(() => {
    // 3. W tle przetasuj i przebuduj DOM / Shuffle and rebuild DOM in background
    shuffleArray(currentGalleryPhotos);
    buildMasonryGrid(currentGalleryPhotos);

    // 4. Uruchom fade-in / Start fade-in
    container.classList.remove("shuffling");
  }, 300); // Musi pasować do czasu transition w CSS / Must match CSS transition time
}

// =================================================================
// 🔹 LOGIKA LIGHTBOXA / LIGHTBOX LOGIC
// =================================================================

/**
 * Podpina listenery kliknięć do miniaturek w siatce.
 * Attaches click listeners to grid thumbnails.
 */
function addGridClickListeners() {
  $$(".gallery-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      // Pobieramy indeks z klikniętego elementu / Get index from clicked item
      const index = parseInt(e.currentTarget.dataset.index, 10);
      openLightbox(index);
    });
  });
}

/**
 * Otwiera Lightbox na konkretnym zdjęciu.
 * Opens the Lightbox at a specific image.
 * @param {number} index - Indeks zdjęcia w 'currentGalleryPhotos'
 */
function openLightbox(index) {
  if (isLightboxOpen) return;

  $("#gallery-overlay").classList.add("lightbox-active");
  $("#gallery-lightbox").classList.remove("lightbox-hidden");
  isLightboxOpen = true;

  loadLightboxImage(index);
}

/**
 * Zamyka Lightbox i wraca do siatki.
 * Closes the Lightbox and returns to the grid.
 */
function closeLightbox() {
  if (!isLightboxOpen) return;

  stopSlideshow(); // Zatrzymujemy pokaz slajdów na wszelki wypadek
  $("#gallery-overlay").classList.remove("lightbox-active");
  $("#gallery-lightbox").classList.add("lightbox-hidden");
  isLightboxOpen = false;

  // Czyścimy obrazek, żeby nie "migał" przy następnym otwarciu
  // Clear the image so it doesn't "flash" on next open
  $("#lightbox-image").src = "";
  $("#lightbox-image").classList.remove("loaded");
}

/**
 * Ładuje konkretne zdjęcie do Lightboxa z animacją przejścia.
 * Loads a specific image into the Lightbox with transition animation.
 * @param {number} index - Indeks zdjęcia
 */
function loadLightboxImage(index) {
  const lightboxImage = $("#lightbox-image");
  const spinner = $("#lightbox-spinner");
  const counter = $("#lightbox-counter");

  if (!lightboxImage || !spinner || !counter) return;

  // Pobranie danych zdjęcia / Get photo data
  const photo = currentGalleryPhotos[index];
  if (!photo) return;

  currentLightboxIndex = index;
  spinner.style.display = "block";

  // 1. Rozpocznij fade-out starego zdjęcia / Start fade-out of old image
  lightboxImage.classList.remove("loaded");

  const currentLang = document.documentElement.lang;
  const strings = allStrings[currentLang] || allStrings["us"];
  const altText =
    strings[photo.alt_key] || `${strings.galleryTitle || "Image"} ${index + 1}`;

  // Czekamy na zakończenie animacji fade-out (0.4s) zanim zaczniemy ładować nowe
  // Wait for fade-out (0.4s) to finish before loading the new one
  setTimeout(() => {
    const img = new Image();
    img.onload = () => {
      spinner.style.display = "none";
      lightboxImage.src = img.src;
      lightboxImage.alt = altText;

      // 2. Uruchom fade-in nowego zdjęcia / Start fade-in of new image
      lightboxImage.classList.add("loaded");

      // Ustaw licznik / Set counter
      counter.textContent = `${strings.galleryPhotoCounter || "Zdjęcie"} ${
        index + 1
      } ${strings.galleryPhotoOf || "z"} ${currentGalleryPhotos.length}`;

      // Jeśli slideshow jest aktywny, zresetuj pasek postępu / If slideshow is active, reset progress bar
      if (slideshowTimer) {
        resetSlideshowProgress();
      }
    };
    img.onerror = () => {
      // Obsługa błędu ładowania / Handle loading error
      spinner.style.display = "none";
      counter.textContent = "Nie można załadować obrazu.";
    };
    img.src = photo.full;
  }, 400); // Musi pasować do czasu transition obrazka w CSS / Must match image transition time in CSS
}

/**
 * Pokazuje następne zdjęcie w Lightboxie.
 * Shows the next image in the Lightbox.
 */
function showNextImage() {
  let nextIndex = currentLightboxIndex + 1;
  if (nextIndex >= currentGalleryPhotos.length) {
    nextIndex = 0; // Zapętlamy do początku / Loop to start
  }
  loadLightboxImage(nextIndex);
}

/**
 * Pokazuje poprzednie zdjęcie w Lightboxie.
 * Shows the previous image in the Lightbox.
 */
function showPrevImage() {
  let prevIndex = currentLightboxIndex - 1;
  if (prevIndex < 0) {
    prevIndex = currentGalleryPhotos.length - 1; // Zapętlamy do końca / Loop to end
  }
  loadLightboxImage(prevIndex);
}

/**
 * Resetuje lub zatrzymuje animację paska postępu.
 * Resets or stops the progress bar animation.
 * @param {boolean} stop - Jeśli true, tylko zatrzymuje i resetuje. / If true, just stops and resets.
 */
function resetSlideshowProgress(stop = false) {
  const fill = $("#lightbox-progress-fill");
  if (!fill) return;

  fill.classList.remove("animate"); // Usuń starą animację / Remove old animation
  fill.style.width = "0%"; // Zresetuj szerokość / Reset width

  if (stop) return; // Jeśli tylko zatrzymujemy, nie uruchamiaj nowej animacji / If just stopping, don't start new animation

  // Trik z reflow, aby przeglądarka wznowiła animację / Reflow trick to restart animation
  void fill.offsetWidth;

  fill.classList.add("animate"); // Dodaj nową animację / Add new animation
  fill.style.width = "100%"; // Uruchom animację do 100% / Start animation to 100%
}

/**
 * Uruchamia automatyczny pokaz slajdów.
 * Starts the automatic slideshow.
 */
function startSlideshow() {
  if (slideshowTimer) return; // Już działa / Already running

  const playBtnIcon = $("#gallery-play-btn i");
  if (playBtnIcon) playBtnIcon.className = "fas fa-pause";

  // Pokaż pasek postępu / Show progress bar
  $("#gallery-lightbox").classList.add("slideshow-active");

  if (!isLightboxOpen) {
    openLightbox(0);
    // loadLightboxImage wywoła resetSlideshowProgress() w .onload
  } else {
    // Jeśli już otwarty, po prostu uruchom timer i pasek
    resetSlideshowProgress();
  }

  // Ustaw timer (zostanie wywołany PO pierwszym załadowaniu, jeśli nie był otwarty)
  // Set timer (will be called AFTER first load, if not already open)
  slideshowTimer = setInterval(showNextImage, SLIDESHOW_INTERVAL);
}

/**
 * Zatrzymuje automatyczny pokaz slajdów.
 * Stops the automatic slideshow.
 */
function stopSlideshow() {
  if (slideshowTimer) {
    clearInterval(slideshowTimer);
    slideshowTimer = null;
  }
  const playBtnIcon = $("#gallery-play-btn i");
  if (playBtnIcon) playBtnIcon.className = "fas fa-play";

  // Ukryj i zresetuj pasek postępu / Hide and reset progress bar
  $("#gallery-lightbox").classList.remove("slideshow-active");
  resetSlideshowProgress(true); // 'true' = zatrzymaj / 'true' = stop
}

/**
 * Przełącza (play/pause) pokaz slajdów.
 * Toggles (play/pause) the slideshow.
 */
function toggleSlideshow() {
  if (slideshowTimer) {
    stopSlideshow();
  } else {
    startSlideshow();
  }
}

// =================================================================
// 🔹 LOGIKA OTWIERANIA/ZAMYKANIA (GŁÓWNA) / (MAIN) OPEN/CLOSE LOGIC
// =================================================================

/**
 * Otwiera overlay galerii.
 * Opens the gallery overlay.
 */
function openGallery() {
  if (isGalleryOpen) return;
  const galleryOverlay = $("#gallery-overlay");
  if (!galleryOverlay) return;

  document.body.classList.add("gallery-active");
  galleryOverlay.classList.remove("gallery-hidden");
  isGalleryOpen = true;

  // Zbuduj siatkę tylko przy pierwszym otwarciu / Build grid only on first open
  if (!hasGalleryBeenBuilt) {
    buildMasonryGrid(currentGalleryPhotos);
  }
}

/**
 * Zamyka overlay galerii.
 * Closes the gallery overlay.
 */
function closeGallery() {
  if (!isGalleryOpen) return;

  // Jeśli lightbox jest otwarty, zamknij go najpierw
  // If lightbox is open, close it first
  if (isLightboxOpen) {
    closeLightbox();
  }

  const galleryOverlay = $("#gallery-overlay");
  if (!galleryOverlay) return;
  document.body.classList.remove("gallery-active");
  galleryOverlay.classList.add("gallery-hidden");
  isGalleryOpen = false;
}

// =================================================================
// 🔹 INICJALIZACJA EVENTÓW / EVENT LISTENERS
// =================================================================
// Musimy poczekać na DOM, żeby podpiąć listenery
// We must wait for the DOM to attach listeners
document.addEventListener("DOMContentLoaded", () => {
  // Ustawiamy zmienną CSS dla czasu trwania animacji paska
  // Set CSS variable for bar animation duration
  document.documentElement.style.setProperty(
    "--slideshow-interval",
    `${SLIDESHOW_INTERVAL}ms`
  );

  // Przyciski główne galerii / Main gallery buttons
  const openBtn = $("#gallery-open-btn");
  const closeBtn = $("#gallery-close-btn");
  const shuffleBtn = $("#gallery-shuffle-btn");
  const playBtn = $("#gallery-play-btn");
  const ctaLink = $("#gallery-cta-link");

  // Przyciski Lightboxa / Lightbox buttons
  const lightboxClose = $("#lightbox-close-btn");
  const lightboxPrev = $("#lightbox-prev-btn");
  const lightboxNext = $("#lightbox-next-btn");

  // --- Listenery Główne ---
  if (openBtn) {
    openBtn.addEventListener("click", openGallery);
  }
  if (ctaLink) {
    // <-- NOWY BLOK / NEW BLOCK
    ctaLink.addEventListener("click", (e) => {
      e.preventDefault(); // To jest link <a href="#"> / It's an <a href="#"> link
      openGallery();
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener("click", closeGallery);
  }
  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", handleShuffleClick);
  }

  // Przycisk Play/Pause przełącza slideshow / Play/Pause button toggles slideshow
  if (playBtn) {
    playBtn.addEventListener("click", toggleSlideshow);
  }

  // --- Listenery Lightboxa ---
  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }
  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", () => {
      showPrevImage();
      stopSlideshow(); // Ręczna nawigacja zatrzymuje pokaz / Manual nav stops slideshow
    });
  }
  if (lightboxNext) {
    lightboxNext.addEventListener("click", () => {
      showNextImage();
      stopSlideshow(); // Ręczna nawigacja zatrzymuje pokaz / Manual nav stops slideshow
    });
  }

  // Obsługa nawigacji klawiaturą / Keyboard navigation handling
  document.addEventListener("keydown", (e) => {
    if (!isLightboxOpen) return; // Działaj tylko gdy lightbox jest otwarty / Only act when lightbox is open

    if (e.key === "ArrowRight") {
      showNextImage();
      stopSlideshow();
    } else if (e.key === "ArrowLeft") {
      showPrevImage();
      stopSlideshow();
    } else if (e.key === "Escape") {
      closeLightbox(); // Używamy funkcji zamykającej lightbox / Use lightbox close function
    }
  });
});
