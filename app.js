(function () {
  const card = document.getElementById("card");
  const face = document.getElementById("face");
  const eyeL = document.querySelector("#eyeL .pupil");
  const eyeR = document.querySelector("#eyeR .pupil");
  const form = document.getElementById("profileForm");
  const nameInput = document.getElementById("name");
  const handleInput = document.getElementById("handle");
  const dobField = document.getElementById("dobField");
  const dobInput = document.getElementById("dobInput");
  const dateTrigger = document.getElementById("dateTrigger");
  const dateDisplay = document.getElementById("dateDisplay");
  const calendarEl = document.getElementById("calendar");
  const signupCluster = document.getElementById("signupCluster");
  const dayInput = document.getElementById("dayInput");
  const monthInput = document.getElementById("monthInput");
  const yearInput = document.getElementById("yearInput");
  const ageDoneBtn = document.getElementById("ageDoneBtn");
  const closeCalendarBtn = document.getElementById("closeCalendar");

  const submitBtn = document.getElementById("submitBtn");
  const toast = document.getElementById("toast");
  const canvas = document.getElementById("confetti");
  const ctx = canvas.getContext("2d");

  // PFP Elements
  const topRow = document.getElementById("topRow");
  const pfpTrigger = document.getElementById("pfpTrigger");
  const pfpPreview = document.getElementById("pfpPreview");
  const pfpSidebar = document.getElementById("pfpSidebar");
  const closePfp = document.getElementById("closePfp");
  const pfpGrid = document.getElementById("pfpGrid");
  const pfpUpload = document.getElementById("pfpUpload");
  const pfpSelectView = document.getElementById("pfpSelectView");
  const pfpEditView = document.getElementById("pfpEditView");
  const editorCanvas = document.getElementById("editorCanvas");
  const editorCtx = editorCanvas.getContext("2d");
  const btnRotateC = document.getElementById("btnRotateC");
  const btnFlipH = document.getElementById("btnFlipH");
  const valBrightness = document.getElementById("valBrightness");
  const valContrast = document.getElementById("valContrast");
  const btnCancelEdit = document.getElementById("btnCancelEdit");
  const btnSaveEdit = document.getElementById("btnSaveEdit");

  // Design View Elements
  const pfpDesignView = document.getElementById("pfpDesignView");
  const designPreviewContainer = document.getElementById("designPreviewContainer");
  const categoryCarousel = document.getElementById("categoryCarousel");
  const categoryStrip = document.getElementById("categoryStrip");
  const designOptionsGrid = document.getElementById("designOptionsGrid");
  const btnCancelDesign = document.getElementById("btnCancelDesign");
  const btnSaveDesign = document.getElementById("btnSaveDesign");

  let pfpOpen = false;
  let pfpBlob = null;

  // Custom Avatar State
  const avatarState = {
    face: "classic",
    eye: "standard",
    brows: "standard",
    blush: "standard",
    glasses: "none",
    masks: "none",
    mouth: "happy",
    hair: "none",
    nose: "none",
    extras: "none",
    colors: {
      bg: "ffd6ea",
      body: "ffeef6",
      hair: "ff7eb3",
      eye: "2d3436",
      line: "2d3436",
      blush: "ff7eb3"
    }
  };

  const AVATAR_PARTS = {
    face: {
      classic: `<path d="M10 40 Q50 10 90 40 Q95 80 50 90 Q5 80 10 40Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      round: `<circle cx="50" cy="50" r="40" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      squat: `<path d="M15 35 Q50 25 85 35 L80 85 Q50 95 20 85Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      tall: `<path d="M25 20 Q50 10 75 20 L75 85 Q50 95 25 85Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      blob: `<path d="M10 50 Q10 10 50 10 Q90 10 90 50 Q90 90 50 90 Q10 90 10 50 Z M20 50 Q20 30 50 30 Q80 30 80 50 Q80 70 50 70 Q20 70 20 50 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2" fill-rule="evenodd"/>`,
      bean: `<path d="M30 20 Q50 10 70 20 Q80 40 75 60 Q70 90 50 90 Q30 90 25 60 Q20 40 30 20 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      egg: `<path d="M50 10 Q85 10 85 55 Q85 90 50 90 Q15 90 15 55 Q15 10 50 10 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      boxy: `<rect x="15" y="15" width="70" height="70" rx="25" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      pear: `<path d="M50 15 Q65 15 70 40 Q85 70 75 85 Q50 95 25 85 Q15 70 30 40 Q35 15 50 15 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      peanut: `<path d="M50 10 Q75 10 70 35 Q60 50 70 65 Q75 90 50 90 Q25 90 30 65 Q40 50 30 35 Q25 10 50 10 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      heart: `<path d="M50 85 C-10 45 40 5 50 15 C60 5 110 45 50 85 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      pentagon: `<path d="M50 10 L85 35 L75 85 H25 L15 35 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      octagon: `<path d="M35 15 H65 L85 35 V65 L65 85 H35 L15 65 V35 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      diamond: `<path d="M50 10 L85 50 L50 90 L15 50 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      vessel: `<path d="M20 20 Q50 10 80 20 Q90 60 70 85 Q50 95 30 85 Q10 60 20 20 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      shield: `<path d="M20 20 H80 V60 Q80 90 50 95 Q20 90 20 60 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      cone: `<path d="M50 10 L85 85 H15 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      pillar: `<rect x="30" y="10" width="40" height="80" rx="20" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      curvy: `<path d="M20 30 Q30 20 50 20 Q70 20 80 30 Q90 50 80 70 Q70 80 50 80 Q30 80 20 70 Q10 50 20 30 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      wafer: `<rect x="20" y="30" width="60" height="40" rx="15" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      tomb: `<path d="M20 85 V40 Q20 10 50 10 Q80 10 80 40 V85 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      teardrop: `<path d="M50 10 Q80 40 80 70 A30 30 0 0 1 20 70 Q20 40 50 10 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      flask: `<path d="M40 10 H60 V30 L85 85 H15 L40 30 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      pill: `<rect x="25" y="10" width="50" height="80" rx="25" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      gum: `<path d="M30 20 Q50 10 70 20 Q90 50 70 80 Q50 95 30 80 Q10 50 30 20 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      nut: `<path d="M50 10 L80 25 V60 L50 90 L20 60 V25 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      apple: `<path d="M50 30 Q70 15 85 35 Q90 70 50 90 Q10 70 15 35 Q30 15 50 30 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      gem: `<path d="M30 15 H70 L85 45 L50 90 L15 45 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      leaf: `<path d="M50 10 Q85 30 85 60 Q85 90 50 90 Q15 90 15 60 Q15 30 50 10 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`,
      wedge: `<path d="M20 20 H80 L70 85 Q50 95 30 85 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="2"/>`
    },
    eye: {
      standard: `
        <g class="avatar-eye">
          <circle cx="35" cy="45" r="5" fill="{eyeColor}"/>
          <circle cx="65" cy="45" r="5" fill="{eyeColor}"/>
          <circle cx="33" cy="43" r="2" fill="white"/>
          <circle cx="63" cy="43" r="2" fill="white"/>
        </g>`,
      happy: `
        <g class="avatar-eye">
          <path d="M30 45 Q35 40 40 45" stroke="{eyeColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M60 45 Q65 40 70 45" stroke="{eyeColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
        </g>`,
      winking: `
        <g class="avatar-eye">
          <circle cx="35" cy="45" r="5" fill="{eyeColor}"/>
          <path d="M60 45 Q65 50 70 45" stroke="{eyeColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
        </g>`,
      cool: `
        <g class="avatar-eye">
          <rect x="28" y="42" width="14" height="6" rx="2" fill="{eyeColor}"/>
          <rect x="58" y="42" width="14" height="6" rx="2" fill="{eyeColor}"/>
          <path d="M42 45 H58" stroke="{eyeColor}" stroke-width="2"/>
        </g>`,
      wide: `
        <g class="avatar-eye">
          <circle cx="35" cy="45" r="7" fill="white" stroke="{eyeColor}" stroke-width="1.5"/>
          <circle cx="65" cy="45" r="7" fill="white" stroke="{eyeColor}" stroke-width="1.5"/>
          <circle cx="35" cy="45" r="3" fill="{eyeColor}"/>
          <circle cx="65" cy="45" r="3" fill="{eyeColor}"/>
        </g>`,
      sleepy: `
        <g class="avatar-eye">
          <path d="M30 48 H40" stroke="{eyeColor}" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M60 48 H70" stroke="{eyeColor}" stroke-width="2.5" stroke-linecap="round"/>
        </g>`,
      starry: `
        <g class="avatar-eye">
          <path d="M35 38 L38 45 L45 45 L39 49 L41 56 L35 52 L29 56 L31 49 L25 45 L32 45 Z" fill="{eyeColor}"/>
          <path d="M65 38 L68 45 L75 45 L69 49 L71 56 L65 52 L59 56 L61 49 L55 45 L62 45 Z" fill="{eyeColor}"/>
        </g>`,
      spiral: `
        <g class="avatar-eye">
          <path d="M30 45 Q35 40 40 45 Q35 50 30 45 Q35 40 38 45" stroke="{eyeColor}" stroke-width="1.5" fill="none"/>
          <path d="M60 45 Q65 40 70 45 Q65 50 60 45 Q65 40 68 45" stroke="{eyeColor}" stroke-width="1.5" fill="none"/>
        </g>`,
      heart: `
        <g class="avatar-eye">
          <path d="M35 52 Q25 42 35 35 Q45 42 35 52" fill="#ff7eb3" stroke="#ff7eb3" stroke-width="1"/>
          <path d="M65 52 Q55 42 65 35 Q75 42 65 52" fill="#ff7eb3" stroke="#ff7eb3" stroke-width="1"/>
        </g>`,
      angry: `
        <g class="avatar-eye">
          <path d="M28 38 L42 45" stroke="{eyeColor}" stroke-width="3" stroke-linecap="round"/>
          <path d="M72 38 L58 45" stroke="{eyeColor}" stroke-width="3" stroke-linecap="round"/>
          <circle cx="35" cy="50" r="4" fill="{eyeColor}"/>
          <circle cx="65" cy="50" r="4" fill="{eyeColor}"/>
        </g>`,
      side: `
        <g class="avatar-eye">
          <circle cx="35" cy="45" r="5" fill="{eyeColor}"/>
          <circle cx="65" cy="45" r="5" fill="{eyeColor}"/>
          <circle cx="38" cy="43" r="2" fill="white"/>
          <circle cx="68" cy="43" r="2" fill="white"/>
        </g>`,
      crying: `
        <g class="avatar-eye">
          <circle cx="35" cy="45" r="5" fill="{eyeColor}"/>
          <circle cx="65" cy="45" r="5" fill="{eyeColor}"/>
          <path d="M35 52 Q35 60 30 65" stroke="#748ffc" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M65 52 Q65 60 70 65" stroke="#748ffc" stroke-width="2" fill="none" stroke-linecap="round"/>
        </g>`,
      dizzy: `
        <g class="avatar-eye">
          <path d="M30 40 L40 50 M40 40 L30 50" stroke="{eyeColor}" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M60 40 L70 50 M70 40 L60 50" stroke="{eyeColor}" stroke-width="2.5" stroke-linecap="round"/>
        </g>`,
      money: `
        <g class="avatar-eye">
          <text x="28" y="52" fill="{eyeColor}" font-family="Arial" font-weight="900" font-size="14">$</text>
          <text x="58" y="52" fill="{eyeColor}" font-family="Arial" font-weight="900" font-size="14">$</text>
        </g>`,
      oneopen: `
        <g class="avatar-eye">
          <circle cx="35" cy="45" r="5" fill="{eyeColor}"/>
          <path d="M60 45 Q65 40 70 45" stroke="{eyeColor}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </g>`,
      dots: `
        <g class="avatar-eye">
          <circle cx="35" cy="45" r="2" fill="{eyeColor}"/>
          <circle cx="65" cy="45" r="2" fill="{eyeColor}"/>
        </g>`,
      cross: `
        <g class="avatar-eye">
          <path d="M32 42 L38 48 M38 42 L32 48" stroke="{eyeColor}" stroke-width="2" stroke-linecap="round"/>
          <path d="M62 42 L68 48 M68 42 L62 48" stroke="{eyeColor}" stroke-width="2" stroke-linecap="round"/>
        </g>`,
      up: `
        <g class="avatar-eye">
          <circle cx="35" cy="45" r="5" fill="white" stroke="{eyeColor}" stroke-width="1"/>
          <circle cx="65" cy="45" r="5" fill="white" stroke="{eyeColor}" stroke-width="1"/>
          <circle cx="35" cy="42" r="2" fill="{eyeColor}"/>
          <circle cx="65" cy="42" r="2" fill="{eyeColor}"/>
        </g>`,
      down: `
        <g class="avatar-eye">
          <circle cx="35" cy="45" r="5" fill="white" stroke="{eyeColor}" stroke-width="1"/>
          <circle cx="65" cy="45" r="5" fill="white" stroke="{eyeColor}" stroke-width="1"/>
          <circle cx="35" cy="48" r="2" fill="{eyeColor}"/>
          <circle cx="65" cy="48" r="2" fill="{eyeColor}"/>
        </g>`,
      hypnotic: `
        <g class="avatar-eye">
          <circle cx="35" cy="45" r="6" fill="none" stroke="{eyeColor}" stroke-width="1"/>
          <circle cx="35" cy="45" r="3" fill="{eyeColor}"/>
          <circle cx="65" cy="45" r="6" fill="none" stroke="{eyeColor}" stroke-width="1"/>
          <circle cx="65" cy="45" r="3" fill="{eyeColor}"/>
        </g>`,
      glasses_dots: `
        <g class="avatar-eye">
          <rect x="25" y="40" width="20" height="10" rx="5" fill="white" stroke="{eyeColor}"/>
          <rect x="55" y="40" width="20" height="10" rx="5" fill="white" stroke="{eyeColor}"/>
          <circle cx="35" cy="45" r="2" fill="{eyeColor}"/>
          <circle cx="65" cy="45" r="2" fill="{eyeColor}"/>
        </g>`,
      closed_happy: `
        <g class="avatar-eye">
          <path d="M30 48 Q35 43 40 48" stroke="{eyeColor}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path d="M60 48 Q65 43 70 48" stroke="{eyeColor}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        </g>`,
      squint: `
        <g class="avatar-eye">
          <path d="M30 45 L40 45" stroke="{eyeColor}" stroke-width="3" stroke-linecap="round"/>
          <path d="M60 45 L70 45" stroke="{eyeColor}" stroke-width="3" stroke-linecap="round"/>
        </g>`,
      hollow: `
        <g class="avatar-eye">
          <circle cx="35" cy="45" r="5" fill="none" stroke="{eyeColor}" stroke-width="1.5"/>
          <circle cx="65" cy="45" r="5" fill="none" stroke="{eyeColor}" stroke-width="1.5"/>
        </g>`,
      glow: `
        <g class="avatar-eye">
          <circle cx="35" cy="45" r="5" fill="{eyeColor}"/>
          <circle cx="65" cy="45" r="5" fill="{eyeColor}"/>
          <circle cx="35" cy="45" r="8" fill="{eyeColor}" opacity="0.3"/>
          <circle cx="65" cy="45" r="8" fill="{eyeColor}" opacity="0.3"/>
        </g>`,
      tired: `
        <g class="avatar-eye">
          <circle cx="35" cy="45" r="5" fill="{eyeColor}"/>
          <circle cx="65" cy="45" r="5" fill="{eyeColor}"/>
          <path d="M28 52 Q35 55 42 52" stroke="{eyeColor}" stroke-width="1" fill="none"/>
          <path d="M58 52 Q65 55 72 52" stroke="{eyeColor}" stroke-width="1" fill="none"/>
        </g>`,
      tears: `
        <g class="avatar-eye">
          <circle cx="35" cy="45" r="5" fill="white" stroke="{eyeColor}" stroke-width="1"/>
          <circle cx="65" cy="45" r="5" fill="white" stroke="{eyeColor}" stroke-width="1"/>
          <path d="M35 50 Q35 55 33 58 Q35 55 37 58 Q35 55 35 50" fill="#339af0"/>
          <path d="M65 50 Q65 55 63 58 Q65 55 67 58 Q65 55 65 50" fill="#339af0"/>
        </g>`,
      half: `
        <g class="avatar-eye">
          <path d="M30 45 A5 5 0 0 1 40 45 L40 50 L30 50 Z" fill="{eyeColor}"/>
          <path d="M60 45 A5 5 0 0 1 70 45 L70 50 L60 50 Z" fill="{eyeColor}"/>
        </g>`,
      shining: `
        <g class="avatar-eye">
          <circle cx="35" cy="45" r="6" fill="{eyeColor}"/>
          <circle cx="65" cy="45" r="6" fill="{eyeColor}"/>
          <circle cx="33" cy="42" r="2.5" fill="white"/>
          <circle cx="63" cy="42" r="2.5" fill="white"/>
          <circle cx="37" cy="48" r="1.2" fill="white"/>
          <circle cx="67" cy="48" r="1.2" fill="white"/>
        </g>`,
      pixel: `
        <g class="avatar-eye">
          <rect x="32" y="42" width="6" height="6" fill="{eyeColor}"/>
          <rect x="62" y="42" width="6" height="6" fill="{eyeColor}"/>
        </g>`
    },
    brows: {
      none: ``,
      standard: `
        <path d="M30 35 Q35 32 40 35" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M60 35 Q65 32 70 35" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      angry: `
        <path d="M30 32 L42 38" stroke="{hairColor}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M70 32 L58 38" stroke="{hairColor}" stroke-width="2.5" stroke-linecap="round"/>`,
      worried: `
        <path d="M30 38 L42 32" stroke="{hairColor}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M70 38 L58 32" stroke="{hairColor}" stroke-width="2.5" stroke-linecap="round"/>`,
      flat: `
        <path d="M30 35 H42" stroke="{hairColor}" stroke-width="2" stroke-linecap="round"/>
        <path d="M58 35 H70" stroke="{hairColor}" stroke-width="2" stroke-linecap="round"/>`,
      bushy: `
        <path d="M28 35 Q35 30 42 35" stroke="{hairColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M58 35 Q65 30 72 35" stroke="{hairColor}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      dotted: `
        <circle cx="35" cy="32" r="2" fill="{hairColor}"/>
        <circle cx="65" cy="32" r="2" fill="{hairColor}"/>`,
      surprised: `
        <path d="M30 28 Q35 25 40 28" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M60 28 Q65 25 70 28" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      sad: `
        <path d="M30 32 Q35 38 40 32" stroke="{hairColor}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M60 32 Q65 38 70 32" stroke="{hairColor}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
      mono: `
        <path d="M30 32 Q50 30 70 32" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      blocky: `
        <rect x="28" y="30" width="14" height="4" rx="2" fill="{hairColor}"/>
        <rect x="58" y="30" width="14" height="4" rx="2" fill="{hairColor}"/>`,
      slant_up: `
        <path d="M30 38 L40 34" stroke="{hairColor}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M60 34 L70 38" stroke="{hairColor}" stroke-width="2.5" stroke-linecap="round"/>`,
      slant_down: `
        <path d="M32 32 L42 38" stroke="{hairColor}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M58 38 L68 32" stroke="{hairColor}" stroke-width="2.5" stroke-linecap="round"/>`,
      curved_up: `
        <path d="M30 30 Q35 25 40 30" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M60 30 Q65 25 70 30" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      curved_down: `
        <path d="M30 35 Q35 40 40 35" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M60 35 Q65 40 70 35" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      short_thick: `
        <path d="M33 35 H37" stroke="{hairColor}" stroke-width="5" stroke-linecap="round"/>
        <path d="M63 35 H67" stroke="{hairColor}" stroke-width="5" stroke-linecap="round"/>`,
      tilted: `
        <path d="M30 33 L40 30" stroke="{hairColor}" stroke-width="2" stroke-linecap="round"/>
        <path d="M60 30 L70 33" stroke="{hairColor}" stroke-width="2" stroke-linecap="round"/>`,
      arch: `
        <path d="M28 36 C32 28 38 28 42 36" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M58 36 C62 28 68 28 72 36" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      notched: `
        <path d="M30 35 L34 35 M37 35 L42 35" stroke="{hairColor}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M58 35 L63 35 M66 35 L70 35" stroke="{hairColor}" stroke-width="2.5" stroke-linecap="round"/>`,
      thick_arch: `
        <path d="M28 35 Q35 25 42 35" stroke="{hairColor}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M58 35 Q65 25 72 35" stroke="{hairColor}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      thin: `
        <path d="M30 34 H40" stroke="{hairColor}" stroke-width="1" stroke-linecap="round"/>
        <path d="M60 34 H70" stroke="{hairColor}" stroke-width="1" stroke-linecap="round"/>`,
      wavy: `
        <path d="M30 35 Q32 33 35 35 T40 35" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M60 35 Q62 33 65 35 T70 35" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      steep: `
        <path d="M30 38 L35 30 L40 38" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M60 38 L65 30 L70 38" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      pointy: `
        <path d="M32 32 L35 28 L38 32" stroke="{hairColor}" stroke-width="3" stroke-linecap="round"/>
        <path d="M62 32 L65 28 L68 32" stroke="{hairColor}" stroke-width="3" stroke-linecap="round"/>`,
      frown: `
        <path d="M30 30 Q35 32 40 30" stroke="{hairColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M60 30 Q65 32 70 30" stroke="{hairColor}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      raised_one: `
        <path d="M30 25 Q35 22 40 25" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M60 35 Q65 38 70 35" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      low: `
        <path d="M30 38 Q35 36 40 38" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M60 38 Q65 36 70 38" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      swept: `
        <path d="M30 32 C35 32 42 38 42 38" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M70 32 C65 32 58 38 58 38" stroke="{hairColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      combed: `
        <path d="M30 35 L40 32" stroke="{hairColor}" stroke-width="2" stroke-linecap="round"/>
        <path d="M60 32 L70 35" stroke="{hairColor}" stroke-width="2" stroke-linecap="round"/>`,
      bold: `
        <path d="M28 34 H42" stroke="{hairColor}" stroke-width="5" stroke-linecap="round"/>
        <path d="M58 34 H72" stroke="{hairColor}" stroke-width="5" stroke-linecap="round"/>`
    },
    nose: {
      none: ``,
      standard: `<path d="M48 55 Q50 58 52 55" stroke="{lineColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      round: `<circle cx="50" cy="56" r="2.5" fill="{lineColor}" opacity="0.3"/>`,
      pointy: `<path d="M50 52 L53 58 L47 58 Z" fill="{bodyColor}" stroke="{lineColor}" stroke-width="1"/>`,
      nostrils: `
        <circle cx="47" cy="58" r="1" fill="{lineColor}"/>
        <circle cx="53" cy="58" r="1" fill="{lineColor}"/>`,
      pig: `
        <ellipse cx="50" cy="58" rx="5" ry="3" fill="{blushColor}" opacity="0.3" stroke="{lineColor}" stroke-width="1"/>
        <circle cx="48" cy="58" r="1" fill="{lineColor}"/>
        <circle cx="52" cy="58" r="1" fill="{lineColor}"/>`,
      button: `<circle cx="50" cy="56" r="3" fill="{lineColor}" opacity="0.1"/>`,
      bridge: `<path d="M48 48 V58 H52" stroke="{lineColor}" stroke-width="1.5" fill="none"/>`,
      curved: `<path d="M46 58 Q50 62 54 58" stroke="{lineColor}" stroke-width="2" fill="none"/>`,
      triangle: `<path d="M50 54 L54 60 H46 Z" fill="none" stroke="{lineColor}" stroke-width="1.5"/>`,
      dots: `
        <circle cx="49" cy="58" r="1" fill="{lineColor}" opacity="0.5"/>
        <circle cx="51" cy="58" r="1" fill="{lineColor}" opacity="0.5"/>`,
      wide: `<path d="M44 58 Q50 62 56 58" stroke="{lineColor}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
      long: `<path d="M50 45 V58" stroke="{lineColor}" stroke-width="1.5"/>`,
      blob_nose: `<ellipse cx="50" cy="57" rx="4" ry="2.5" fill="{bodyColor}" stroke="{lineColor}" stroke-width="1"/>`,
      heart_nose: `<path d="M50 60 Q45 55 50 52 Q55 55 50 60" fill="{blushColor}" opacity="0.5"/>`,
      flat_nose: `<path d="M45 58 H55" stroke="{lineColor}" stroke-width="2" stroke-linecap="round"/>`,
      hook: `<path d="M50 50 Q55 55 50 60" stroke="{lineColor}" stroke-width="2" fill="none"/>`,
      upturned: `<path d="M48 58 Q50 54 52 58" stroke="{lineColor}" stroke-width="2" fill="none"/>`,
      snout: `
        <ellipse cx="50" cy="62" rx="7" ry="5" fill="{bodyColor}" stroke="{lineColor}" stroke-width="1"/>
        <circle cx="47" cy="62" r="1.5" fill="{lineColor}"/>
        <circle cx="53" cy="62" r="1.5" fill="{lineColor}"/>`,
      droplet: `<path d="M50 52 Q53 58 50 62 Q47 58 50 52" fill="none" stroke="{lineColor}" stroke-width="1"/>`,
      split: `
        <path d="M48 58 Q48 60 49 60 M52 58 Q52 60 51 60" stroke="{lineColor}" stroke-width="1.5" fill="none"/>`,
      shadowed: `<ellipse cx="50" cy="58" rx="6" ry="2" fill="black" opacity="0.05"/>`,
      tiny: `<circle cx="50" cy="58" r="0.8" fill="{lineColor}"/>`,
      clown: `<circle cx="50" cy="58" r="5" fill="#f03e3e"/>`,
      viking: `<path d="M45 50 L50 60 L55 50" stroke="{lineColor}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
      aesthetic: `<path d="M48 55 L50 57 L52 55" stroke="{lineColor}" stroke-width="1" fill="none"/>`,
      bold_nose: `<path d="M47 58 H53" stroke="{lineColor}" stroke-width="4" stroke-linecap="round"/>`,
      minimal: `<path d="M50 55 V57" stroke="{lineColor}" stroke-width="2" stroke-linecap="round"/>`,
      classic_l: `<path d="M50 50 V60 H55" stroke="{lineColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      cross_nose: `<path d="M48 56 L52 60 M52 56 L48 60" stroke="{lineColor}" stroke-width="1"/>`,
      cat_nose: `<path d="M50 60 L53 57 H47 Z" fill="{lineColor}"/>`
    },
    blush: {
      none: ``,
      standard: `
        <ellipse cx="30" cy="55" rx="8" ry="4" fill="{blushColor}" opacity="0.3"/>
        <ellipse cx="70" cy="55" rx="8" ry="4" fill="{blushColor}" opacity="0.3"/>`,
      heart: `
        <path d="M30 62 Q22 55 30 50 Q38 55 30 62" fill="{blushColor}" opacity="0.3"/>
        <path d="M70 62 Q62 55 70 50 Q78 55 70 62" fill="{blushColor}" opacity="0.3"/>`,
      star: `
        <path d="M30 50 L32 55 L38 55 L33 58 L35 63 L30 60 L25 63 L27 58 L22 55 L28 55 Z" fill="{blushColor}" opacity="0.3"/>
        <path d="M70 50 L72 55 L78 55 L73 58 L75 63 L70 60 L65 63 L67 58 L62 55 L68 55 Z" fill="{blushColor}" opacity="0.3"/>`,
      round: `
        <circle cx="30" cy="55" r="5" fill="{blushColor}" opacity="0.3"/>
        <circle cx="70" cy="55" r="5" fill="{blushColor}" opacity="0.3"/>`,
      stripes: `
        <path d="M25 55 L35 52 M25 60 L35 57" stroke="{blushColor}" stroke-width="2" opacity="0.4" stroke-linecap="round"/>
        <path d="M65 55 L75 52 M65 60 L75 57" stroke="{blushColor}" stroke-width="2" opacity="0.4" stroke-linecap="round"/>`,
      dots: `
        <circle cx="28" cy="55" r="1.5" fill="{blushColor}" opacity="0.5"/>
        <circle cx="33" cy="58" r="1.5" fill="{blushColor}" opacity="0.5"/>
        <circle cx="67" cy="55" r="1.5" fill="{blushColor}" opacity="0.5"/>
        <circle cx="72" cy="58" r="1.5" fill="{blushColor}" opacity="0.5"/>`,
      sparkles: `
        <path d="M28 52 V58 M25 55 H31 M72 52 V58 M69 55 H75" stroke="{blushColor}" stroke-width="1.5" opacity="0.6"/>`,
      triangle: `
        <path d="M25 60 L30 52 L35 60 Z" fill="{blushColor}" opacity="0.3"/>
        <path d="M65 60 L70 52 L75 60 Z" fill="{blushColor}" opacity="0.3"/>`,
      high: `
        <ellipse cx="30" cy="48" rx="7" ry="3" fill="{blushColor}" opacity="0.4"/>
        <ellipse cx="70" cy="48" rx="7" ry="3" fill="{blushColor}" opacity="0.4"/>`,
      wide: `
        <ellipse cx="30" cy="55" rx="12" ry="5" fill="{blushColor}" opacity="0.2"/>
        <ellipse cx="70" cy="55" rx="12" ry="5" fill="{blushColor}" opacity="0.2"/>`,
      soft: `
        <circle cx="30" cy="55" r="10" fill="{blushColor}" opacity="0.15"/>
        <circle cx="70" cy="55" r="10" fill="{blushColor}" opacity="0.15"/>`,
      cute: `
        <ellipse cx="30" cy="55" rx="6" ry="4" fill="{blushColor}" opacity="0.4"/>
        <circle cx="27" cy="53" r="1.5" fill="white" opacity="0.8"/>
        <ellipse cx="70" cy="55" rx="6" ry="4" fill="{blushColor}" opacity="0.4"/>
        <circle cx="67" cy="53" r="1.5" fill="white" opacity="0.8"/>`,
      rosy: `
        <circle cx="30" cy="62" r="12" fill="{blushColor}" opacity="0.15"/>
        <circle cx="70" cy="62" r="12" fill="{blushColor}" opacity="0.15"/>`,
      freckledpink: `
        <ellipse cx="30" cy="55" rx="8" ry="4" fill="{blushColor}" opacity="0.3"/>
        <circle cx="28" cy="55" r="1" fill="#3d2f3a" opacity="0.1"/>
        <circle cx="32" cy="53" r="1" fill="#3d2f3a" opacity="0.1"/>
        <ellipse cx="70" cy="55" rx="8" ry="4" fill="{blushColor}" opacity="0.3"/>
        <circle cx="68" cy="55" r="1" fill="#3d2f3a" opacity="0.1"/>
        <circle cx="72" cy="53" r="1" fill="#3d2f3a" opacity="0.1"/>`,
      zigzag: `
        <path d="M25 55 L30 50 L35 55" stroke="{blushColor}" stroke-width="2" fill="none" opacity="0.4"/>
        <path d="M65 55 L70 50 L75 55" stroke="{blushColor}" stroke-width="2" fill="none" opacity="0.4"/>`,
      square: `
        <rect x="25" y="52" width="10" height="6" rx="1" fill="{blushColor}" opacity="0.3"/>
        <rect x="65" y="52" width="10" height="6" rx="1" fill="{blushColor}" opacity="0.3"/>`,
      cross: `
        <path d="M27 52 L33 58 M33 52 L27 58" stroke="{blushColor}" stroke-width="2" opacity="0.4"/>
        <path d="M67 52 L73 58 M73 52 L67 58" stroke="{blushColor}" stroke-width="2" opacity="0.4"/>`,
      angled: `
        <path d="M25 60 L35 45" stroke="{blushColor}" stroke-width="5" opacity="0.2" stroke-linecap="round"/>
        <path d="M65 60 L75 45" stroke="{blushColor}" stroke-width="5" opacity="0.2" stroke-linecap="round"/>`,
      faint: `
        <circle cx="30" cy="55" r="12" fill="{blushColor}" opacity="0.1"/>
        <circle cx="70" cy="55" r="12" fill="{blushColor}" opacity="0.1"/>`,
      patch: `
        <path d="M22 52 H38 V58 H22 Z" fill="{blushColor}" opacity="0.2"/>
        <path d="M62 52 H78 V58 H62 Z" fill="{blushColor}" opacity="0.2"/>`,
      dust: `
        <circle cx="28" cy="50" r="1" fill="{blushColor}" opacity="0.4"/>
        <circle cx="32" cy="51" r="1" fill="{blushColor}" opacity="0.4"/>
        <circle cx="26" cy="54" r="1" fill="{blushColor}" opacity="0.4"/>
        <circle cx="68" cy="50" r="1" fill="{blushColor}" opacity="0.4"/>
        <circle cx="72" cy="51" r="1" fill="{blushColor}" opacity="0.4"/>
        <circle cx="74" cy="54" r="1" fill="{blushColor}" opacity="0.4"/>`,
      swirl: `
        <path d="M25 55 Q30 50 35 55 T40 55" stroke="{blushColor}" stroke-width="1" fill="none" opacity="0.3"/>
        <path d="M60 55 Q65 50 70 55 T75 55" stroke="{blushColor}" stroke-width="1" fill="none" opacity="0.3"/>`,
      cheeky: `
        <circle cx="32" cy="58" r="6" fill="{blushColor}" opacity="0.4"/>
        <circle cx="68" cy="58" r="6" fill="{blushColor}" opacity="0.4"/>`,
      bars: `
        <path d="M25 52 V58 M30 52 V58 M35 52 V58" stroke="{blushColor}" stroke-width="1.5" opacity="0.3"/>
        <path d="M65 52 V58 M70 52 V58 M75 52 V58" stroke="{blushColor}" stroke-width="1.5" opacity="0.3"/>`,
      halo_blush: `
        <circle cx="30" cy="55" r="9" fill="none" stroke="{blushColor}" stroke-width="1" opacity="0.4"/>
        <circle cx="70" cy="55" r="9" fill="none" stroke="{blushColor}" stroke-width="1" opacity="0.4"/>`,
      splotch: `
        <path d="M24 54 Q30 48 36 54 T42 54" fill="{blushColor}" opacity="0.2"/>
        <path d="M58 54 Q64 48 70 54 T76 54" fill="{blushColor}" opacity="0.2"/>`,
      glow_blush: `
        <circle cx="30" cy="55" r="7" fill="{blushColor}" opacity="0.5"/>
        <circle cx="70" cy="55" r="7" fill="{blushColor}" opacity="0.5"/>`,
      lines_blush: `
        <path d="M26 50 L34 60" stroke="{blushColor}" stroke-width="1" opacity="0.4"/>
        <path d="M66 50 L74 60" stroke="{blushColor}" stroke-width="1" opacity="0.4"/>`,
      soft_square: `
        <rect x="26" y="52" width="8" height="8" rx="3" fill="{blushColor}" opacity="0.25"/>
        <rect x="66" y="52" width="8" height="8" rx="3" fill="{blushColor}" opacity="0.25"/>`
    },
    glasses: {
      none: ``,
      classic: `
        <circle cx="35" cy="45" r="12" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <circle cx="65" cy="45" r="12" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M47 45 H53" stroke="{lineColor}" stroke-width="2"/>`,
      square: `
        <rect x="23" y="38" width="18" height="14" rx="2" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <rect x="59" y="38" width="18" height="14" rx="2" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M41 45 H59" stroke="{lineColor}" stroke-width="2"/>`,
      sun: `
        <circle cx="35" cy="45" r="12" fill="{lineColor}" opacity="0.6"/>
        <circle cx="65" cy="45" r="12" fill="{lineColor}" opacity="0.6"/>
        <path d="M47 45 H53" stroke="{lineColor}" stroke-width="2"/>`,
      cool: `
        <rect x="22" y="42" width="20" height="6" rx="1" fill="{lineColor}"/>
        <rect x="58" y="42" width="20" height="6" rx="1" fill="{lineColor}"/>
        <path d="M42 45 H58" stroke="{lineColor}" stroke-width="2"/>`,
      star: `
        <path d="M35 32 L39 42 L50 42 L42 48 L45 58 L35 52 L25 58 L28 48 L20 42 L31 42 Z" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M65 32 L69 42 L80 42 L72 48 L75 58 L65 52 L55 58 L58 48 L50 42 L61 42 Z" stroke="{lineColor}" stroke-width="2" fill="none"/>`,
      cateye: `
        <path d="M22 40 Q35 35 45 42 L45 50 Q35 55 22 48 Z" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M78 40 Q65 35 55 42 L55 50 Q65 55 78 48 Z" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M45 45 H55" stroke="{lineColor}" stroke-width="2"/>`,
      aviator: `
        <path d="M25 40 Q35 38 45 40 L45 55 Q35 60 25 55 Z" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M75 40 Q65 38 55 40 L55 55 Q65 60 75 55 Z" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M45 42 H55" stroke="{lineColor}" stroke-width="2"/>`,
      monocle: `
        <circle cx="65" cy="45" r="14" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M79 45 L85 70" stroke="{lineColor}" stroke-width="1.5" stroke-dasharray="2,2"/>`,
      heart: `
        <path d="M35 55 Q20 45 35 35 Q50 45 35 55" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M65 55 Q50 45 65 35 Q80 45 65 55" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M45 45 H55" stroke="{lineColor}" stroke-width="2"/>`,
      hypno: `
        <circle cx="35" cy="45" r="12" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <circle cx="35" cy="45" r="8" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <circle cx="35" cy="45" r="4" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <circle cx="65" cy="45" r="12" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <circle cx="65" cy="45" r="8" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <circle cx="65" cy="45" r="4" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M47 45 H53" stroke="{lineColor}" stroke-width="2"/>`,
      safety: `
        <rect x="22" y="38" width="56" height="15" rx="2" stroke="{lineColor}" stroke-width="2" fill="none" opacity="0.4"/>
        <path d="M22 38 H78 M22 53 H78" stroke="{lineColor}" stroke-width="2"/>`,
      rimless: `
        <path d="M30 45 H40 M60 45 H70" stroke="{lineColor}" stroke-width="1"/>
        <path d="M40 45 Q50 40 60 45" stroke="{lineColor}" stroke-width="1" fill="none"/>`,
      thin_round: `
        <circle cx="35" cy="45" r="10" stroke="{lineColor}" stroke-width="0.5" fill="none"/>
        <circle cx="65" cy="45" r="10" stroke="{lineColor}" stroke-width="0.5" fill="none"/>
        <path d="M45 45 Q50 42 55 45" stroke="{lineColor}" stroke-width="0.5" fill="none"/>`,
      goggles: `
        <rect x="20" y="35" width="60" height="20" rx="10" stroke="{lineColor}" stroke-width="3" fill="rgba(255,255,255,0.2)"/>
        <path d="M20 45 H10 M80 45 H90" stroke="{lineColor}" stroke-width="3"/>`,
      retro: `
        <path d="M22 38 H44 V52 H22 Z" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M56 38 H78 V52 H56 Z" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M44 45 H56" stroke="{lineColor}" stroke-width="2"/>`,
      oversized: `
        <circle cx="32" cy="48" r="16" stroke="{lineColor}" stroke-width="1.5" fill="none"/>
        <circle cx="68" cy="48" r="16" stroke="{lineColor}" stroke-width="1.5" fill="none"/>
        <path d="M48 48 Q50 44 52 48" stroke="{lineColor}" stroke-width="1.5" fill="none"/>`,
      butterfly: `
        <path d="M20 35 Q40 30 45 45 L45 55 Q35 60 20 50 Z" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M80 35 Q60 30 55 45 L55 55 Q65 60 80 50 Z" stroke="{lineColor}" stroke-width="2" fill="none"/>`,
      small_oval: `
        <ellipse cx="35" cy="45" rx="8" ry="4" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <ellipse cx="65" cy="45" rx="8" ry="4" stroke="{lineColor}" stroke-width="2" fill="none"/>`,
      bolt: `
        <path d="M20 45 L30 35 L40 45 L30 55 Z" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M60 45 L70 35 L80 45 L70 55 Z" stroke="{lineColor}" stroke-width="2" fill="none"/>`,
      nerdy: `
        <rect x="23" y="40" width="18" height="12" rx="1" stroke="{lineColor}" stroke-width="4" fill="none"/>
        <rect x="59" y="40" width="18" height="12" rx="1" stroke="{lineColor}" stroke-width="4" fill="none"/>
        <path d="M41 44 H59" stroke="{lineColor}" stroke-width="3"/>`,
      shades: `
        <path d="M20 42 H80 L75 50 H25 Z" fill="{lineColor}"/>`,
      rim_top: `
        <path d="M25 40 Q35 35 45 40" stroke="{lineColor}" stroke-width="3" fill="none"/>
        <path d="M55 40 Q65 35 75 40" stroke="{lineColor}" stroke-width="3" fill="none"/>`,
      detective: `
        <rect x="25" y="43" width="50" height="4" fill="{lineColor}"/>
        <circle cx="35" cy="48" r="8" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <circle cx="65" cy="48" r="8" stroke="{lineColor}" stroke-width="2" fill="none"/>`,
      clown_nose: `
        <circle cx="50" cy="55" r="6" fill="#f03e3e"/>`,
      scouter: `
        <rect x="55" y="38" width="22" height="16" rx="2" fill="rgba(0,255,0,0.3)" stroke="{lineColor}" stroke-width="2"/>
        <path d="M55 46 H45 M77 46 H85" stroke="{lineColor}" stroke-width="2"/>`,
      mask_eyes: `
        <path d="M20 45 Q35 30 50 45 Q65 30 80 45 L75 55 Q50 65 25 55 Z" fill="{lineColor}"/>`,
      visor: `
        <rect x="20" y="38" width="60" height="12" fill="rgba(0,0,0,0.8)"/>`,
      monocle_left: `
        <circle cx="35" cy="45" r="14" stroke="{lineColor}" stroke-width="2" fill="none"/>`,
      blindfold: `
        <rect x="20" y="40" width="60" height="10" fill="{lineColor}"/>`,
      googley: `
        <circle cx="35" cy="45" r="12" stroke="{lineColor}" stroke-width="2" fill="white"/>
        <circle cx="65" cy="45" r="12" stroke="{lineColor}" stroke-width="2" fill="white"/>
        <circle cx="37" cy="47" r="4" fill="black"/>
        <circle cx="63" cy="47" r="4" fill="black"/>`
    },
    masks: {
      none: ``,
      medical: `
        <rect x="25" y="60" width="50" height="25" rx="4" fill="white" stroke="#a5d8ff" stroke-width="1.5"/>
        <path d="M25 65 L10 60 M25 80 L10 85 M75 65 L90 60 M75 80 L90 85" stroke="#a5d8ff" stroke-width="1"/>`,
      ninja: `<path d="M20 60 Q50 50 80 60 L75 90 Q50 95 25 90 Z" fill="{lineColor}"/>`,
      hero: `
        <path d="M15 45 Q50 35 85 45 L80 55 Q50 65 20 55 Z" fill="{lineColor}"/>
        <circle cx="35" cy="50" r="6" fill="white"/>
        <circle cx="65" cy="50" r="6" fill="white"/>`,
      bandit: `<path d="M25 60 L50 95 L75 60 Z" fill="{lineColor}"/>`,
      gas: `
        <rect x="30" y="60" width="40" height="25" rx="10" fill="#495057"/>
        <circle cx="35" cy="72" r="8" fill="#ced4da" stroke="#adb5bd"/>
        <circle cx="65" cy="72" r="8" fill="#ced4da" stroke="#adb5bd"/>`,
      skull: `
        <path d="M25 60 Q50 55 75 60 L70 85 Q50 90 30 85 Z" fill="white" stroke="{lineColor}"/>
        <path d="M45 65 L45 75 M55 65 L55 75 M50 78 L50 82" stroke="{lineColor}" stroke-width="2"/>`,
      catmask: `
        <path d="M20 40 L30 20 L45 35 H55 L70 20 L80 40 Q80 60 50 60 Q20 60 20 40 Z" fill="white" stroke="{lineColor}"/>
        <circle cx="35" cy="45" r="4" fill="{lineColor}"/>
        <circle cx="65" cy="45" r="4" fill="{lineColor}"/>`,
      robot: `
        <rect x="25" y="60" width="50" height="25" rx="2" fill="#ced4da" stroke="#495057"/>
        <rect x="30" y="65" width="40" height="4" fill="#a5d8ff"/>
        <rect x="30" y="75" width="40" height="4" fill="#a5d8ff"/>`,
      hacker: `
        <path d="M25 40 Q50 30 75 40 L70 90 Q50 95 30 90 Z" fill="white" stroke="{lineColor}"/>
        <path d="M40 75 Q50 85 60 75" stroke="black" stroke-width="2" fill="none"/>
        <path d="M35 50 H45 M55 50 H65" stroke="black" stroke-width="1.5"/>`,
      fox: `
        <path d="M25 35 L35 15 L50 35 L65 15 L75 35 Q75 65 50 65 Q25 65 25 35 Z" fill="white" stroke="#ff4d4d"/>
        <path d="M35 45 Q50 40 65 45" stroke="#ff4d4d" stroke-width="2" fill="none"/>`,
      clown: `
        <circle cx="50" cy="65" r="8" fill="#ff4d4d"/>
        <path d="M35 75 Q50 90 65 75" stroke="#ff4d4d" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      doge: `
        <ellipse cx="50" cy="75" rx="15" ry="10" fill="#f4d03f" stroke="#d4ac0d"/>
        <circle cx="50" cy="72" r="3" fill="black"/>
        <path d="M45 78 Q50 82 55 78" stroke="black" stroke-width="1.5" fill="none"/>`,
      moustachio: `
        <rect x="25" y="60" width="50" height="25" rx="4" fill="white" stroke="#eee"/>
        <path d="M35 72 Q42 65 50 72 Q58 65 65 72" stroke="black" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      vampire: `
        <path d="M25 60 Q50 55 75 60 L70 90 Q50 95 30 90 Z" fill="black"/>
        <path d="M40 65 L44 75 L48 65" fill="white"/>
        <path d="M52 65 L56 75 L60 65" fill="white"/>`,
      led: `
        <rect x="25" y="60" width="50" height="25" rx="6" fill="#1a1a1a"/>
        <circle cx="35" cy="72" r="2" fill="#00ff00"/>
        <circle cx="45" cy="72" r="2" fill="#00ff00"/>
        <circle cx="55" cy="72" r="2" fill="#00ff00"/>
        <circle cx="65" cy="72" r="2" fill="#00ff00"/>`,
      bear: `
        <ellipse cx="50" cy="75" rx="14" ry="12" fill="#8d6e63"/>
        <circle cx="50" cy="72" r="4" fill="#3e2723"/>
        <path d="M42 78 Q50 85 58 78" stroke="#3e2723" stroke-width="2" fill="none"/>`,
      broken: `
        <rect x="25" y="60" width="50" height="25" rx="4" fill="white" stroke="#ccc"/>
        <path d="M40 60 L45 70 L40 75 L50 85" stroke="#ff4d4d" stroke-width="2" fill="none"/>`,
      zipped: `
        <rect x="25" y="60" width="50" height="25" rx="4" fill="#2d3436"/>
        <path d="M30 72 H70" stroke="#f1c40f" stroke-width="3" stroke-dasharray="2,1"/>
        <rect x="48" y="70" width="4" height="6" fill="#f1c40f"/>`,
      beak: `
        <path d="M40 60 L50 80 L60 60 Z" fill="#ffa500" stroke="{lineColor}"/>`,
      muzzle: `
        <circle cx="50" cy="75" r="10" fill="white" stroke="{lineColor}"/>
        <circle cx="50" cy="72" r="2" fill="black"/>`,
      visor_fancy: `
        <path d="M20 40 H80 L75 55 H25 Z" fill="rgba(0,191,255,0.4)" stroke="{lineColor}"/>`,
      face_shield: `
        <rect x="20" y="30" width="60" height="60" rx="10" fill="rgba(255,255,255,0.2)" stroke="{lineColor}"/>`,
      respirator: `
        <circle cx="50" cy="75" r="12" fill="#555" stroke="{lineColor}"/>
        <rect x="35" y="70" width="10" height="10" rx="2" fill="#777"/>
        <rect x="55" y="70" width="10" height="10" rx="2" fill="#777"/>`,
      bandana_full: `
        <path d="M20 50 L50 95 L80 50 Z" fill="#d63031" stroke="{lineColor}"/>`,
      cat_ears_mask: `
        <path d="M20 30 L35 10 L50 30 L65 10 L80 30 V60 H20 Z" fill="{lineColor}"/>`,
      monocle_fancy: `
        <circle cx="35" cy="45" r="14" stroke="#f1c40f" stroke-width="3" fill="none"/>
        <path d="M35 59 V70" stroke="#f1c40f" stroke-width="2"/>`,
      scuba: `
        <rect x="20" y="35" width="60" height="20" rx="10" fill="rgba(0,0,255,0.2)" stroke="{lineColor}"/>
        <path d="M50 55 V80" stroke="{lineColor}" stroke-width="3"/>`,
      vr: `
        <rect x="20" y="38" width="60" height="18" rx="2" fill="#333" stroke="{lineColor}"/>
        <path d="M25 47 H75" stroke="#00d2ff" stroke-width="1"/>`
    },
    mouth: {
      happy: `<path d="M40 65 Q50 75 60 65" stroke="{lineColor}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      neutral: `<path d="M42 70 H58" stroke="{lineColor}" stroke-width="3" stroke-linecap="round"/>`,
      surprised: `<circle cx="50" cy="70" r="4" fill="none" stroke="{lineColor}" stroke-width="3"/>`,
      smile: `<path d="M35 65 Q50 80 65 65" stroke="{lineColor}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      tongue: `
        <path d="M40 65 Q50 75 60 65" stroke="{lineColor}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M46 72 Q50 82 54 72 Z" fill="{blushColor}"/>`,
      grin: `<path d="M38 65 H62 Q62 75 50 75 Q38 75 38 65 Z" fill="white" stroke="{lineColor}" stroke-width="2"/>`,
      whistling: `<circle cx="50" cy="70" r="2.5" fill="{lineColor}"/>`,
      open: `
        <path d="M40 65 H60 Q60 85 50 85 Q40 85 40 65 Z" fill="{lineColor}"/>
        <path d="M45 80 Q50 84 55 80" stroke="{blushColor}" stroke-width="2" fill="none"/>`,
      sad: `<path d="M40 75 Q50 65 60 75" stroke="{lineColor}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      mustache: `
        <path d="M38 68 Q45 65 50 68 Q55 65 62 68" stroke="{lineColor}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      cat: `<path d="M40 68 Q45 75 50 68 Q55 75 60 68" stroke="{lineColor}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      vampire: `
        <path d="M40 65 H60 Q60 85 50 85 Q40 85 40 65 Z" fill="{lineColor}"/>
        <path d="M42 65 L44 72 L46 65" fill="white"/>
        <path d="M54 65 L56 72 L58 65" fill="white"/>`,
      flat: `<path d="M40 75 H60" stroke="{lineColor}" stroke-width="3" stroke-linecap="round"/>`,
      grimace: `<rect x="40" y="70" width="20" height="8" rx="4" fill="white" stroke="{lineColor}" stroke-width="2"/>`,
      buckteeth: `
        <path d="M42 70 H58 V75 H42 Z" fill="white" stroke="{lineColor}"/>
        <path d="M50 70 V75" stroke="{lineColor}"/>`,
      lips: `
        <path d="M40 70 Q50 65 60 70 Q50 75 40 70" fill="{blushColor}" stroke="{lineColor}" stroke-width="1"/>`,
      frown: `
        <path d="M35 75 Q50 60 65 75" stroke="{lineColor}" stroke-width="2" fill="none"/>`,
      confused: `
        <path d="M40 70 Q45 75 50 70 T60 70" stroke="{lineColor}" stroke-width="2" fill="none"/>`,
      chew: `
        <rect x="40" y="68" width="20" height="10" rx="5" fill="{lineColor}" opacity="0.3"/>`,
      muffler: `
        <path d="M35 70 H65 V80 H35 Z" fill="#555" stroke="{lineColor}"/>`,
      beaky_small: `
        <path d="M45 68 L50 75 L55 68 Z" fill="#ffa500" stroke="{lineColor}"/>`,
      toothy_grin: `
        <path d="M35 68 H65 V78 H35 Z" fill="white" stroke="{lineColor}"/>
        <path d="M40 68 V78 M45 68 V78 M50 68 V78 M55 68 V78 M60 68 V78" stroke="{lineColor}" stroke-width="0.5"/>`,
      pout: `
        <path d="M45 70 Q50 68 55 70 Q50 75 45 70" fill="{blushColor}" stroke="{lineColor}"/>`,
      wide_smile: `
        <path d="M30 65 Q50 85 70 65" stroke="{lineColor}" stroke-width="4" fill="none"/>`,
      small_o: `
        <circle cx="50" cy="72" r="3" fill="none" stroke="{lineColor}" stroke-width="2"/>`,
      crooked: `
        <path d="M40 72 L60 68" stroke="{lineColor}" stroke-width="3" stroke-linecap="round"/>`,
      zipped_small: `
        <path d="M40 72 H60" stroke="{lineColor}" stroke-width="2"/>
        <path d="M43 70 V74 M46 70 V74 M49 70 V74 M52 70 V74 M55 70 V74 M58 70 V74" stroke="{lineColor}" stroke-width="1"/>`,
      buckteeth_single: `
        <rect x="45" y="70" width="10" height="6" fill="white" stroke="{lineColor}"/>`,
      drool: `
        <path d="M40 65 Q50 75 60 65" stroke="{lineColor}" stroke-width="2" fill="none"/>
        <path d="M55 70 V80 Q55 85 53 82" fill="#339af0"/>`,
      pixel_mouth: `
        <path d="M40 70 H45 V75 H55 V70 H60" stroke="{lineColor}" stroke-width="2" fill="none"/>`
    },
    hair: {
      none: ``,
      bowl: `<path d="M20 40 Q50 0 80 40 Z" fill="{hairColor}"/>`,
      spiky: `<path d="M20 40 L30 20 L40 35 L50 15 L60 35 L70 20 L80 40 Z" fill="{hairColor}"/>`,
      curly: `
        <circle cx="35" cy="25" r="10" fill="{hairColor}"/>
        <circle cx="50" cy="20" r="10" fill="{hairColor}"/>
        <circle cx="65" cy="25" r="10" fill="{hairColor}"/>`,
      long: `<path d="M20 40 Q20 80 15 90 Q50 70 85 90 Q80 80 80 40 Q50 10 20 40 Z" fill="{hairColor}"/>`,
      afro: `<path d="M15 45 Q15 0 50 0 Q85 0 85 45" fill="{hairColor}" stroke="{hairColor}" stroke-width="12" stroke-linejoin="round"/>`,
      ponytail: `
        <path d="M20 40 Q50 10 80 40 Z" fill="{hairColor}"/>
        <circle cx="85" cy="45" r="12" fill="{hairColor}"/>`,
      sidepart: `
        <path d="M20 40 Q20 10 50 10 L80 40 Z" fill="{hairColor}"/>
        <path d="M50 10 Q80 10 80 40 Z" fill="{hairColor}" opacity="0.8"/>`,
      topknot: `
        <path d="M25 40 Q50 15 75 40 Z" fill="{hairColor}"/>
        <circle cx="50" cy="15" r="8" fill="{hairColor}"/>`,
      pigtails: `
        <path d="M25 40 Q50 15 75 40 Z" fill="{hairColor}"/>
        <circle cx="15" cy="50" r="10" fill="{hairColor}"/>
        <circle cx="85" cy="50" r="10" fill="{hairColor}"/>`,
      cap: `
        <path d="M25 40 Q50 10 75 40 Z" fill="{hairColor}"/>
        <path d="M25 40 H10 V45 H25 Z" fill="{hairColor}" opacity="0.9"/>`,
      mohawk: `
        <path d="M45 40 L45 5 L55 5 L55 40 Z" fill="{hairColor}"/>
        <path d="M40 40 L40 15 L60 15 L60 40 Z" fill="{hairColor}" opacity="0.8"/>`,
      beret: `
        <ellipse cx="50" cy="35" rx="35" ry="12" fill="{hairColor}"/>
        <rect x="48" y="20" width="4" height="6" fill="{hairColor}"/>`,
      bun: `
        <path d="M25 40 Q50 15 75 40 Z" fill="{hairColor}"/>
        <circle cx="50" cy="18" r="10" fill="{hairColor}"/>`,
      buzz: `<path d="M25 40 Q50 15 75 40 L75 45 Q50 20 25 45 Z" fill="{hairColor}"/>`,
      sidestrike: `<path d="M20 40 L50 10 L80 40 L70 30 L50 20 L30 30 Z" fill="{hairColor}"/>`,
      shaggy: `<path d="M20 45 L25 15 L35 40 L50 10 L65 40 L75 15 L80 45 Z" fill="{hairColor}"/>`,
      bob: `<path d="M20 40 Q25 10 50 10 Q75 10 80 40 V60 Q50 65 20 60 Z" fill="{hairColor}"/>`,
      pompadour: `<path d="M25 40 Q25 5 50 5 Q75 5 75 40 L65 35 Q50 30 35 35 Z" fill="{hairColor}"/>`,
      beanie: `<path d="M25 40 Q50 0 75 40 V45 H25 Z" fill="{hairColor}"/>`,
      headband: `<path d="M20 40 Q50 10 80 40 M20 35 Q50 5 80 35" stroke="{hairColor}" stroke-width="5" fill="none"/>`,
      crown: `<path d="M20 40 L25 20 L37 35 L50 10 L63 35 L75 20 L80 40 Z" fill="#f1c40f"/>`,
      horns: `
        <path d="M30 30 Q25 10 15 20" stroke="{hairColor}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M70 30 Q75 10 85 20" stroke="{hairColor}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
      antenna: `<path d="M50 40 V10" stroke="{hairColor}" stroke-width="2"/><circle cx="50" cy="8" r="3" fill="{hairColor}"/>`,
      bald_sides: `<path d="M20 40 Q15 60 20 80 M80 40 Q85 60 80 80" stroke="{hairColor}" stroke-width="5" fill="none"/>`,
      waves: `<path d="M25 40 Q35 30 50 35 Q65 30 75 40" stroke="{hairColor}" stroke-width="8" fill="none"/>`,
      neat: `<path d="M25 40 Q50 15 75 40 L75 42 Q50 17 25 42 Z" fill="{hairColor}"/>`,
      punk: `<path d="M20 40 L30 15 L40 30 L50 5 L60 30 L70 15 L80 40 Z" stroke="{hairColor}" stroke-width="2" fill="{hairColor}"/>`,
      hoodie_top: `<path d="M25 45 Q50 10 75 45 V55 Q50 20 25 55 Z" fill="{hairColor}"/>`,
      tousled: `<path d="M20 45 Q30 20 50 25 Q70 20 80 45" stroke="{hairColor}" stroke-width="12" fill="none" stroke-linecap="round"/>`
    },
    extras: {
      none: ``,
      blush: `
        <circle cx="25" cy="55" r="5" fill="{blushColor}" opacity="0.3"/>
        <circle cx="75" cy="55" r="5" fill="{blushColor}" opacity="0.3"/>`,
      freckles: `
        <circle cx="28" cy="55" r="1" fill="#d63031" opacity="0.4"/>
        <circle cx="32" cy="53" r="1" fill="#d63031" opacity="0.4"/>
        <circle cx="68" cy="55" r="1" fill="#d63031" opacity="0.4"/>
        <circle cx="72" cy="53" r="1" fill="#d63031" opacity="0.4"/>`,
      glasses: `
        <circle cx="35" cy="45" r="10" fill="none" stroke="{lineColor}" stroke-width="2"/>
        <circle cx="65" cy="45" r="10" fill="none" stroke="{lineColor}" stroke-width="2"/>
        <path d="M45 45 H55" stroke="{lineColor}" stroke-width="2"/>`,
      sparkles: `
        <path d="M11 15 L14 15 M12.5 13.5 L12.5 16.5" stroke="#ffe066" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M89 25 L92 25 M90.5 23.5 L90.5 26.5" stroke="#ffe066" stroke-width="1.5" stroke-linecap="round"/>`,
      heart: `
        <path d="M50 20 Q45 10 50 5 Q55 10 50 20" fill="#f03e3e" opacity="0.8"/>`,
      bandana: `
        <path d="M20 35 H80 L75 45 H25 Z" fill="{hairColor}" stroke="white" stroke-width="1"/>`,
      halo: `
        <ellipse cx="50" cy="15" rx="25" ry="6" fill="none" stroke="#ffe066" stroke-width="2" opacity="0.7"/>`,
      bow: `
        <path d="M70 20 L85 10 L85 30 Z M70 20 L55 10 L55 30 Z" fill="#ff4d4d"/>
        <circle cx="70" cy="20" r="4" fill="#ff4d4d"/>`,
      flower: `
        <circle cx="75" cy="25" r="5" fill="#f1c40f"/>
        <circle cx="75" cy="15" r="5" fill="#e84393"/>
        <circle cx="85" cy="25" r="5" fill="#e84393"/>
        <circle cx="75" cy="35" r="5" fill="#e84393"/>
        <circle cx="65" cy="25" r="5" fill="#e84393"/>`,
      cat_ears: `
        <path d="M25 15 L35 30 L15 30 Z" fill="{hairColor}"/>
        <path d="M75 15 L85 30 L65 30 Z" fill="{hairColor}"/>`,
      beanie_pom: `
        <circle cx="50" cy="5" r="6" fill="white"/>`,
      earrings: `
        <circle cx="12" cy="60" r="3" fill="#f1c40f"/>
        <circle cx="88" cy="60" r="3" fill="#f1c40f"/>`,
      scarf: `
        <path d="M20 85 Q50 95 80 85 V95 Q50 105 20 95 Z" fill="#ff7675"/>`,
      crown: `
        <path d="M30 20 L40 10 L50 20 L60 10 L70 20 V30 H30 Z" fill="#f1c40f"/>`,
      horns: `
        <path d="M30 25 Q25 5 15 15" stroke="{lineColor}" stroke-width="4" fill="none"/>
        <path d="M70 25 Q75 5 85 15" stroke="{lineColor}" stroke-width="4" fill="none"/>`,
      antenna: `
        <path d="M50 25 V5" stroke="{lineColor}" stroke-width="2"/>
        <circle cx="50" cy="5" r="3" fill="#ff4d4d"/>`,
      headphones: `
        <path d="M20 60 Q20 20 50 20 Q80 20 80 60" fill="none" stroke="{lineColor}" stroke-width="6"/>
        <rect x="10" y="55" width="12" height="15" rx="5" fill="{lineColor}"/>
        <rect x="78" y="55" width="12" height="15" rx="5" fill="{lineColor}"/>`,
      star_clip: `
        <path d="M15 25 L20 20 L25 25 L22 30 L18 30 Z" fill="#ffe066"/>`,
      butterfly: `
        <path d="M80 30 Q85 20 90 30 Q85 40 80 30" fill="#a29bfe"/>
        <path d="M80 30 Q75 20 70 30 Q75 40 80 30" fill="#a29bfe"/>`,
      music_note: `
        <path d="M75 25 V10 H85 V15" stroke="{lineColor}" fill="none"/>
        <circle cx="72" cy="25" r="3" fill="{lineColor}"/>`,
      aura: `
        <circle cx="50" cy="50" r="45" fill="none" stroke="{blushColor}" stroke-dasharray="5,5" opacity="0.2"/>`,
      bubbles: `
        <circle cx="20" cy="20" r="3" fill="white" opacity="0.3"/>
        <circle cx="80" cy="15" r="5" fill="white" opacity="0.3"/>
        <circle cx="15" cy="80" r="4" fill="white" opacity="0.3"/>`,
      hat_tiny: `
        <rect x="40" y="5" width="20" height="10" fill="{lineColor}"/>
        <rect x="35" y="15" width="30" height="2" fill="{lineColor}"/>`,
      monocle: `
        <circle cx="35" cy="45" r="12" stroke="{lineColor}" stroke-width="2" fill="none"/>`,
      eye_patch: `
        <rect x="25" y="40" width="20" height="10" fill="{lineColor}"/>
        <path d="M10 45 L90 45" stroke="{lineColor}" stroke-width="2"/>`,
      sweat: `
        <path d="M80 40 Q85 45 80 50" stroke="#3498db" stroke-width="2" fill="none" stroke-linecap="round"/>`,
      tear: `
        <circle cx="35" cy="60" r="2" fill="#3498db"/>`,
      shades: `
        <rect x="20" y="42" width="60" height="6" fill="{lineColor}" opacity="0.8"/>`,
      beret_top: `
        <path d="M40 10 Q50 5 60 10" stroke="{lineColor}" stroke-width="2" fill="none"/>`
    }
  };

  const PALETTE = {
    bg: ["ffd6ea", "b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf", "c4b5fd", "fef9c3", "dcfce7"],
    body: ["ffeef6", "ffffff", "fff9db", "e3fafc", "f3f0ff", "fff0f6", "f8f9fa", "495057"],
    hair: ["ff7eb3", "495057", "f59f00", "748ffc", "f03e3e", "7048e8", "ae3ec9", "1098ad"],
    eye: ["2d3436", "0984e3", "d63031", "6c5ce7", "00b894", "e17055"]
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  let viewYear;
  let viewMonth;
  let selectedISO = "";
  let calendarOpen = false;
  let calendarView = "days"; // "days", "months", "years"

  const mqDesktop = window.matchMedia("(min-width: 900px)");

  function todayParts() {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
  }

  function parseISO(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function toISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function initCalendarView() {
    const t = todayParts();
    if (selectedISO) {
      const sd = parseISO(selectedISO);
      if (sd) {
        viewYear = sd.getFullYear();
        viewMonth = sd.getMonth();
        return;
      }
    }
    viewYear = t.y;
    viewMonth = t.m;
  }

  function minBirthDate() {
    const t = todayParts();
    return new Date(t.y - 120, t.m, t.d);
  }

  /** Date handling helpers */
  function latestBirthDay() {
    const t = todayParts();
    const d = new Date(t.y, t.m, t.d);
    d.setDate(d.getDate() - 1);
    return startOfDay(d);
  }

  function formatDMY(d) {
    const x = startOfDay(d);
    const dd = String(x.getDate()).padStart(2, "0");
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${x.getFullYear()}`;
  }

  function parseDMY() {
    const dd = parseInt(dayInput.value, 10);
    const mm = parseInt(monthInput.value, 10);
    const yyyy = parseInt(yearInput.value, 10);
    if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return null;
    if (mm < 1 || mm > 12 || dd < 1 || dd > 30) return null;
    const d = new Date(yyyy, mm - 1, dd);
    if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
    return d;
  }

  function applyDateInternal(d) {
    const cellStart = startOfDay(d);
    selectedISO = toISO(cellStart);
    dobInput.value = selectedISO;
    
    const age = calculateDetailedAge(cellStart);
    dateDisplay.textContent = `${age.years} Year${age.years !== 1 ? 's' : ''} old`;
    
    dateDisplay.classList.remove("placeholder");
    dateTrigger.classList.add("has-date");
    
    dayInput.value = String(cellStart.getDate()).padStart(2, "0");
    monthInput.value = String(cellStart.getMonth() + 1).padStart(2, "0");
    yearInput.value = cellStart.getFullYear();
    return true;
  }

  function formatDisplay(d) {
    const w = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
    return `${w}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  /** Age Calculator Logic */
  let ageInterval;

  function calculateDetailedAge(birthDate) {
    const now = new Date();
    let years = now.getFullYear() - birthDate.getFullYear();
    let months = now.getMonth() - birthDate.getMonth();
    let days = now.getDate() - birthDate.getDate();
    let hours = now.getHours() - birthDate.getHours();
    let minutes = now.getMinutes() - birthDate.getMinutes();
    let seconds = now.getSeconds() - birthDate.getSeconds();

    if (seconds < 0) { seconds += 60; minutes--; }
    if (minutes < 0) { minutes += 60; hours--; }
    if (hours < 0) { hours += 24; days--; }
    if (days < 0) {
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
      months--;
    }
    if (months < 0) { months += 12; years--; }

    return { years, months, days, hours, minutes, seconds };
  }

  function updateAgeDisplay() {
    const d = parseDMY();
    if (!d || d > new Date()) {
      ["Years", "Months", "Days", "Hours", "Minutes", "Seconds"].forEach(unit => {
        const el = document.getElementById(`age${unit}`);
        if (el) el.textContent = "0";
      });
      return;
    }

    const age = calculateDetailedAge(d);
    document.getElementById("ageYears").textContent = age.years;
    document.getElementById("ageMonths").textContent = age.months;
    document.getElementById("ageDays").textContent = age.days;
    document.getElementById("ageHours").textContent = age.hours;
    document.getElementById("ageMinutes").textContent = age.minutes;
    document.getElementById("ageSeconds").textContent = age.seconds;
  }

  function openBirthdayPicker() {
    calendarOpen = true;
    calendarEl.hidden = false;
    dateTrigger.setAttribute("aria-expanded", "true");
    if (signupCluster) {
      requestAnimationFrame(() => {
        signupCluster.classList.add("is-calendar-open");
      });
    }
    if (selectedISO) {
      const sd = parseISO(selectedISO);
      if (sd) {
        dayInput.value = String(sd.getDate()).padStart(2, "0");
        monthInput.value = String(sd.getMonth() + 1).padStart(2, "0");
        yearInput.value = sd.getFullYear();
      }
    }
    updateAgeDisplay();
    clearInterval(ageInterval);
    ageInterval = setInterval(updateAgeDisplay, 1000);
    
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
  }

  function closeBirthdayPicker() {
    if (signupCluster) signupCluster.classList.remove("is-calendar-open");
    calendarOpen = false;
    calendarEl.hidden = true;
    dateTrigger.setAttribute("aria-expanded", "false");
    clearInterval(ageInterval);
    document.removeEventListener("click", onDocClick);
    document.removeEventListener("keydown", onKey);
  }

  function onDocClick(e) {
    if (!calendarOpen) return;
    if (signupCluster && !signupCluster.contains(e.target) && e.target !== dateTrigger) {
      closeBirthdayPicker();
    }
  }

  function onKey(e) {
    if (e.key === "Escape") {
      closeBirthdayPicker();
      dateTrigger.focus();
    }
  }

  dateTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (calendarOpen) {
      closeBirthdayPicker();
    } else {
      openBirthdayPicker();
    }
  });

  closeCalendarBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeBirthdayPicker();
  });

  ageDoneBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const d = parseDMY();
    if (d && d <= new Date()) {
      applyDateInternal(d);
      setMood("happy");
      closeBirthdayPicker();
    } else {
      shakeField(dayInput.closest(".field"));
      showToast("Please enter a valid birth date (Max Day: 30, Max Month: 12)");
    }
  });

  [dayInput, monthInput, yearInput].forEach(input => {
    input.addEventListener("input", (e) => {
      let v = e.target.value.replace(/\D/g, "");
      
      if (input === dayInput) {
        if (parseInt(v, 10) > 30) v = "30";
        if (v.length === 2) monthInput.focus();
      } else if (input === monthInput) {
        if (parseInt(v, 10) > 12) v = "12";
        if (v.length === 2) yearInput.focus();
      } else if (input === yearInput) {
        if (v.length === 4) yearInput.blur();
      }
      
      e.target.value = v;
      updateAgeDisplay();
    });

    input.addEventListener("blur", (e) => {
      let v = e.target.value;
      if (v.length === 1) {
        v = "0" + v;
        e.target.value = v;
      }

      if (input === yearInput && v.length === 2) {
        const twoDigitYear = parseInt(v, 10);
        const currentYear = new Date().getFullYear();
        const currentYY = currentYear % 100;
        if (twoDigitYear > currentYY) {
          e.target.value = "19" + v;
        } else {
          e.target.value = "20" + v;
        }
      }
      updateAgeDisplay();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        if (input !== yearInput) {
          e.preventDefault();
          if (input === dayInput) monthInput.focus();
          if (input === monthInput) yearInput.focus();
        } else if (e.key === "Enter") {
          e.preventDefault();
          ageDoneBtn.click();
        }
      }
      if (e.key === "Backspace" && e.target.value === "") {
        if (input === monthInput) dayInput.focus();
        if (input === yearInput) monthInput.focus();
      }
    });
  });


  handleInput.addEventListener("input", () => {
    let v = handleInput.value;
    v = v.replace(/^@+/, "");
    v = v.replace(/[^\w.]/g, "");
    if (handleInput.value !== v) handleInput.value = v;
  });

  dateDisplay.classList.add("placeholder");

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  function pupilFollow(e) {
    if (reduceMotion || !eyeL || !eyeR) return;
    const rect = face.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width * 1.2);
    const dy = (e.clientY - cy) / (rect.height * 1.2);
    const max = 4;
    const px = Math.max(-max, Math.min(max, dx * max));
    const py = Math.max(-max, Math.min(max, dy * max));
    eyeL.style.transform = `translate(${px}px, ${py}px)`;
    eyeR.style.transform = `translate(${px}px, ${py}px)`;
  }

  document.addEventListener("mousemove", pupilFollow);

  if (!reduceMotion && card) {
    document.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width - 0.5;
      const my = (e.clientY - rect.top) / rect.height - 0.5;
      const rx = my * -6;
      const ry = mx * 8;
      card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    document.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  }

  function setMood(mood) {
    face.classList.remove("happy", "sad");
    if (mood) face.classList.add(mood);
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  function burstConfetti() {
    if (reduceMotion) return;
    const colors = ["#ff7eb3", "#c4b5fd", "#a7f3d0", "#ffd6a8", "#7dd3fc"];
    const pieces = 80;
    const particles = [];
    for (let i = 0; i < pieces; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 14,
        vy: Math.random() * -12 - 4,
        g: 0.22 + Math.random() * 0.1,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        c: colors[(Math.random() * colors.length) | 0],
        s: 6 + Math.random() * 8,
      });
    }
    let frame = 0;
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y < canvas.height + 20) alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      }
      frame++;
      if (alive && frame < 120) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(tick);
  }

  function shakeField(fieldEl) {
    fieldEl.classList.remove("shake");
    void fieldEl.offsetWidth;
    fieldEl.classList.add("shake");
    setTimeout(() => fieldEl.classList.remove("shake"), 500);
  }

  const handlePattern = /^[a-zA-Z0-9._]{2,10}$/;

  const nameField = document.getElementById("nameField");
  const handleField = document.getElementById("handleField");
  const nameCounter = document.getElementById("nameCounter");
  const handleCounter = document.getElementById("handleCounter");

  [nameInput, handleInput].forEach((input) => {
    input.addEventListener("focus", () => setMood(""));
    input.addEventListener("input", () => {
      setMood("");

      // Update counters
      if (input === nameInput) {
        nameCounter.textContent = `${input.value.length} / 15`;
      } else {
        handleCounter.textContent = `${input.value.length} / 10`;
      }

      if (nameInput.value.trim() && handleInput.value.trim()) {
        topRow.classList.add("has-inputs");
      } else {
        topRow.classList.remove("has-inputs");
      }
    });
  });

  // PFP Sidebar Toggle
  function openPfpSidebar() {
    pfpOpen = true;
    pfpSidebar.hidden = false;
    pfpTrigger.setAttribute("aria-expanded", "true");

    // Refresh templates every time we open
    initPfpGrid();

    if (signupCluster) {
      requestAnimationFrame(() => {
        signupCluster.classList.add("is-pfp-open");
      });
    }
  }

  function closePfpSidebar() {
    pfpOpen = false;
    pfpSidebar.hidden = true;
    pfpTrigger.setAttribute("aria-expanded", "false");

    if (signupCluster) {
      signupCluster.classList.remove("is-pfp-open");
    }
  }

  pfpTrigger.addEventListener("click", () => {
    if (pfpOpen) closePfpSidebar();
    else openPfpSidebar();
  });

  closePfp.addEventListener("click", closePfpSidebar);

  // AI Design Logic & Listeners
  const btnCancelAi = document.getElementById("btnCancelAi");
  const btnGenerateAi = document.getElementById("btnGenerateAi");
  const pfpAiView = document.getElementById("pfpAiView");

  btnCancelAi.addEventListener("click", () => {
    pfpAiView.hidden = true;
    pfpSelectView.hidden = false;
  });

  btnGenerateAi.addEventListener("click", () => {
    const vibe = document.getElementById("aiVibe").value;
    const animal = document.getElementById("aiAnimal").value;
    const isExtra = document.querySelector('input[name="aiStyle"]:checked').value === "extra";

    // Simulate "AI" mapping based on traits
    const tpl = generateRandomTemplate();

    // Vibe influences base mood/colors
    if (vibe === "chill") {
      tpl.eye = "sleepy";
      tpl.mouth = "neutral";
      tpl.colors.bg = "d1d4f9";
    } else if (vibe === "energetic") {
      tpl.eye = "starry";
      tpl.mouth = "big_grin";
      tpl.colors.bg = "fef9c3";
    } else if (vibe === "mysterious") {
      tpl.eye = "cool";
      tpl.brows = "worried";
      tpl.colors.bg = "c0aede";
    } else if (vibe === "happy") {
      tpl.eye = "standard";
      tpl.mouth = "happy";
      tpl.colors.bg = "ffd6ea";
    }

    // Animal influences specific parts
    if (animal === "cat") tpl.extras = "cat_ears";
    if (animal === "owl") tpl.glasses = "thin_round";
    if (animal === "lion") tpl.hair = "afro";
    if (animal === "fox") tpl.brows = "angry";

    // Style filters complexity
    if (!isExtra) {
      tpl.extras = "none";
      tpl.masks = "none";
      tpl.glasses = "none";
    }

    // Apply traits to state
    Object.assign(avatarState.colors, tpl.colors);
    avatarState.face = tpl.face;
    avatarState.eye = tpl.eye;
    avatarState.brows = tpl.brows;
    avatarState.nose = tpl.nose;
    avatarState.blush = tpl.blush;
    avatarState.glasses = tpl.glasses;
    avatarState.masks = tpl.masks;
    avatarState.mouth = tpl.mouth;
    avatarState.hair = tpl.hair;
    avatarState.extras = tpl.extras;

    pfpAiView.hidden = true;
    pfpDesignView.hidden = false;
    updateOptionsGrid();
    refreshDesignPreview();
  });

  function generateRandomTemplate() {
    const getRandomKey = (obj) => {
      const keys = Object.keys(obj);
      return keys[Math.floor(Math.random() * keys.length)];
    };
    const getRandomColor = (list) => list[Math.floor(Math.random() * list.length)];

    return {
      face: getRandomKey(AVATAR_PARTS.face),
      eye: getRandomKey(AVATAR_PARTS.eye),
      brows: getRandomKey(AVATAR_PARTS.brows),
      nose: getRandomKey(AVATAR_PARTS.nose),
      blush: getRandomKey(AVATAR_PARTS.blush),
      glasses: getRandomKey(AVATAR_PARTS.glasses),
      masks: getRandomKey(AVATAR_PARTS.masks),
      mouth: getRandomKey(AVATAR_PARTS.mouth),
      hair: getRandomKey(AVATAR_PARTS.hair),
      extras: getRandomKey(AVATAR_PARTS.extras),
      colors: {
        bg: getRandomColor(PALETTE.bg),
        body: getRandomColor(PALETTE.body),
        hair: getRandomColor(PALETTE.hair),
        eye: getRandomColor(PALETTE.eye),
        line: "2d3436",
        blush: "ff7eb3"
      }
    };
  }

  function initPfpGrid() {
    pfpGrid.innerHTML = "";

    // 1. Upload Box
    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "pfp-preset special-box box-upload";
    upBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 16V8m0 0l-3 3m3-3l3 3m-8 5h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v7a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Upload</span>
    `;
    upBtn.addEventListener("click", () => pfpUpload.click());
    pfpGrid.appendChild(upBtn);

    // 2. Design Box
    const dsBtn = document.createElement("button");
    dsBtn.type = "button";
    dsBtn.className = "pfp-preset special-box box-design";
    dsBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Design</span>
    `;
    dsBtn.addEventListener("click", () => {
      pfpSelectView.hidden = true;
      pfpDesignView.hidden = false;
      updateOptionsGrid();
      refreshDesignPreview();
    });
    pfpGrid.appendChild(dsBtn);

    // 3. AI Box
    const aiBtn = document.createElement("button");
    aiBtn.type = "button";
    aiBtn.className = "pfp-preset special-box box-ai";
    aiBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3l1.912 5.885h6.192l-5.01 3.639 1.913 5.885-5.007-3.64-5.007 3.64 1.913-5.885-5.01-3.639h6.192z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>AI</span>
    `;
    aiBtn.addEventListener("click", () => {
      pfpSelectView.hidden = true;
      document.getElementById("pfpAiView").hidden = false;
    });
    pfpGrid.appendChild(aiBtn);

    // 4. Shuffle Box
    const shBtn = document.createElement("button");
    shBtn.type = "button";
    shBtn.className = "pfp-preset special-box box-shuffle";
    shBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Shuffle</span>
    `;
    shBtn.addEventListener("click", () => {
      initPfpGrid();
    });
    pfpGrid.appendChild(shBtn);

    // 5. Random Templates (20 options)
    for (let i = 0; i < 20; i++) {
      const tplState = generateRandomTemplate();
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pfp-preset";

      btn.innerHTML = renderAvatarSVG(tplState, 80);

      btn.addEventListener("click", () => {
        Object.assign(avatarState.colors, tplState.colors);
        avatarState.face = tplState.face;
        avatarState.eye = tplState.eye;
        avatarState.brows = tplState.brows;
        avatarState.nose = tplState.nose;
        avatarState.blush = tplState.blush;
        avatarState.glasses = tplState.glasses;
        avatarState.masks = tplState.masks;
        avatarState.mouth = tplState.mouth;
        avatarState.hair = tplState.hair;
        avatarState.extras = tplState.extras;

        // Open design view with this template
        pfpSelectView.hidden = true;
        pfpDesignView.hidden = false;

        updateOptionsGrid();
        refreshDesignPreview();
      });
      pfpGrid.appendChild(btn);
    }
  }

  initPfpGrid();

  // Design View Logic
  const categories = ["face", "eye", "brows", "nose", "blush", "glasses", "masks", "mouth", "hair", "colors"];
  let activeTab = "face";
  let activeColorTarget = "body"; // Default target when opening colors tab

  const COLOR_TARGETS = {
    body: "Skin",
    hair: "Hair",
    eye: "Eyes",
    line: "Lines",
    blush: "Blush",
    bg: "Bg"
  };

  // Color conversion helpers
  function hexToHsl(hex) {
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `${f(0)}${f(8)}${f(4)}`;
  }

  function renderAvatarSVG(state, size = 200) {
    let svg = `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;

    // Background
    svg += `<rect width="100" height="100" fill="#${state.colors.bg}"/>`;

    // Replace tokens
    const faceStr = AVATAR_PARTS.face[state.face]
      .replace(/{bodyColor}/g, `#${state.colors.body}`)
      .replace(/{lineColor}/g, `#${state.colors.line}`);

    const eyeStr = AVATAR_PARTS.eye[state.eye]
      .replace(/{eyeColor}/g, `#${state.colors.eye}`);

    const noseStr = AVATAR_PARTS.nose[state.nose || "none"]
      .replace(/{lineColor}/g, `#${state.colors.line}`)
      .replace(/{bodyColor}/g, `#${state.colors.body}`);

    const browStr = AVATAR_PARTS.brows[state.brows || "none"]
      .replace(/{hairColor}/g, `#${state.colors.hair}`);

    const blushStr = AVATAR_PARTS.blush[state.blush || "none"]
      .replace(/{blushColor}/g, `#${state.colors.blush}`);

    const glassesStr = AVATAR_PARTS.glasses[state.glasses || "none"]
      .replace(/{lineColor}/g, `#${state.colors.line}`);

    const maskStr = AVATAR_PARTS.masks[state.masks || "none"]
      .replace(/{lineColor}/g, `#${state.colors.line}`);

    const mouthStr = AVATAR_PARTS.mouth[state.mouth]
      .replace(/{lineColor}/g, `#${state.colors.line}`)
      .replace(/{blushColor}/g, `#${state.colors.blush}`);

    const hairStr = AVATAR_PARTS.hair[state.hair]
      .replace(/{hairColor}/g, `#${state.colors.hair}`);

    const extraStr = AVATAR_PARTS.extras[state.extras]
      .replace(/{lineColor}/g, `#${state.colors.line}`)
      .replace(/{hairColor}/g, `#${state.colors.hair}`);

    // Assemble SVG in correct layering order
    svg += hairStr;     // Behind
    svg += faceStr;     // Base
    svg += extraStr;    // Decor
    svg += blushStr;    // Cheeks
    svg += noseStr;     // Nose (New!)
    svg += eyeStr;      // Eyes
    svg += browStr;     // Brows
    svg += mouthStr;    // Mouth
    svg += glassesStr;  // Foreground
    svg += maskStr;     // Top Layer
    svg += `</svg>`;
    return svg;
  }

  function refreshDesignPreview() {
    designPreviewContainer.innerHTML = renderAvatarSVG(avatarState, 200);
  }

  // Real Face Eye Tracking logic
  designPreviewContainer.addEventListener("mousemove", (e) => {
    const svg = designPreviewContainer.querySelector("svg");
    if (!svg) return;

    const rect = designPreviewContainer.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    const eyes = svg.querySelectorAll(".avatar-eye");
    eyes.forEach(eye => {
      eye.style.transform = `translate(${x * 8}px, ${y * 8}px)`;
    });
  });

  designPreviewContainer.addEventListener("mouseleave", () => {
    const svg = designPreviewContainer.querySelector("svg");
    if (!svg) return;
    const eyes = svg.querySelectorAll(".avatar-eye");
    eyes.forEach(eye => {
      eye.style.transform = `translate(0, 0)`;
    });
  });

  function updateOptionsGrid() {
    designOptionsGrid.innerHTML = "";

    if (activeTab === "colors") {
      // 1. Selector for what we are coloring
      const targetWrap = document.createElement("div");
      targetWrap.className = "color-target-selector";
      Object.entries(COLOR_TARGETS).forEach(([id, label]) => {
        const btn = document.createElement("button");
        btn.textContent = label;
        btn.className = `target-btn ${activeColorTarget === id ? "active" : ""}`;
        btn.addEventListener("click", () => {
          activeColorTarget = id;
          updateOptionsGrid();
        });
        targetWrap.appendChild(btn);
      });
      designOptionsGrid.appendChild(targetWrap);

      // 2. Sliders
      const slidersWrap = document.createElement("div");
      slidersWrap.className = "color-sliders-wrap";

      const currentHex = avatarState.colors[activeColorTarget];
      const [h, s, l] = hexToHsl(currentHex);

      const createSlider = (label, val, min, max, unit, updateFn) => {
        const row = document.createElement("div");
        row.className = "slider-row";
        const sliderClass = `slider-${label.toLowerCase().substring(0, 3)}`;
        row.innerHTML = `<label><span>${label}</span> <span>${val}${unit}</span></label>
                         <input type="range" class="${sliderClass}" min="${min}" max="${max}" value="${val}">`;
        row.querySelector("input").addEventListener("input", (e) => {
          updateFn(parseInt(e.target.value));
          row.querySelector("label span:last-child").textContent = `${e.target.value}${unit}`;
          refreshDesignPreview();
        });
        return row;
      };

      slidersWrap.appendChild(createSlider("Hue", h, 0, 360, "°", (v) => {
        const [_, s_curr, l_curr] = hexToHsl(avatarState.colors[activeColorTarget]);
        avatarState.colors[activeColorTarget] = hslToHex(v, s_curr, l_curr);
      }));

      slidersWrap.appendChild(createSlider("Sat", s, 0, 100, "%", (v) => {
        const [h_curr, _, l_curr] = hexToHsl(avatarState.colors[activeColorTarget]);
        avatarState.colors[activeColorTarget] = hslToHex(h_curr, v, l_curr);
      }));

      slidersWrap.appendChild(createSlider("Bright", l, 0, 100, "%", (v) => {
        const [h_curr, s_curr, _] = hexToHsl(avatarState.colors[activeColorTarget]);
        avatarState.colors[activeColorTarget] = hslToHex(h_curr, s_curr, v);
      }));

      designOptionsGrid.appendChild(slidersWrap);
      return;
    }

    const items = AVATAR_PARTS[activeTab];
    Object.keys(items).forEach(key => {
      const box = document.createElement("div");
      box.className = `option-box ${avatarState[activeTab] === key ? "active" : ""}`;

      // Mini preview
      const miniState = { ...avatarState, [activeTab]: key };
      miniState.colors = { ...avatarState.colors, bg: "f8f9fa" };
      box.innerHTML = renderAvatarSVG(miniState, 60);

      box.addEventListener("click", () => {
        avatarState[activeTab] = key;
        updateOptionsGrid();
        refreshDesignPreview();
      });
      designOptionsGrid.appendChild(box);
    });
  }

  function initCategoryCarousel() {
    categoryStrip.innerHTML = "";
    categories.forEach(cat => {
      const item = document.createElement("div");
      item.className = `category-item ${activeTab === cat ? "active" : ""}`;
      item.textContent = cat;
      item.addEventListener("click", () => {
        activeTab = cat;
        updateCategoryUI();
      });
      categoryStrip.appendChild(item);
    });
    updateCategoryUI();
  }

  function updateCategoryUI() {
    const items = categoryStrip.querySelectorAll(".category-item");
    let targetIndex = categories.indexOf(activeTab);

    items.forEach((item, i) => {
      if (i === targetIndex) {
        item.classList.add("active");
        item.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } else {
        item.classList.remove("active");
      }
    });

    updateOptionsGrid();
  }

  // Desktop Drag-to-Scroll Logic
  let isDown = false;
  let startXNav;
  let scrollLeft;

  categoryCarousel.addEventListener('mousedown', (e) => {
    isDown = true;
    categoryCarousel.classList.add('active-dragging');
    startXNav = e.pageX - categoryCarousel.offsetLeft;
    scrollLeft = categoryCarousel.scrollLeft;
  });

  categoryCarousel.addEventListener('mouseleave', () => {
    isDown = false;
    categoryCarousel.classList.remove('active-dragging');
  });

  categoryCarousel.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    categoryCarousel.classList.remove('active-dragging');

    // Snap to nearest item after drag
    const items = categoryStrip.querySelectorAll(".category-item");
    const carouselRect = categoryCarousel.getBoundingClientRect();
    const carouselMid = carouselRect.left + carouselRect.width / 2;

    let closestCat = activeTab;
    let minDistance = Infinity;

    items.forEach((item, i) => {
      const rect = item.getBoundingClientRect();
      const itemCenter = rect.left + rect.width / 2;
      const dist = Math.abs(carouselMid - itemCenter);

      if (dist < minDistance) {
        minDistance = dist;
        closestCat = categories[i];
      }
    });

    if (closestCat !== activeTab) {
      activeTab = closestCat;
      updateCategoryUI();
    } else {
      // Re-center current even if it's the same
      updateCategoryUI();
    }
  });

  categoryCarousel.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - categoryCarousel.offsetLeft;
    const walk = (x - startXNav) * 1.5;
    categoryCarousel.scrollLeft = scrollLeft - walk;
  });

  initCategoryCarousel();



  btnCancelDesign.addEventListener("click", () => {
    pfpDesignView.hidden = true;
    pfpSelectView.hidden = false;
  });

  btnSaveDesign.addEventListener("click", () => {
    const svgData = renderAvatarSVG(avatarState, 500);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    setPfpPreview(blob);
    pfpDesignView.hidden = true;
    pfpSelectView.hidden = false;
    closePfpSidebar();
  });

  // Initial populate
  updateOptionsGrid();
  refreshDesignPreview();

  function setPfpPreview(blob) {
    pfpBlob = blob;
    pfpPreview.innerHTML = "";
    const img = document.createElement("img");
    img.src = URL.createObjectURL(blob);
    pfpPreview.appendChild(img);
    pfpTrigger.classList.add("has-image");
  }

  // PFP Image Editor Logic
  let editImg = new Image();
  let editRot = 0;
  let editFlip = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0, startY = 0;
  let editorScale = 1;

  function resetEditor() {
    editRot = 0;
    editFlip = 1;
    panX = 0;
    panY = 0;
    valBrightness.value = 100;
    valContrast.value = 100;
  }

  pfpUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    resetEditor();

    const url = URL.createObjectURL(file);
    editImg.onload = () => {
      pfpSelectView.hidden = true;
      pfpEditView.hidden = false;

      const wrapW = 340 - 48; // side card width minus padding
      editorCanvas.width = wrapW * 2;
      editorCanvas.height = wrapW * 2;
      editorCanvas.style.width = wrapW + "px";
      editorCanvas.style.height = wrapW + "px";

      editorScale = Math.max(editorCanvas.width / editImg.width, editorCanvas.height / editImg.height);

      drawEditor();
      pfpUpload.value = "";
    };
    editImg.src = url;
  });

  btnCancelEdit.addEventListener("click", () => {
    pfpSelectView.hidden = false;
    pfpEditView.hidden = true;
  });

  btnRotateC.addEventListener("click", () => { editRot += 90; drawEditor(); });
  btnFlipH.addEventListener("click", () => { editFlip *= -1; drawEditor(); });
  valBrightness.addEventListener("input", drawEditor);
  valContrast.addEventListener("input", drawEditor);

  function drawEditor() {
    const cw = editorCanvas.width;
    const ch = editorCanvas.height;

    editorCtx.clearRect(0, 0, cw, ch);

    editorCtx.save();
    editorCtx.translate(cw / 2 + panX, ch / 2 + panY);
    editorCtx.rotate((editRot * Math.PI) / 180);
    editorCtx.scale(editFlip * editorScale, editorScale);

    editorCtx.filter = `brightness(${valBrightness.value}%) contrast(${valContrast.value}%)`;

    editorCtx.drawImage(editImg, -editImg.width / 2, -editImg.height / 2);
    editorCtx.restore();
  }

  editorCanvas.addEventListener("pointerdown", (e) => {
    isDragging = true;
    startX = e.clientX - (panX / 2);
    startY = e.clientY - (panY / 2);
    editorCanvas.setPointerCapture(e.pointerId);
  });

  editorCanvas.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    panX = (e.clientX - startX) * 2;
    panY = (e.clientY - startY) * 2;
    drawEditor();
  });

  editorCanvas.addEventListener("pointerup", (e) => {
    isDragging = false;
    editorCanvas.releasePointerCapture(e.pointerId);
  });

  btnSaveEdit.addEventListener("click", () => {
    editorCanvas.toBlob((blob) => {
      setPfpPreview(blob);
      pfpSelectView.hidden = false;
      pfpEditView.hidden = true;
      closePfpSidebar();
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const handle = handleInput.value.trim();

    if (!name) {
      shakeField(nameInput.closest(".field"));
      setMood("sad");
      showToast("What should we call you?");
      nameInput.focus();
      return;
    }

    if (!handle || !handlePattern.test(handle)) {
      shakeField(handleInput.closest(".field"));
      setMood("sad");
      showToast("Handle: 2–10 letters, numbers, dots, or underscores.");
      handleInput.focus();
      return;
    }

    if (!selectedISO || !dobInput.value) {
      const v = dobTypeInput.value.trim();
      const d = parseDMY(v);
      if (d && d <= new Date()) {
        applyDateInternal(d);
      }
    }

    if (!selectedISO || !dobInput.value) {
      shakeField(dobField);
      setMood("sad");
      showToast("Please enter your birthday.");
      openBirthdayPicker();
      return;
    }

    setMood("");
    submitBtn.classList.add("loading");
    submitBtn.querySelector(".btn-text").textContent = "Saving…";

    setTimeout(() => {
      submitBtn.classList.remove("loading");
      submitBtn.querySelector(".btn-text").textContent = "Save & continue";
      setMood("happy");
      burstConfetti();
      const pretty = dateDisplay.textContent;
      showToast(`Nice to meet you, ${name}! @${handle} · ${pretty}`);
    }, 900);
  });
})();
