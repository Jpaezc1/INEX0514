const projects = [
  {
    title: "Decking Construction & Repairs",
    category: "custom-decks",
    image: "assets/images/optimized/deck-surface-after.webp",
    alt: "Finished deck surface after construction and repair work"
  },
  {
    title: "Custom Exterior Construction",
    category: "outdoor-accessories",
    image: "assets/images/optimized/stair-access-after.webp",
    alt: "Completed exterior stair construction with lighting"
  },
  {
    title: "Concrete & Block Work",
    category: "patio-hardscapes",
    image: "assets/images/optimized/concrete-block-work.webp",
    alt: "Concrete block wall construction in progress"
  },
  {
    title: "Interior & Exterior Renovation",
    category: "sunrooms-enclosures",
    image: "assets/images/optimized/building-envelope-after.webp",
    alt: "Exterior building envelope renovation work"
  },
  {
    title: "Remodeling & Enclosure Work",
    category: "sunrooms-enclosures",
    image: "assets/images/optimized/building-envelope-lattice-after.webp",
    alt: "Lattice and exterior envelope improvement after construction"
  },
  {
    title: "Repairs & Restoration",
    category: "custom-decks",
    image: "assets/images/optimized/deck-surface-before.webp",
    alt: "Weathered deck surface before repair and restoration work"
  }
];

const navToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");
const tabs = document.querySelectorAll(".tab");
const tabLinks = document.querySelectorAll("[data-tab-link]");
const projectCards = document.querySelectorAll(".project-card");
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxCaption = document.querySelector("#lightbox-caption");
const lightboxClose = document.querySelector(".lightbox-close");
const lightboxPrev = document.querySelector(".lightbox-arrow.prev");
const lightboxNext = document.querySelector(".lightbox-arrow.next");
const compareSlider = document.querySelector("#compare-slider");
const compareReveal = document.querySelector("#compare-reveal");
const compareHandle = document.querySelector("#compare-handle");

const contactForm = document.querySelector(".contact-form");
const contactStatus = document.querySelector(".form-status");

let currentProjectIndex = 0;

// Mobile navigation toggle.
navToggle.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

navMenu.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    navMenu.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

// Portfolio filtering for category tabs and dropdown links.
function setPortfolioFilter(filter) {
  tabs.forEach((tab) => {
    const isActive = tab.dataset.filter === filter || (filter !== "all" && tab.dataset.filter === filter);
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  if (!document.querySelector(`.tab[data-filter="${filter}"]`)) {
    document.querySelector('.tab[data-filter="all"]').classList.add("active");
  }

  projectCards.forEach((card) => {
    const shouldShow = filter === "all" || card.dataset.category === filter;
    card.hidden = !shouldShow;
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setPortfolioFilter(tab.dataset.filter));
});

tabLinks.forEach((link) => {
  link.addEventListener("click", () => setPortfolioFilter(link.dataset.tabLink));
});

// Lightbox controls for browsing portfolio projects.
function openLightbox(index) {
  currentProjectIndex = index;
  updateLightbox();
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  lightboxClose.focus();
}

function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
}

function updateLightbox() {
  const project = projects[currentProjectIndex];
  lightboxImage.src = project.image;
  lightboxImage.alt = project.alt;
  lightboxCaption.textContent = project.title;
}

function showProject(direction) {
  currentProjectIndex = (currentProjectIndex + direction + projects.length) % projects.length;
  updateLightbox();
}

projectCards.forEach((card) => {
  card.addEventListener("click", () => openLightbox(Number(card.dataset.index)));
});

lightboxClose.addEventListener("click", closeLightbox);
lightboxPrev.addEventListener("click", () => showProject(-1));
lightboxNext.addEventListener("click", () => showProject(1));

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (!lightbox.classList.contains("open")) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") showProject(-1);
  if (event.key === "ArrowRight") showProject(1);
});

// Draggable image comparison slider.
function setComparisonPosition(clientX) {
  const rect = compareSlider.getBoundingClientRect();
  const position = Math.max(0, Math.min(clientX - rect.left, rect.width));
  const percent = (position / rect.width) * 100;
  compareReveal.style.clipPath = `inset(0 0 0 ${percent}%)`;
  compareHandle.style.left = `${percent}%`;
  compareSlider.style.setProperty("--compare-position", `${percent}%`);
}

function startComparisonDrag(event) {
  event.preventDefault();
  const move = (moveEvent) => {
    const pointer = moveEvent.touches ? moveEvent.touches[0] : moveEvent;
    setComparisonPosition(pointer.clientX);
  };
  const stop = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", stop);
    window.removeEventListener("touchmove", move);
    window.removeEventListener("touchend", stop);
  };

  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", stop);
  window.addEventListener("touchmove", move, { passive: false });
  window.addEventListener("touchend", stop);
}

compareSlider.addEventListener("mousedown", startComparisonDrag);
compareSlider.addEventListener("touchstart", startComparisonDrag, { passive: false });

compareHandle.addEventListener("keydown", (event) => {
  const rect = compareSlider.getBoundingClientRect();
  const current = Number.parseFloat(compareHandle.style.left || "50");
  if (event.key === "ArrowLeft") {
    setComparisonPosition(rect.left + ((current - 5) / 100) * rect.width);
  }
  if (event.key === "ArrowRight") {
    setComparisonPosition(rect.left + ((current + 5) / 100) * rect.width);
  }
});

// Submit contact requests to the Cloudflare Worker endpoint.
if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const formData = new FormData(contactForm);

    contactStatus.textContent = "Sending your request...";
    contactStatus.classList.remove("error", "success");
    submitButton.disabled = true;

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" }
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Unable to send your request right now.");
      }

      contactForm.reset();
      contactStatus.textContent = result.message || "Thanks. Your request has been sent.";
      contactStatus.classList.add("success");
    } catch (error) {
      contactStatus.textContent = error.message || "Unable to send your request right now.";
      contactStatus.classList.add("error");
    } finally {
      submitButton.disabled = false;
    }
  });
}
