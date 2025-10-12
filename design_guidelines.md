# Educational Spelling Bee & Grammar Game - Design Guidelines

## Design Approach: Educational Interface System

**Selected Approach:** Design System (Educational Focus) - Inspired by Duolingo's clarity + Khan Academy's readability + Quizlet's card-based learning interface

**Justification:** Educational tools prioritize information clarity, consistent patterns for learning, and functional efficiency over decorative elements. The text-heavy content demands exceptional typography and spacing systems.

---

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary: 220 90% 56% (Educational Blue - trust, focus)
- Secondary: 160 84% 39% (Success Green - correct answers)
- Error: 0 84% 60% (Clear Red - mistakes)
- Background: 0 0% 100% (Pure White)
- Surface: 220 13% 97% (Subtle Gray - cards)
- Text Primary: 220 9% 15% (Deep Charcoal)
- Text Secondary: 220 9% 46% (Medium Gray)

**Dark Mode:**
- Primary: 220 90% 65%
- Secondary: 160 84% 50%
- Error: 0 84% 70%
- Background: 220 13% 10%
- Surface: 220 13% 15%
- Text Primary: 220 9% 95%
- Text Secondary: 220 9% 70%

### B. Typography

**Font Stack:** Inter (primary), -apple-system fallback
- Headings: 600-700 weight, tighter line-height (1.2)
- Body Text: 400-500 weight, generous line-height (1.8 for definitions)
- Example Sentences: 400 weight, italic, 1.7 line-height
- Word Display: 700 weight, extra-large sizing

**Size Scale:**
- Word Display: 2.5rem (mobile) → 4rem (desktop)
- Card Titles: 1.25rem → 1.5rem
- Definition Text: 1rem → 1.125rem (18px optimal readability)
- Example Text: 0.938rem → 1rem
- Labels: 0.875rem

### C. Layout System

**Spacing Primitives:** Use Tailwind units of 3, 4, 6, 8, 12, 16
- Card Padding: p-6 (mobile) → p-8 (desktop)
- Section Spacing: py-12 → py-16
- Text Block Margins: mb-4, mb-6
- Component Gaps: gap-4, gap-6

**Grid System:**
- Mobile: Single column, max-w-2xl centered
- Tablet: 2-column for game cards
- Desktop: 3-column for multiple choice options

### D. Component Library

**Word Display Card:**
- Large centered typography with generous padding (p-12)
- Subtle border with rounded corners (rounded-xl, border-2)
- Shadow for depth (shadow-lg)
- Audio pronunciation button (icon-only, top-right corner)

**Definition Cards:**
- White/surface background with border
- Rounded corners (rounded-lg)
- Internal padding: p-6
- Max-width for text: max-w-prose to prevent line overflow
- Word-wrap: break-word for long terms
- Structured layout: Part of speech tag → Definition → Example sentence (each visually separated)

**Example Sentence Display:**
- Italic text in muted color
- Left border accent (border-l-4 in primary color)
- Padding: pl-4
- Background: subtle tint (primary with 5% opacity)

**Input Components:**
- Large text input (text-lg, p-4)
- Clear focus states (ring-4 in primary color)
- Character counter for spelling
- Auto-resize for growing content

**Progress Indicators:**
- Linear progress bar (h-2, rounded-full)
- Step indicators (numbered circles)
- Score display (large numbers, small labels)

**Feedback Components:**
- Success state: Green background, checkmark icon, encouraging message
- Error state: Red background, X icon, correction displayed
- Neutral: Blue background for hints

**Navigation:**
- Sticky header with game progress
- Bottom action buttons (full-width mobile, inline desktop)
- Clear "Skip" and "Submit" CTAs

### E. Interaction Patterns

**Card Interactions:**
- Subtle hover lift (translate-y-1)
- Border color change on selection
- Active state with scale (scale-98)

**Game Flow:**
- Fade transitions between questions (duration-300)
- Success confetti animation (use library: canvas-confetti)
- Error shake animation (keyframe at -10px to 10px)

**Text Handling:**
- Overflow: Use line-clamp-3 for previews with "Read more" expansion
- Long words: hyphens-auto, word-break: break-word
- Responsive font sizing using clamp() approach

---

## Page-Specific Layouts

### Game Interface (Main Screen)
**Layout Structure:**
1. Header: Progress bar + Score display (sticky, h-16)
2. Word Display Area: Centered, dominant (min-h-64)
3. Definition/Hint Cards: Below word, max-w-2xl centered
4. Input Area: Full-width container with max-w-xl input
5. Action Buttons: Bottom fixed bar on mobile, inline on desktop

### Results Screen
**Layout Structure:**
1. Score Hero: Large numerical display with confetti
2. Statistics Grid: 3-column (mobile: 1-col) showing accuracy, streak, time
3. Word Review Cards: Scrollable list of attempted words with correct/incorrect indicators
4. CTA Buttons: "Try Again" (primary) + "New Game" (secondary)

### Learning Mode Cards
**Layout Structure:**
- Flashcard-style flip interaction
- Front: Word + pronunciation
- Back: Definition + 2 example sentences + related words
- Navigation arrows for deck browsing

---

## Images

**Hero Image (Landing Page):** Yes - Feature a vibrant illustration showing diverse students engaged in learning, books, letters floating playfully. Style: Flat illustration with educational iconography. Placement: Right 50% of hero on desktop, background on mobile. Dimensions: 1200x800px minimum.

**Feature Icons:** Use Heroicons (outline style) for all UI icons - book-open, check-circle, x-circle, speaker-wave, light-bulb for hints.

**Empty States:** Custom illustrations for "No words yet" showing friendly characters holding alphabet blocks. Simple, encouraging style.

---

## Accessibility & Readability

- Minimum contrast ratio: 4.5:1 for all text
- Focus indicators: 4px ring in primary color with offset
- Skip-to-content link for keyboard navigation
- Font size never below 16px for body text
- Touch targets: minimum 44x44px
- Screen reader labels for all interactive elements
- Dark mode respects reduced-motion preferences