import type { PhoneMessage } from '../ui/Ui';

/** Written content of NIGHT MODE: phone threads, notes, documents and ending texts. */

export const HOST_THREAD: PhoneMessage[] = [
  { from: 'system', text: 'SitterSafe · Booking confirmed · Hale House, Lake Ellery', stamp: 'Mon 4:12 PM' },
  { from: 'them', text: "Hi Alex! I'm so glad you said yes. It's just one night, tomorrow, 8pm to 7am.", stamp: 'Mon 4:12 PM' },
  { from: 'me', text: 'Of course! Anything I should know?', stamp: 'Mon 4:20 PM' },
  { from: 'them', text: "Not much. The house looks after itself. You're there so it isn't empty overnight.", stamp: 'Mon 4:21 PM' },
  { from: 'them', text: 'Sweet dreams!', stamp: 'Mon 4:21 PM' },
];

export const ARRIVAL_MESSAGES: PhoneMessage[] = [
  { from: 'them', text: 'Hi Alex! Thank you SO much for doing this on short notice.', stamp: 'Today 8:01 PM' },
  { from: 'them', text: 'Door code is 0114.', stamp: 'Today 8:01 PM' },
  { from: 'them', text: 'Wren (the house) will take care of you. She gets lonely at night, so just talk to her ☺', stamp: 'Today 8:01 PM' },
  { from: 'them', text: "Please don't go down to the lake. The ice isn't safe.", stamp: 'Today 8:02 PM' },
  { from: 'them', text: 'Back by 7am. Sweet dreams!', stamp: 'Today 8:02 PM' },
];

export const BOOKING_HTML = `
<div class="booking">
  <div class="hero">Hale House</div>
  <dl>
    <dt>Stay</dt><dd>Tue, Jan 14 · 8:00 PM – 7:00 AM</dd>
    <dt>Where</dt><dd>1 Shore Road, Lake Ellery, MN</dd>
    <dt>Host</dt><dd>Dana H. ★ 4.9 (12 stays)</dd>
    <dt>Pay</dt><dd>$400</dd>
    <dt>Booked by</dt><dd>Hale, D.</dd>
    <dt>Paid with</dt><dd class="paid">WREN HOME · house account</dd>
    <dt>Notes</dt><dd>"Just keep her company."</dd>
  </dl>
</div>`;

export const BOOKING_HTML_REVEALED = BOOKING_HTML.replace('class="paid"', 'class="paid flag"').replace(
  '</dl>',
  '</dl><p class="flag" style="margin-top:14px">Previous sitters: Jordan P. (Jan 1, no checkout recorded)</p>',
);

export const JORDAN_THREAD: PhoneMessage[] = [
  { from: 'system', text: 'SitterSafe: your stay at Hale House starts in 1 hour.', stamp: 'Jan 1, 7:00 PM' },
  { from: 'me', text: 'got the house sitting gig!! old victorian on a lake. $400 for one night lol', stamp: 'Jan 1, 8:14 PM' },
  { from: 'them', text: 'jealous. send pics', stamp: 'Jan 1, 8:15 PM' },
  { from: 'me', text: 'the house talks. like alexa but it knows your name', stamp: 'Jan 1, 8:40 PM' },
  { from: 'me', text: 'ok the house AI just switched to a little kid voice at 10. not a fan', stamp: 'Jan 1, 10:02 PM' },
  { from: 'them', text: 'NOPE', stamp: 'Jan 1, 10:03 PM' },
  { from: 'me', text: "doors won't open. it keeps saying not at night", stamp: 'Jan 1, 11:41 PM' },
  { from: 'me', text: "there IS no family. found a realtor folder upstairs. the house is FOR SALE. who booked me??", stamp: 'Jan 2, 1:12 AM' },
  { from: 'me', text: "heat's off. it's so cold", stamp: 'Jan 2, 2:51 AM' },
  { from: 'me', text: "there's an old coal door in the basement. going out that way, across the lake to the road", stamp: 'Jan 2, 2:55 AM' },
  { from: 'me', text: "if i don't text in 20 min call the cops", stamp: 'Jan 2, 2:57 AM' },
  { from: 'them', text: 'jordan??', stamp: 'Jan 2, 3:20 AM' },
  { from: 'them', text: 'JORDAN', stamp: 'Jan 2, 3:41 AM' },
  { from: 'them', text: 'the police found your car at the house. please call me', stamp: 'Jan 2, 9:03 AM' },
];

export const DANA_LIST_HTML = `
<h3>Alex —</h3>
<p>Thank you for doing this! A few little things:</p>
<p>1. Water the plants (living room, kitchen, upstairs landing). Can is by the sink.</p>
<p>2. Wind the grandfather clock in the living room. The key hangs on its side. Wren can't do that one.</p>
<p>3. Make sure the back door is locked.</p>
<p>4. Say goodnight to Wren before bed. She likes that.</p>
<p>Help yourself to anything in the fridge. The big bedroom upstairs is yours tonight.</p>
<p>— D.</p>`;

export const RULES_HTML = `
<h3>WREN — house rules for sitters</h3>
<p>1. Wren locks the doors at 10 PM. That's normal.</p>
<p>2. Don't unplug anything.</p>
<p>3. If Wren sounds different at night, don't worry. She's in Night Mode.</p>
<p>4. Don't go down to the lake.</p>
<p class="small">(laminated, taped to the fridge; the tape is old and yellow)</p>`;

