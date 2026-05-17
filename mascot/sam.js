/**
 * Sam - Sarcastic, Rude, Sassy and Highly Intelligent Mascot Engine
 * Isolated in its own file and folder for easy customizability.
 * Custom built to be short, witty, and actively bully the user.
 */
(function (global) {
  // Sam's Mood Classes - Extended to support Roblox, Minecraft, Kawaii cat ears, dizziness, cool sunglasses, and anime rage
  const MOODS = [
    "happy", "sad", "angry", "nervous", "cute", "smug", "shocked", "evil", "bored", "think", "worry", "hype",
    "minecraft", "derp", "cats", "wink", "dizzy", "cool", "rage", "starry"
  ];

  // Poses & Expressions Categorized by Type (Roblox, Minecraft, Emojis, Anime, Kamojis, Cats, Actual, Smirk, Other)
  const CATEGORIES = {
    roblox: ["smug", "think", "cool", "shocked"],
    minecraft: ["minecraft"],
    emojis: ["happy", "sad", "angry", "nervous", "bored", "worry", "hype"],
    anime: ["starry", "rage"],
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

  // Helper to pick random item
  function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // The Sam Mascot Engine Object
  const Sam = {
    /**
     * Initializes Sam's DOM bindings and click listeners
     */
    init(elements) {
      faceEl = elements.face;
      bubbleEl = elements.bubble;
      textEl = elements.text;
      mascotContainer = elements.container;

      if (mascotContainer) {
        mascotContainer.addEventListener("click", (e) => {
          e.stopPropagation();
          this.onClick();
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
