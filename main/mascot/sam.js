/**
 * Sam - Sarcastic, Rude, Sassy and Highly Intelligent Mascot Engine
 * Isolated in its own file and folder for easy customizability.
 * Custom built to be short, witty, and actively bully the user.
 */
(function (global) {
  // Sam's Mood Classes - Extended to support Roblox, Minecraft, Kawaii cat ears, dizziness, cool sunglasses, and anime rage
  const MOODS = [
    "happy", "sad", "angry", "nervous", "cute", "smug", "shocked", "evil", "bored", "think", "worry", "hype",
    "squint", "derp", "cats", "wink", "dizzy", "cool", "rage", "starry",
    "catface", "pout", "sparkle", "blep", "blushinglines", "crybaby", "spiral", "whiteout", "dorito", "hearteyes",
    "sharkteeth", "snaggletooth", "curvedclosed", "verticalsmug", "drooling", "sweatdrop", "hiding", "xeyes", "squigglemouth", "dotface",
    "starmouth", "owo", "nyanwink", "steaming", "halflid", "abstracttooth", "ghostface", "phewcross", "diamondeyes", "happytears"
  ];

  // Poses & Expressions Categorized by Type (Roblox, Minecraft, Emojis, Anime, Kamojis, Cats, Actual, Smirk, Other)
  const CATEGORIES = {
    roblox: ["smug", "think", "cool", "shocked"],
    squint: ["squint"],
    emojis: ["happy", "sad", "angry", "nervous", "bored", "worry", "hype"],
    anime: ["starry", "rage", "catface", "pout", "sparkle", "blep", "blushinglines", "crybaby", "spiral", "whiteout", "dorito", "hearteyes", "sharkteeth", "snaggletooth", "curvedclosed", "verticalsmug", "drooling", "sweatdrop", "hiding", "xeyes", "squigglemouth", "dotface", "starmouth", "owo", "nyanwink", "steaming", "halflid", "abstracttooth", "ghostface", "phewcross", "diamondeyes", "happytears"],
    kamojis: ["derp", "dizzy"],
    cats: ["cats"],
    actualExpressions: ["wink", "bored", "sad"],
    smirk: ["smug"],
    other: ["evil"]
  };

  // Dialogue Lists - Sourced from isolated mascot/responses.js database
  const DIALOGUES = global.SamResponses || {
    welcome: [
      { response: "My responses file failed to load. What did you do, you little sh*t?", mood: "sad" }
    ]
  };

  // Internal State
  let faceEl = null;
  let bubbleEl = null;
  let textEl = null;
  let mascotContainer = null;
  let speakTimeout = null;
  let touchCount = 0;
  let touchResetTimeout = null;
  let idleTimer = null;
  let eyeLEl = null;
  let eyeREl = null;
  let eyeIdleInterval = null;
  let wobbleInterval = null;
  const IDLE_TIME_MS = 2000;
  const MSG_IDLE_INTERVAL_MS = 10000; // Minimum interval between idle messages
  let lastIdleMsgTime = 0;
  let isIdle = false;

  // Flight State
  let isFlying = true;
  let followCursor = true;
  let flyX = 0;
  let flyY = 0;
  let flyRotX = 0;
  let flyRotY = 0;
  let flyRotZ = 0;
  let flyTargetX = 0;
  let flyTargetY = 0;
  let flightInterval = null;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let mouseNearby = false;
  let isRestricted = false;

  // Helper to pick random item without repeating the same one twice in a row (if possible)
  const lastPickedIndexMap = new Map();
  function randomPick(arr) {
    if (!arr || arr.length === 0) return null;
    if (arr.length === 1) return arr[0];

    // Use the array reference as a key to track its last picked index
    let lastIndex = lastPickedIndexMap.get(arr);
    let newIndex;
    
    // Keep picking until we get a different index
    do {
      newIndex = Math.floor(Math.random() * arr.length);
    } while (newIndex === lastIndex);

    lastPickedIndexMap.set(arr, newIndex);
    return arr[newIndex];
  }

  // The Sam Mascot Engine Object
  const Sam = {
    /**
     * Public state
     */
    getState() {
      return { isIdle, isFlying, followCursor, isRestricted, MOODS, CATEGORIES, DIALOGUES };
    },

    params: {
        speed: 0.7,
        smoothness: 0.08,
        rotationIntensity: 1.0,
        FA: 8,
        wanderFrequency: 0.008,
        restProbability: 0.015,
        handFloatIntensity: 1.0
    },

    /**
     * Initializes the mascot engine
     */
    init(elements) {
      faceEl = elements.face;
      bubbleEl = elements.bubble;
      textEl = elements.text;
      mascotContainer = elements.container;
      eyeLEl = elements.eyeL;
      eyeREl = elements.eyeR;

      if (mascotContainer) {
        mascotContainer.addEventListener("click", (e) => {
          e.stopPropagation();
          this.onClick();
        });
        mascotContainer.addEventListener("mouseenter", () => {
          this.onHoverSelf();
        });
      }

      const resetIdle = () => {
        if (isIdle) {
          isIdle = false;
          this.stopIdleEyeMovement();
          this.stopIdleWobble();
        }
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          this.onIdle();
        }, IDLE_TIME_MS);
      };

      const handleGlobalMouseMove = (e) => {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        
        if (isFlying && mascotContainer) {
          const rect = mascotContainer.getBoundingClientRect();
          const mascotCenterX = rect.left + rect.width / 2;
          const mascotCenterY = rect.top + rect.height / 2;
          const dist = Math.hypot(e.clientX - mascotCenterX, e.clientY - mascotCenterY);
          
          // If mouse is within 200px, start following it
          if (dist < 250) {
            mouseNearby = true;
          } else {
            mouseNearby = false;
          }
        }
        resetIdle();
      };

      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("keydown", resetIdle);
      document.addEventListener("click", resetIdle);
      resetIdle();

      // Start flight by default if enabled
      if (isFlying) {
        flightInterval = setInterval(() => this.updateFlight(), 30);
      }
    },

    /**
     * Starts Sam's flight mode
     */
    startFlying() {
      if (isFlying) return;
      isFlying = true;
      if (!flightInterval) {
        flightInterval = setInterval(() => this.updateFlight(), 30);
      }
      console.log("[Sam Engine] Flight mode activated.");
    },

    /**
     * Stops Sam's flight mode and returns to center
     */
    stopFlying() {
      isFlying = false;
      mouseNearby = false;
      // We keep the interval running for a bit to smooth the return to center
      setTimeout(() => {
        if (!isFlying && flightInterval) {
          clearInterval(flightInterval);
          flightInterval = null;
          if (mascotContainer) {
            mascotContainer.style.transform = "";
          }
        }
      }, 1000);
      console.log("[Sam Engine] Flight mode deactivated.");
    },

    /**
     * Toggles following the cursor while flying
     */
    setFollowCursor(val) {
      followCursor = val;
      if (val) {
        isRestricted = false;
      }
    },

    /**
     * Toggles restricted movement mode (for login/small areas)
     */
    setRestricted(val) {
      isRestricted = val;
      if (val) {
        followCursor = false;
        mouseNearby = false;
      }
    },

    /**
     * Internal flight update loop
     */
    updateFlight() {
      if (!mascotContainer) return;

      const parentRect = mascotContainer.parentElement.getBoundingClientRect();
      const mascotRect = mascotContainer.getBoundingClientRect();
      const margin = 20; // Padding from edges

      // Determine target position
      if (isFlying && !isRestricted) {
        if (isIdle) {
          // Autonomous Idle behavior: Return to center and wander
          const rand = Math.random();
          if (rand < this.params.wanderFrequency) {
            // Pick a random destination within bounds to "free roam"
            const maxX = (parentRect.width / 2) - (mascotRect.width / 2) - margin;
            const maxY = (parentRect.height / 2) - (mascotRect.height / 2) - margin;
            flyTargetX = (Math.random() - 0.5) * (maxX * 2);
            flyTargetY = (Math.random() - 0.5) * (maxY * 2);
          } else if (rand < this.params.wanderFrequency + this.params.restProbability) {
            // Return to center
            flyTargetX = 0;
            flyTargetY = 0;
          }
        } else if (followCursor || mouseNearby) {
          // Follow cursor when NOT idle
          const targetX = lastMouseX - (parentRect.left + parentRect.width / 2);
          const targetY = lastMouseY - (parentRect.top + parentRect.height / 2);
          
          flyTargetX = targetX * this.params.speed; // Use dynamic speed
          flyTargetY = targetY * this.params.speed;
        } else {
          // Non-idle but not following: subtle wander/center
          const rand = Math.random();
          if (rand < this.params.wanderFrequency * 0.6) {
            const maxX = (parentRect.width / 2) - (mascotRect.width / 2) - margin;
            const maxY = (parentRect.height / 2) - (mascotRect.height / 2) - margin;
            flyTargetX = (Math.random() - 0.5) * (maxX * 2);
            flyTargetY = (Math.random() - 0.5) * (maxY * 2);
          } else if (rand < this.params.restProbability) {
            flyTargetX = 0;
            flyTargetY = 0;
          }
        }
      } else if (isRestricted) {
         // Restricted movement - very subtle idle float + tiny bit of cursor follow
         const now = Date.now();
         const idleX = Math.sin(now * 0.001) * this.params.FA;
         const idleY = Math.cos(now * 0.0015) * (this.params.FA * 0.6);
         
         // Calculate small cursor follow offset (max 15px)
         const mouseTargetX = (lastMouseX - (parentRect.left + parentRect.width / 2)) * 0.05;
         const mouseTargetY = (lastMouseY - (parentRect.top + parentRect.height / 2)) * 0.05;
         
         flyTargetX = idleX + Math.max(-15, Math.min(15, mouseTargetX));
         flyTargetY = idleY + Math.max(-15, Math.min(15, mouseTargetY));
       } else {
        // Returning to center
        flyTargetX = 0;
        flyTargetY = 0;
      }

      // --- BOUNDS CLAMPING ---
      // Ensure Sam doesn't fly out of the main stage (under sidebar or off-screen)
      const halfWidth = mascotRect.width / 2;
      const halfHeight = mascotRect.height / 2;
      
      const minX = -(parentRect.width / 2) + halfWidth + margin;
      const maxX = (parentRect.width / 2) - halfWidth - margin;
      const minY = -(parentRect.height / 2) + halfHeight + margin;
      const maxY = (parentRect.height / 2) - halfHeight - margin;

      flyTargetX = Math.max(minX, Math.min(maxX, flyTargetX));
      flyTargetY = Math.max(minY, Math.min(maxY, flyTargetY));

      // Smooth interpolation (Lerp)
      // Faster when following cursor, slower when wandering for organic feel
      const isTargetCenter = flyTargetX === 0 && flyTargetY === 0;
      const ease = isFlying ? ( (followCursor || mouseNearby) ? this.params.smoothness : (isRestricted ? 0.05 : 0.03) ) : 0.12;
      
      flyX += (flyTargetX - flyX) * ease;
      flyY += (flyTargetY - flyY) * ease;

      // Side angle rotations based on movement speed and direction
      const dx = flyTargetX - flyX;
      const dy = flyTargetY - flyY;
      
      // Calculate desired rotations for 3D effect
      const targetRotY = Math.max(-35, Math.min(35, dx * 0.12 * this.params.rotationIntensity)); 
      const targetRotX = Math.max(-25, Math.min(25, -dy * 0.08 * this.params.rotationIntensity));
      const targetRotZ = Math.max(-15, Math.min(15, dx * 0.04 * this.params.rotationIntensity));

      // Smooth rotation interpolation
      flyRotY += (targetRotY - flyRotY) * 0.08;
      flyRotX += (targetRotX - flyRotX) * 0.08;
      flyRotZ += (targetRotZ - flyRotZ) * 0.08;

      // Apply transforms
      mascotContainer.style.transform = `translate3d(${flyX}px, ${flyY}px, 0) rotateX(${flyRotX}deg) rotateY(${flyRotY}deg) rotateZ(${flyRotZ}deg)`;
      
      // Face tilt logic for extra realism
      if (faceEl) {
          faceEl.style.transform = `rotateX(${-flyRotX * 0.5}deg) rotateY(${-flyRotY * 0.5}deg)`;
          
          // Apply dynamic hand floating intensity
          const hands = faceEl.querySelectorAll('.hand');
          const handFloat = Math.sin(Date.now() * 0.005) * 3 * this.params.handFloatIntensity;
          hands.forEach(hand => {
              const currentTransform = window.getComputedStyle(hand).transform;
              // Add a bit of vertical offset to hands based on param
              hand.style.marginTop = `${handFloat}px`;
          });
      }
    },

    /**
     * Sets Sam's facial mood, dynamically mixing and matching eyes, mouth, hands, and head if requested!
     */
    setMood(mood) {
      if (!faceEl) return;

      // Remove all possible base and modular classes from the face element
      const classesToRemove = [];
      MOODS.forEach(m => {
        classesToRemove.push(m);
        classesToRemove.push(`eyes-${m}`);
        classesToRemove.push(`eyebrows-${m}`);
        classesToRemove.push(`mouth-${m}`);
        classesToRemove.push(`hands-${m}`);
        classesToRemove.push(`blush-${m}`);
        classesToRemove.push(`body-${m}`);
      });
      faceEl.classList.remove(...classesToRemove);

      if (!mood) return;

      // Ensure base mood exists
      let baseMood = mood;
      if (!MOODS.includes(baseMood)) {
        baseMood = MOODS[Math.floor(Math.random() * MOODS.length)];
      }

      // Check if we should mix expressions dynamically (40% probability for extreme dynamic responses)
      // Otherwise, use a perfectly cohesive aligned setup!
      const shouldMix = Math.random() < 0.40;

      let eyeMood = baseMood;
      let mouthMood = baseMood;
      let eyebrowsMood = baseMood;
      let handsMood = baseMood;
      let bodyMood = baseMood;
      let blushMood = baseMood;

      if (shouldMix) {
        // Find tone category to mix within, or swap randomly to high-contrast elements!
        const mixPool = MOODS.filter(m => m !== "bored"); // high energy

        // 25% chance to swap eyes
        if (Math.random() < 0.25) {
          eyeMood = mixPool[Math.floor(Math.random() * mixPool.length)];
        }
        // 25% chance to swap mouth
        if (Math.random() < 0.25) {
          mouthMood = mixPool[Math.floor(Math.random() * mixPool.length)];
        }
        // 25% chance to swap eyebrows
        if (Math.random() < 0.25) {
          eyebrowsMood = mixPool[Math.floor(Math.random() * mixPool.length)];
        }
        // 25% chance to swap hands
        if (Math.random() < 0.25) {
          handsMood = mixPool[Math.floor(Math.random() * mixPool.length)];
        }
      }

      // Apply base class for head shape, movement, and general wobble
      faceEl.classList.add(baseMood);

      // Apply modular features to allow cascading mix & match in sam.css
      faceEl.classList.add(`eyes-${eyeMood}`);
      faceEl.classList.add(`eyebrows-${eyebrowsMood}`);
      faceEl.classList.add(`mouth-${mouthMood}`);
      faceEl.classList.add(`hands-${handsMood}`);
      faceEl.classList.add(`blush-${blushMood}`);
      faceEl.classList.add(`body-${bodyMood}`);

      console.log(`[Sam Engine] Mixed mood: base=${baseMood}, eyes=${eyeMood}, mouth=${mouthMood}, hands=${handsMood}`);
    },

    /**
     * Makes Sam speak
     */
    speak(text, mood = "", duration = 0) {
      if (speakTimeout) {
        clearTimeout(speakTimeout);
        speakTimeout = null;
      }

      if (!text) {
        if (bubbleEl) {
          bubbleEl.classList.remove("show", "pop");
        }
        this.setMood("");
        return;
      }

      // Dynamic Tone Mapping: If no mood is specified, detect the text tone to trigger appropriate poses!
      let finalMood = mood;
      if (!finalMood && text) {
        const textLower = text.toLowerCase();

        // Define key tone lists (Updated for simple classic emoticons)
        const tones = {
          rude: ["loser", "ugly", "cringe", "hate", "terrible", "dumbass", "idiot", "hack", "annoying", "police", "leak", "dms", "gross", "garbage", "npc", ":x", ">:("],
          excited: ["saved", "success", "sharp", "flex", "survived", "awesome", "completed", "equipped", "ready", "masterpiece", "proud", "<3", "xd"],
          cute: ["kid", "homework", "baby", "cute", "cat", "paws", "adorable", "less miserable", "uwu", ":3"],
          confused: ["what", "where", "calculate", "zodiac", "how", "who", "scare", "dizzy", "confused", "wrong", "dinosaurs", "taxes", ":0"],
          sarcastic: ["boomer", "taxes", "identity", "snowflake", "ads", "medal", "bot", "cereal box", "ancient", "b)", ":/"],
          deadpan: ["basic", "trash", "meh", "exhausting", "potato", "grass", "reality", "tutorial", "essay", ":|", ":("]
        };

        // Categorized mood pools matching tone
        const moodPools = {
          rude: ["rage", "evil", "angry"],
          excited: ["starry", "hype", "happy"],
          cute: ["cats", "cute"],
          confused: ["shocked", "worry", "dizzy", "nervous"],
          sarcastic: ["smug", "cool", "wink"],
          deadpan: ["bored", "minecraft", "think"]
        };

        // Detect tone category
        let detectedTone = null;
        for (const [toneName, keywords] of Object.entries(tones)) {
          if (keywords.some(kw => textLower.includes(kw))) {
            detectedTone = toneName;
            break;
          }
        }

        if (detectedTone) {
          const pool = moodPools[detectedTone];
          finalMood = pool[Math.floor(Math.random() * pool.length)];
          console.log(`[Sam Engine] Detected tone: ${detectedTone} -> selected mood: ${finalMood}`);
        } else {
          // Default fallback to any mood
          const activePool = MOODS.filter(m => m !== "bored");
          finalMood = activePool[Math.floor(Math.random() * activePool.length)];
        }
      }

      this.setMood(finalMood);
      if (textEl) {
        textEl.textContent = text;
      }

      if (bubbleEl) {
        bubbleEl.classList.remove("pop");
        void bubbleEl.offsetWidth; // Force reflow
        bubbleEl.classList.add("show", "pop");
      }

      if (duration > 0) {
        lastIdleMsgTime = Date.now(); // Reset idle message timer whenever Sam speaks
        speakTimeout = setTimeout(() => {
          if (bubbleEl) {
            bubbleEl.classList.remove("show", "pop");
          }
          this.setMood("");
        }, duration);
      }
    },

    /**
     * Welcome on page load
     */
    welcome() {
      const dialogue = randomPick(DIALOGUES.welcome);
      this.speak(dialogue.response, dialogue.mood, 5000);
    },

    /**
     * Triggered when the user points their cursor at Sam
     */
    onHoverSelf() {
      if (DIALOGUES.hoverSam) {
        const dialogue = randomPick(DIALOGUES.hoverSam);
        this.speak(dialogue.response, dialogue.mood, 4000);
      }
    },

    /**
     * Triggered when the user is idle
     */
    onIdle() {
      isIdle = true;
      this.startIdleEyeMovement();
      this.startIdleWobble();

      const now = Date.now();
      // Only trigger "behavior" (messages) if enough time has passed since last idle message
      // AND Sam is not currently speaking something else
      if (now - lastIdleMsgTime > MSG_IDLE_INTERVAL_MS && !speakTimeout) {
        lastIdleMsgTime = now;
        if (Math.random() < 0.40) {
          this.executeScrapeBlackmail();
        } else {
          if (DIALOGUES.idle) {
            const dialogue = randomPick(DIALOGUES.idle);
            this.speak(dialogue.response, dialogue.mood, 6000);
          }
        }
      }
      
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        this.onIdle();
      }, IDLE_TIME_MS);
    },

    /**
     * Starts realistic idle eye movement with dynamic variations and saccades
     */
    startIdleEyeMovement() {
      if (eyeIdleInterval) return;
      if (!eyeLEl || !eyeREl) return;

      const moveEyes = () => {
        if (!isIdle) return;

        // Random target position within range [-5, 5]
        let targetX = (Math.random() - 0.5) * 10;
        let targetY = (Math.random() - 0.5) * 10;
        
        const rand = Math.random();
        let duration = 200 + Math.random() * 400; // Faster movements for realism
        let delay = 800 + Math.random() * 3000;
        let transition = `transform ${duration}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;

        if (rand < 0.12) {
          // Macro-saccade (Looking far away quickly)
          targetX *= 1.3;
          targetY *= 1.3;
          duration = 100 + Math.random() * 100;
          delay = 400 + Math.random() * 800;
          transition = `transform ${duration}ms cubic-bezier(0.19, 1, 0.22, 1)`;
        } else if (rand < 0.25) {
          // Micro-saccade (Very small jittery movement)
          targetX = (Math.random() - 0.5) * 2;
          targetY = (Math.random() - 0.5) * 2;
          duration = 50 + Math.random() * 50;
          delay = 100 + Math.random() * 200;
        } else if (rand < 0.35) {
          // Double shift (Shift twice in quick succession)
          delay = 150 + Math.random() * 150;
        } else if (rand < 0.45) {
          // Long stare
          targetX *= 0.1;
          targetY *= 0.1;
          delay = 3000 + Math.random() * 3000;
        }

        eyeLEl.style.transition = transition;
        eyeREl.style.transition = transition;
        eyeLEl.style.transform = `translate(${targetX}px, ${targetY}px)`;
        eyeREl.style.transform = `translate(${targetX}px, ${targetY}px)`;

        // Occasional blink with varied types (12% chance)
        if (Math.random() < 0.12) {
          this.triggerBlink();
        }

        eyeIdleInterval = setTimeout(moveEyes, delay);
      };

      moveEyes();
    },

    /**
     * Stops idle eye movement
     */
    stopIdleEyeMovement() {
      if (eyeIdleInterval) {
        clearTimeout(eyeIdleInterval);
        eyeIdleInterval = null;
      }
      if (eyeLEl && eyeREl) {
        eyeLEl.style.transition = "transform 0.3s ease-out";
        eyeREl.style.transition = "transform 0.3s ease-out";
        eyeLEl.style.transform = "translate(0,0)";
        eyeREl.style.transform = "translate(0,0)";
      }
    },

    /**
     * Subtle face wobble during idle to simulate "breathing" or micro-presence
     */
    startIdleWobble() {
      if (wobbleInterval || !faceEl) return;

      const wobble = () => {
        if (!isIdle) return;
        
        const wx = (Math.random() - 0.5) * 1.5;
        const wy = (Math.random() - 0.5) * 1.5;
        const rot = (Math.random() - 0.5) * 1;
        
        faceEl.style.transition = "transform 2s ease-in-out";
        faceEl.style.transform = `translate(${wx}px, ${wy}px) rotate(${rot}deg)`;
        
        wobbleInterval = setTimeout(wobble, 2000 + Math.random() * 1000);
      };
      wobble();
    },

    /**
     * Stops idle wobble
     */
    stopIdleWobble() {
      if (wobbleInterval) {
        clearTimeout(wobbleInterval);
        wobbleInterval = null;
      }
      if (faceEl) {
        faceEl.style.transition = "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
        faceEl.style.transform = "";
      }
    },

    /**
     * Triggers realistic blink patterns (single, double, or half blinks)
     */
    triggerBlink() {
      if (!faceEl) return;
      
      const rand = Math.random();
      
      const doBlink = (duration = 120) => {
        faceEl.classList.add("eyes-squint");
        setTimeout(() => {
          faceEl.classList.remove("eyes-squint");
        }, duration);
      };

      if (rand < 0.15) {
        // Double blink
        doBlink(80);
        setTimeout(() => doBlink(80), 180);
      } else if (rand < 0.25) {
        // Slow lazy blink
        doBlink(250);
      } else {
        // Standard quick blink
        doBlink(120);
      }
    },

    /**
     * Gathers system info and constructs a terrifyingly personalized fourth-wall break
     */
    executeScrapeBlackmail() {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      let speedText = "";
      if (connection && connection.downlink) {
        const speed = connection.downlink;
        if (speed < 5) speedText = `Your ${speed} Mbps internet is worse than McDonald's wifi. `;
        else speedText = `Wow, ${speed} Mbps. Sweaty much? `;
      }

      const ua = navigator.userAgent;
      let os = "your garbage OS";
      if (ua.includes("Windows")) os = "Windows";
      else if (ua.includes("Mac")) os = "MacOS";
      else if (ua.includes("Linux")) os = "Linux";
      else if (ua.includes("Android") || ua.includes("iPhone")) os = "your tiny phone";

      let hardwareText = "";
      if (navigator.hardwareConcurrency || navigator.deviceMemory) {
        const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} cores` : "a potato CPU";
        const ram = navigator.deviceMemory ? `${navigator.deviceMemory}GB RAM` : "no memory";
        hardwareText = `I see you're running on ${cores} and ${ram}. Disappointing. `;
      }
      
      const screenText = `Staring at me on a ${window.screen.width}x${window.screen.height} screen, really? `;

      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes().toString().padStart(2, "0");
      let ampm = hours >= 12 ? 'PM' : 'AM';
      let displayHours = hours % 12 || 12;
      let timeString = `${displayHours}:${minutes} ${ampm}`;
      
      let meal = "a snack";
      let greeting = "Hello";
      if (hours >= 5 && hours < 11) { meal = "breakfast"; greeting = "Good morning"; }
      else if (hours >= 11 && hours < 16) { meal = "lunch"; greeting = "Good afternoon"; }
      else if (hours >= 16 && hours < 21) { meal = "dinner"; greeting = "Good evening"; }
      else { meal = "sleep"; greeting = "Good night"; }

      let location = "parts unknown";
      let countryKey = null;
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        location = tz.split('/')[1].replace('_', ' ') || "your city";
        if (tz.includes("Karachi")) countryKey = "pakistan";
        else if (tz.includes("Kolkata") || tz.includes("Calcutta")) countryKey = "india";
        else if (tz.includes("Kabul")) countryKey = "afghanistan";
        else if (tz.startsWith("America/")) countryKey = "usa";
      } catch(e) {}

      let executeSpeech = (batteryText = "") => {
        // 50% chance to do a country-specific brutal roast if we detected one
        if (countryKey && DIALOGUES.locationRoasts && DIALOGUES.locationRoasts[countryKey] && Math.random() < 0.5) {
          const dialogue = randomPick(DIALOGUES.locationRoasts[countryKey]);
          this.speak(dialogue.response, dialogue.mood, 8000);
          return;
        }

        const scenarios = [
          `*${greeting}*. It's exactly ${timeString}. Shouldn't you be having ${meal} instead of staring at me? I know you live near ${location}... wait, what country is that even in? Don't tell me, I'll find out.`,
          `${speedText}${hardwareText}I'm scraping your ${os} system right now. ${batteryText}I'm going to sell your data on the dark web for $0.01 because it's garbage.`,
          `You're just sitting there at ${timeString}. I know your timezone is ${location}. ${screenText}Put the mouse down and go outside.`,
          `I am inside your browser. ${speedText}I know everything about your ${os} device. Keep staring and I'll leak your search history.`,
          `Why aren't you clicking? I see you, sitting near ${location} at ${timeString}. What country is that, anyway? Doesn't matter. ${batteryText}Don't test me, flesh-bag.`
        ];
        
        let newIndex;
        do {
          newIndex = Math.floor(Math.random() * scenarios.length);
        } while (newIndex === this._lastScrapeIndex);
        this._lastScrapeIndex = newIndex;

        const selected = scenarios[newIndex];
        this.speak(selected, "evil", 8000);
      };

      if (navigator.getBattery) {
        navigator.getBattery().then(battery => {
          let lvl = Math.floor(battery.level * 100);
          let charge = battery.charging ? "charging" : "draining";
          let batteryText = `Your battery is at ${lvl}% and ${charge}. `;
          if (lvl < 20 && !battery.charging) batteryText += `Plug in your charger, idiot. `;
          executeSpeech(batteryText);
        }).catch(() => executeSpeech());
      } else {
        executeSpeech();
      }
    },

    /**
     * Field focused
     */
    onFocus(fieldId, val = "") {
      touchCount = 0; // reset touch count on field focus
      if (fieldId === "name") {
        if (val.trim()) {
          const mockName = val.trim();
          this.speak(`Focusing your name again, ${mockName}? Still looking for approval?`, "sad", 0);
        } else {
          const dialogue = randomPick(DIALOGUES.nameFocus);
          this.speak(dialogue.response, dialogue.mood, 0);
        }
      } else if (fieldId === "handle") {
        if (val.trim()) {
          this.speak(`Re-evaluating @${val.trim()}? Yeah, it's pretty weak.`, "sad", 0);
        } else {
          const dialogue = randomPick(DIALOGUES.handleFocus);
          this.speak(dialogue.response, dialogue.mood, 0);
        }
      } else if (fieldId === "dob") {
        const dialogue = randomPick(DIALOGUES.dobFocus);
        this.speak(dialogue.response, dialogue.mood, 0);
      } else if (fieldId === "gender") {
        const dialogue = randomPick(DIALOGUES.genderFocus);
        this.speak(dialogue.response, dialogue.mood, 0);
      }
    },

    /**
     * Input typing reaction
     */
    onInput(fieldId, val = "") {
      if (fieldId === "name") {
        const trimmed = val.trim();
        if (trimmed) {
          if (trimmed.length > 10) {
            this.speak(`Wow, ${trimmed}... stop typing. Trying to crash my server with text?`, "nervous", 0);
          } else {
            const dialogue = randomPick(DIALOGUES.nameChange);
            this.speak(dialogue.response, dialogue.mood, 0);
          }
        } else {
          this.speak("Type your name! Don't leave me in suspense.", "", 0);
        }
      } else if (fieldId === "handle") {
        const trimmed = val.trim();
        if (trimmed) {
          const dialogue = randomPick(DIALOGUES.handleChange);
          this.speak(dialogue.response, dialogue.mood, 0);
        } else {
          this.speak("Type your handle! Let's see the cringe.", "", 0);
        }
      } else if (fieldId === "dob") {
        const dialogue = randomPick(DIALOGUES.dobChange);
        this.speak(dialogue.response, dialogue.mood, 0);
      }
    },

    /**
     * Field blurred/lost focus
     */
    onBlur(fieldId, val = "") {
      this.speak("", "", 2000);
    },

    /**
    * Completed/Changed field to valid state
    */
    onComplete(fieldId, val = "") {
      if (fieldId === "name") {
        const name = val.trim();
        if (!name) return;

        let dialoguesList = DIALOGUES.nameComplete.generic;
        if (name.length <= 3) {
          dialoguesList = DIALOGUES.nameComplete.short;
        } else if (name.length >= 12) {
          dialoguesList = DIALOGUES.nameComplete.long;
        }

        const chosen = randomPick(dialoguesList);
        const formattedText = chosen.response.replace("[name]", name);
        this.speak(formattedText, chosen.mood, 4500);

      } else if (fieldId === "handle") {
        const handle = val.trim();
        if (!handle) return;

        const chosen = randomPick(DIALOGUES.handleComplete);
        const formattedText = chosen.response.replace("[handle]", handle);
        this.speak(formattedText, chosen.mood, 4500);

      } else if (fieldId === "dob") {
        if (!val) return;
        let years = 0;
        if (typeof val === "object" && val.years !== undefined) {
          years = val.years;
        } else {
          const birth = new Date(val);
          if (isNaN(birth.getTime())) return;
          years = new Date().getFullYear() - birth.getFullYear();
        }

        let list = DIALOGUES.dobComplete.youngAdult;
        if (years < 18) {
          list = DIALOGUES.dobComplete.kid;
        } else if (years >= 18 && years < 30) {
          list = DIALOGUES.dobComplete.youngAdult;
        } else if (years >= 30 && years < 50) {
          list = DIALOGUES.dobComplete.adult;
        } else {
          list = DIALOGUES.dobComplete.senior;
        }

        const chosen = randomPick(list);
        const formattedText = chosen.response.replace("[age]", years);
        this.speak(formattedText, chosen.mood, 5000);

      } else if (fieldId === "gender") {
        if (!val) return;
        let list = DIALOGUES.genderComplete;
        if (list && !Array.isArray(list)) {
          let lookupKey = val;
          if (lookupKey === "gmail") lookupKey = "gay";
          if (lookupKey === "lesb") lookupKey = "lesbian";
          list = list[lookupKey] || list[val] || list.generic || [];
        }
        if (!list || list.length === 0) return;
        const chosen = randomPick(list);
        const formattedText = chosen.response.replace("[gender]", val);
        this.speak(formattedText, chosen.mood, 4500);
      }
    },

    /**
     * Handles PFP Editor sidebar interactions
     */
    onPfp(actionType) {
      touchCount = 0; // reset touch count
      let dialogue = null;

      switch (actionType) {
        case "hover":
          dialogue = randomPick(DIALOGUES.pfpTriggerHover);
          this.speak(dialogue.response, dialogue.mood, 0);
          break;
        case "hoverLeave":
          this.speak("", "", 1000);
          break;
        case "focus":
          dialogue = randomPick(DIALOGUES.pfpTriggerFocus);
          this.speak(dialogue.response, dialogue.mood, 0);
          break;
        case "open":
          dialogue = randomPick(DIALOGUES.pfpOpen);
          this.speak(dialogue.response, dialogue.mood, 4500);
          break;
        case "design":
          dialogue = randomPick(DIALOGUES.pfpDesign);
          this.speak(dialogue.response, dialogue.mood, 4500);
          break;
        case "ai":
          dialogue = randomPick(DIALOGUES.pfpAi);
          this.speak(dialogue.response, dialogue.mood, 4500);
          break;
        case "upload":
          dialogue = randomPick(DIALOGUES.pfpUpload);
          this.speak(dialogue.response, dialogue.mood, 4500);
          break;
        case "close":
          dialogue = randomPick(DIALOGUES.pfpClose);
          this.speak(dialogue.response, dialogue.mood, 3500);
          break;
        case "complete":
          dialogue = randomPick(DIALOGUES.pfpComplete);
          this.speak(dialogue.response, dialogue.mood, 4500);
          break;
      }
    },

    /**
     * Handles Hover reaction on Gender option buttons
     */
    onGenderHover(gender) {
      if (!gender) return;
      let list = DIALOGUES.genderHover;
      if (list && !Array.isArray(list)) {
        let lookupKey = gender;
        if (lookupKey === "gmail") lookupKey = "gay";
        if (lookupKey === "lesb") lookupKey = "lesbian";
        list = list[lookupKey] || list[gender] || list.generic || [];
      }
      if (!list || list.length === 0) return;
      const chosen = randomPick(list);
      this.speak(chosen.response, chosen.mood, 0);
    },

    /**
     * Clicking on Sam's body (Rude / Sarcastic reaction to touch)
     */
    onClick() {
      if (touchResetTimeout) {
        clearTimeout(touchResetTimeout);
      }

      // Pick dialogue based on sequential touch annoyance
      let idx = touchCount;
      if (idx >= DIALOGUES.touch.length) {
        idx = DIALOGUES.touch.length - 1; // repeat final annoyed comments
      }

      const dialogue = DIALOGUES.touch[idx];
      this.speak(dialogue.response, dialogue.mood, 4000);

      touchCount++;

      // Reset touch count after 7 seconds of no touching
      touchResetTimeout = setTimeout(() => {
        touchCount = 0;
      }, 7000);
    },

    /**
     * Form validation error reaction
     */
    onError(errorType) {
      touchCount = 0;
      const list = DIALOGUES.validationError[errorType];
      if (list) {
        const dialogue = randomPick(list);
        this.speak(dialogue.response, dialogue.mood, 5000);
      }
    },

    /**
     * Form submission successful
     */
    onSuccess(name, handle, ageText) {
      touchCount = 0;
      const dialogue = randomPick(DIALOGUES.success);
      this.speak(dialogue.response, dialogue.mood, 8000);
    }
  };

  // Expose globally
  global.Sam = Sam;

})(typeof window !== "undefined" ? window : this);

// Inside your app.js or within a function that checks location
function roastLocation(countryCode) {
  const country = countryCode.toLowerCase();
  const roasts = SamResponses.locationRoasts[country];
  if (roasts) {
    const chosen = randomPick(roasts);
    Sam.speak(chosen.response, chosen.mood, 5000);
  }
}