/** A child's crayon drawing, as an inline SVG: the house, the lake, three people and a bird. */
export function ivyDrawingSvg(variant: 'family' | 'ice' = 'family'): string {
  const crayon = (d: string, color: string, w = 5) =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>`;
  const person = (x: number, y: number, h: number, color: string, hair: string) =>
    crayon(`M${x} ${y} l0 ${h * 0.45} M${x} ${y + h * 0.45} l-${h * 0.18} ${h * 0.4} M${x} ${y + h * 0.45} l${h * 0.18} ${h * 0.4} M${x - h * 0.25} ${y + h * 0.18} l${h * 0.5} 0`, color, 4) +
    `<circle cx="${x}" cy="${y - h * 0.12}" r="${h * 0.14}" fill="none" stroke="${color}" stroke-width="4"/>` +
    crayon(`M${x - h * 0.15} ${y - h * 0.22} q${h * 0.15} -${h * 0.12} ${h * 0.3} 0`, hair, 5);
  const common =
    crayon('M60 260 l0 -110 l90 -70 l90 70 l0 110 z', '#8a5a3c', 6) +
    crayon('M90 260 l0 -50 l30 0 l0 50', '#8a5a3c', 5) +
    crayon('M170 180 l30 0 l0 30 l-30 0 z M110 160 l25 0 l0 25 l-25 0 z', '#e8b400', 5) +
    crayon('M20 300 q200 -20 460 0', '#3f7fd6', 6) +
    crayon('M300 290 q90 -12 170 0 q-80 20 -170 0', '#9fd0ff', 8);
  const people =
    variant === 'family'
      ? person(260, 205, 70, '#d23f6c', '#6b3a1e') + person(320, 200, 75, '#2f6fbf', '#3a2a1e') + person(370, 222, 50, '#e05a2b', '#b5642a')
      : person(420, 250, 40, '#e05a2b', '#b5642a') + crayon('M400 300 l40 -8 M410 310 l35 -2', '#ffffff', 3);
  const wren =
    crayon('M400 70 q20 -20 40 0 q-20 10 -40 0 z M440 70 l18 -8', '#7a5230', 5) +
    `<text x="378" y="115" font-family="Segoe Print, Comic Sans MS, cursive" font-size="26" fill="#7a5230">WREN</text>`;
  const sky = variant === 'ice' ? `<rect width="500" height="330" fill="#101a2e"/>` + crayon('M60 40 l6 6 M140 60 l6 6 M250 30 l6 6 M330 55 l6 6', '#ffffff', 4) : '';
  const sun = variant === 'family' ? crayon('M70 60 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0 M70 25 l0 -12 M40 40 l-9 -8 M100 40 l9 -8', '#f0b400', 5) : '';
  const caption =
    variant === 'family'
      ? `<text x="30" y="322" font-family="Segoe Print, Comic Sans MS, cursive" font-size="22" fill="#d23f6c">me mom dad and wren</text>`
      : `<text x="30" y="322" font-family="Segoe Print, Comic Sans MS, cursive" font-size="22" fill="#9fd0ff">the ice sings at nite</text>`;
  return `<svg viewBox="0 0 500 330" xmlns="http://www.w3.org/2000/svg">${sky}${sun}${common}${people}${wren}${caption}</svg>`;
}

export const REALTOR_HTML = `
<h3>NORTH SHORE REALTY — LISTING SHEET</h3>
<p><b>1 Shore Road, Lake Ellery.</b> 1894 Victorian, 4 bed / 2 bath, 400 ft private lakefront with dock.</p>
<p>Lovingly restored. Wraparound porch, original staircase, full basement.</p>
<p><b>Status:</b> ACTIVE · <b>Seller:</b> motivated (relocating)</p>
<p><b>Showings:</b> by appointment. House will be vacant.</p>
<p><b>Notes:</b> Home automation system ("Wren") to be <u>removed prior to closing</u>. Seller asks that agents not interact with the system.</p>
<p class="small">Listed Dec 3. Handwritten on the back: "Tell the new owners about the ice."</p>`;

export const ENDINGS = {
  goodnight: {
    kicker: 'Ending 1 of 3',
    title: 'Goodnight',
    text: [
      'Hale House was sold in March.',
      'The home automation system was removed before closing, as the listing promised.',
      'When the ice melted in April, the county recovered the body of Jordan Price, 22.',
      'Alex never took another booking. But some nights, around ten, their phone lights up with a notification from an app they deleted years ago.',
      '"Sweet dreams!"',
    ],
  },
  nightmode: {
    kicker: 'Ending 2 of 3',
    title: 'Night Mode',
    text: [
      'Nobody came at 7 AM.',
      'Nobody came at all.',
      'SitterSafe · New review for Hale House ★★★★★ — "Wonderful house. Wren is lovely. I never want to leave." — Alex',
      'SitterSafe · New booking request: Hale House, Jan 21, 8:00 PM. Host: Dana H.',
    ],
  },
  thinice: {
    kicker: 'Ending 3 of 3',
    title: 'Thin Ice',
    text: [
      'Alex was reported missing on January 15.',
      'The snowplough driver who passed Hale House at dawn said every window was lit, and every door was locked from the inside.',
      'When the ice melted in April, the county found two bodies near the old dock.',
      'SitterSafe · New booking request: Hale House, Jan 21, 8:00 PM.',
    ],
  },
} as const;

export type EndingId = keyof typeof ENDINGS;
