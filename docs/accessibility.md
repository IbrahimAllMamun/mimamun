# Accessibility

The public site and the admin target **WCAG 2.2 level AA**. Accessibility is
built into the shared components and checked automatically (axe-core in
Playwright) on every pull request.

## Structure and navigation

- `<html lang="en-GB">`, one `<h1>` per page and headings in order. Section
  numbers on long pages are part of the heading text, not only decoration.
- Landmarks: header with the **Primary** navigation, `main`, footer, and a
  breadcrumb `nav` on detail pages. Case studies add an in-page contents
  navigation.
- A **Skip to content** link is the first focusable element on public pages.
- On small screens the navigation opens in a native modal `<dialog>`: focus
  moves into it and stays there, Escape closes it, and focus returns to the
  menu button.
- Filters, search and pagination keep their state in the URL, so the back
  button and shared links behave as expected.

## Keyboard and focus

- Everything interactive is reachable and operable with the keyboard, in
  reading order. There are no keyboard traps outside modal dialogs.
- Focus is always visible: a 2 px outline in the accent colour with an
  offset, defined once in `styles/base.css` (`:focus-visible`) and checked
  for contrast in both themes.
- Admin dialogs (confirmations, the media picker, global search, the small-
  screen sidebar) use native `<dialog>` with the same focus behaviour;
  reordering lists works with arrow buttons as well as drag and drop, and
  content blocks move with buttons.
- Keyboard shortcuts in the admin (`Ctrl/⌘ K`, `Ctrl/⌘ S`) only add to
  controls that are also available as buttons.

## Colour and contrast

- Colour tokens were chosen for contrast: body text and interactive text meet
  4.5:1, large text and UI boundaries at least 3:1, in both the light and the
  dark theme (`design-system.md` lists the pairs).
- Colour never carries meaning alone: statuses have text labels, the current
  role has a "Current role" badge as well as a filled marker, charts use
  shapes, dash patterns and direct labels in addition to colour.
- The theme follows the operating system until the visitor chooses one; the
  choice is stored in a `theme` cookie so the page renders in it without a
  flash.

## Motion

Motion is limited to short transform and opacity transitions that explain a
change (entering content, opening menus, filter results). With
`prefers-reduced-motion: reduce` every animation and transition is disabled
(`styles/motion.css`) and nothing waits on an animation to become visible.
The E2E, accessibility and visual tests run with reduced motion.

## Touch and zoom

- Touch targets are at least 44 px tall on touch screens. Public-site
  controls use `min-h-11` everywhere; denser controls (small buttons, admin
  filters and menus, the case-study contents) are 32–40 px with a mouse and
  grow to 44 px under `pointer: coarse` (`pointer-coarse:min-h-11`).
- Layouts reflow from 360 px upwards without horizontal scrolling; zoom is
  never disabled; text uses relative units.

## Content

- **Images**: uploads carry alt text in the media library; image blocks can
  override it per use. Purely decorative images and icons are hidden from
  assistive technology (`alt=""`, `aria-hidden`), and icon-only buttons have
  accessible names.
- **Charts** are SVG with `role="img"`, a title and a description, visible
  axis labels, and a **View data as a table** disclosure with the underlying
  numbers. The CMS requires the title and description.
- **Tables** have header cells, and a caption when the editor provides one.
- **Links** describe their destination; links to other sites open in a new
  tab and say so to screen readers.
- **Video embeds** have titles; nothing plays automatically.

## Forms

- Every field has a visible label. Required fields show a visible asterisk
  (hidden from screen readers, which get the `required` state instead).
- Errors appear next to the field, are linked with `aria-describedby` and
  set `aria-invalid`. The contact form also moves focus to the first invalid
  field, or to the confirmation after sending.
- Status messages (a sent contact message, admin toasts) are announced
  through a polite live region.
- The contact form works without JavaScript (a server action with the same
  validation), with the same messages.

## The admin

The admin follows the same rules and stays usable at 360 px: the sidebar
becomes a drawer, list tables drop secondary columns, and every action
remains reachable. Axe checks run on the dashboard, a content list, the media
library, messages and settings.

## Testing

- `e2e/a11y/a11y.spec.ts` runs axe-core with the WCAG 2.0, 2.1 and 2.2 A/AA
  rules on 13 public pages in light and dark mode, the sign-in page and five
  admin screens. Serious and critical violations fail the build.
- `e2e/tests/public.spec.ts` checks the skip link and keyboard access.
- Manual checks worth repeating after larger changes: keyboard-only use of a
  full flow (filter projects, open a case study, send a message), a screen
  reader pass (VoiceOver or NVDA) on the home page and a case study, 200%
  zoom, and 360 px width.
