// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const menuIcon = document.getElementById('menuIcon');
const closeIcon = document.getElementById('closeIcon');

mobileMenuBtn.addEventListener('click', () => {
  const isOpen = !mobileMenu.classList.contains('hidden');
  
  if (isOpen) {
    mobileMenu.classList.add('hidden');
    menuIcon.classList.remove('hidden');
    closeIcon.classList.add('hidden');
  } else {
    mobileMenu.classList.remove('hidden');
    menuIcon.classList.add('hidden');
    closeIcon.classList.remove('hidden');
  }
});

// Close mobile menu when clicking on a link
const mobileLinks = mobileMenu.querySelectorAll('a');
mobileLinks.forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.add('hidden');
    menuIcon.classList.remove('hidden');
    closeIcon.classList.add('hidden');
  });
});

// Testimonials Carousel
const testimonials = [
  {
    avatar: "JD",
    name: "Juan dela Cruz",
    role: "Carpenter",
    rating: 5,
    text: "LocalWorks changed my life! I used to wait at the kanto for work, now I get job offers directly on my phone. I've tripled my income in just 3 months."
  },
  {
    avatar: "MS",
    name: "Maria Santos",
    role: "Homeowner",
    rating: 5,
    text: "Finding reliable workers was always a challenge. With LocalWorks, I found a skilled electrician within hours. The quality of work was excellent!"
  },
  {
    avatar: "PR",
    name: "Pedro Reyes",
    role: "Plumber",
    rating: 5,
    text: "The platform is so easy to use. Even my lola could navigate it! I love how it connects me with clients right in my barangay."
  },
  {
    avatar: "AG",
    name: "Ana Garcia",
    role: "Business Owner",
    rating: 5,
    text: "I needed workers for my small restaurant renovation. LocalWorks helped me find a team of masons and painters who did an amazing job on budget."
  }
];

let currentIndex = 0;

const testimonialAvatar = document.getElementById('testimonialAvatar');
const testimonialRating = document.getElementById('testimonialRating');
const testimonialText = document.getElementById('testimonialText');
const authorName = document.getElementById('authorName');
const authorRole = document.getElementById('authorRole');
const dotsContainer = document.getElementById('dots');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

function updateTestimonial(index) {
  const testimonial = testimonials[index];
  
  // Update content with fade effect
  const content = document.getElementById('testimonialContent');
  content.style.opacity = '0';
  content.style.transform = 'translateY(10px)';
  
  setTimeout(() => {
    testimonialAvatar.textContent = testimonial.avatar;
    testimonialText.textContent = `"${testimonial.text}"`;
    authorName.textContent = testimonial.name;
    authorRole.textContent = testimonial.role;
    
    // Update rating stars
    testimonialRating.innerHTML = '';
    for (let i = 0; i < testimonial.rating; i++) {
      const star = document.createElement('span');
      star.className = 'star';
      star.textContent = '★';
      testimonialRating.appendChild(star);
    }
    
    content.style.opacity = '1';
    content.style.transform = 'translateY(0)';
  }, 200);
  
  // Update dots
  const dots = dotsContainer.querySelectorAll('.dot');
  dots.forEach((dot, i) => {
    if (i === index) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
  
  currentIndex = index;
}

function nextTestimonial() {
  const newIndex = (currentIndex + 1) % testimonials.length;
  updateTestimonial(newIndex);
}

function prevTestimonial() {
  const newIndex = (currentIndex - 1 + testimonials.length) % testimonials.length;
  updateTestimonial(newIndex);
}

// Event listeners
nextBtn.addEventListener('click', nextTestimonial);
prevBtn.addEventListener('click', prevTestimonial);

// Dot navigation
const dots = dotsContainer.querySelectorAll('.dot');
dots.forEach(dot => {
  dot.addEventListener('click', () => {
    const index = parseInt(dot.dataset.index);
    updateTestimonial(index);
  });
});

// Add transition styles
const testimonialContent = document.getElementById('testimonialContent');
testimonialContent.style.transition = 'opacity 0.2s ease, transform 0.2s ease';

// Auto-advance testimonials every 5 seconds
let autoAdvance = setInterval(nextTestimonial, 5000);

// Pause auto-advance on hover
const testimonialCard = document.querySelector('.testimonial-card');
testimonialCard.addEventListener('mouseenter', () => {
  clearInterval(autoAdvance);
});

testimonialCard.addEventListener('mouseleave', () => {
  autoAdvance = setInterval(nextTestimonial, 5000);
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});
