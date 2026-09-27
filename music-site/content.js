/* =====================================================================
   CONTENT.JS  —  the ONLY file you need to edit to update the website.
   Change the text between the quotes, save, and push to GitHub.
   ===================================================================== */

window.SITE = {

  /* ---------- 1. ABOUT THE ARTIST ---------- */
  artist: {
    name: "S.M. Vilasini",                       // <- her stage name
    tagline: "Vocalist · Composer · Teacher",
    location: "Chennai, India",
    photo: "assets/portrait.jpg",             // put her photo in the assets folder with this name
    heroLine: "Music rooted in tradition, shared with students across the world.",
    bio: [
      "Trained from the age of six, Vilasini blends the depth of classical music with a contemporary voice. She performs across India and online, and has taught students in over a dozen countries.",
      "Her teaching focuses on strong fundamentals, joyful practice and finding your own voice — whether you are a complete beginner or preparing for the stage."
    ],
    stats: [
      { value: "15+", label: "Years of training" },
      { value: "100+", label: "Concerts performed" },
      { value: "12", label: "Countries taught" }
    ]
  },

  /* ---------- 2. SOCIAL & CONTACT LINKS (leave "" to hide) ---------- */
  social: {
    youtube:   "https://www.youtube.com/@yourchannel",
    instagram: "https://www.instagram.com/yourhandle",
    spotify:   "",
    facebook:  "",
    whatsapp:  "919876543210",               // country code + number, no + or spaces
    email:     "vilasinisubraveti@gmail.com"
  },

  /* ---------- 3. YOUTUBE VIDEOS ----------
     id = the part after "watch?v=" in the YouTube link
     e.g. https://www.youtube.com/watch?v=AbC123xYz  ->  id: "AbC123xYz"
     featured: true shows it large on the home screen (use for one video)  */
  videos: [
    { id: "", title: "Evening Raga — Live at the Music Academy", category: "Performance", featured: true },
    { id: "", title: "Devotional Medley (Studio)",              category: "Originals" },
    { id: "", title: "Film Song Cover — Unplugged",             category: "Covers" },
    { id: "", title: "Beginner Lesson: Voice Warm-ups",         category: "Lessons" },
    { id: "", title: "Duet with Violin — Rehearsal Session",    category: "Collaborations" },
    { id: "", title: "Original Composition — 'Monsoon'",        category: "Originals" }
  ],

  /* ---------- 4. CONCERTS & ANNOUNCEMENTS ----------
     date format: "YYYY-MM-DD". Past dates move to "Past" automatically. */
  announcements: [
    { type: "Concert",  title: "December Music Season Recital", date: "2026-12-18", time: "18:30", venue: "City Music Hall", city: "Chennai", link: "", linkLabel: "Get tickets" },
    { type: "Online",   title: "Free Live Masterclass on YouTube", date: "2026-11-08", time: "19:00", venue: "YouTube Live", city: "Online", link: "https://www.youtube.com/@yourchannel", linkLabel: "Set a reminder" },
    { type: "New venture", title: "Debut Album — Recording Begins", date: "2027-01-15", time: "", venue: "", city: "", link: "", linkLabel: "", note: "Follow along as I record my first album of original compositions." },
    { type: "Concert",  title: "Summer Festival Performance", date: "2026-05-10", time: "18:00", venue: "Festival Grounds", city: "Bengaluru", link: "", linkLabel: "" }
  ],

  /* ---------- 5. ONLINE CLASSES (switched OFF by default) ----------
     enabled:     false = classes are hidden from everyone. true = shown.
     inviteOnly:  true  = visitors must type the accessCode to see plans & prices
                  (simple gate to keep it private — share the code only with students)
     payLink:     paste your Razorpay Payment Link / Payment Page URL
     Preview while OFF: open  yoursite/?preview=classes                          */
  classes: {
    enabled: false,
    inviteOnly: false,
    accessCode: "RAGA2026",
    platform: "Zoom",
    intro: "Live one-to-one and small-group lessons on Zoom, for students anywhere in the world. Every plan includes practice recordings and notes after each class.",
    plans: [
      { name: "Trial Lesson",   detail: "1 × 30 min · one-to-one",          priceINR: 500,  priceUSD: 10, payLink: "", featured: false },
      { name: "Monthly — 1:1",  detail: "4 × 45 min · personalised syllabus", priceINR: 4000, priceUSD: 60, payLink: "", featured: true  },
      { name: "Group Batch",    detail: "8 × 60 min · max 6 students",        priceINR: 3000, priceUSD: 40, payLink: "", featured: false }
    ],
    steps: [
      "Choose a plan and pay securely online.",
      "You receive a confirmation email with your class schedule.",
      "Your private Zoom link arrives before your first class.",
      "After each class you get notes and a practice recording."
    ]
  },

  /* ---------- 6. ARTICLES ----------
     Write here (body = list of paragraphs) OR link out to Medium/Substack with url: "https://..." */
  articles: [
    {
      title: "Why riyaz in the morning changes everything",
      date: "2026-09-01", tag: "Practice", readTime: "4 min",
      excerpt: "A simple daily routine that transformed my voice — and how students can adapt it to a busy life.",
      body: [
        "For years I practised whenever I found time. The breakthrough came when I made the first thirty minutes of every morning non-negotiable.",
        "Start with long, steady notes. Don't chase speed. The voice wakes up slowly and rewards patience.",
        "If mornings are impossible, pick the same time every day. Consistency matters more than the clock."
      ]
    },
    {
      title: "Learning music online: what actually works",
      date: "2026-07-20", tag: "Teaching", readTime: "5 min",
      excerpt: "After teaching students across 12 countries over Zoom, here is what I've learned about online lessons.",
      body: [
        "Good audio beats good video. A simple wired headset makes a bigger difference than any camera.",
        "Recording every lesson lets students revisit the details they missed in the moment.",
        "Most importantly: small weekly goals keep students motivated between classes."
      ]
    },
    {
      title: "Behind the scenes of my first original composition",
      date: "2026-05-02", tag: "Journey", readTime: "3 min",
      excerpt: "How a monsoon evening became a melody — the story behind 'Monsoon'.",
      body: [
        "It started with four notes hummed into my phone during a storm.",
        "Over three months those notes became a full piece, arranged with violin and mridangam."
      ]
    }
  ],

  /* ---------- 7. WHAT STUDENTS & AUDIENCES SAY ---------- */
  testimonials: [
    { quote: "Patient, precise and inspiring. My daughter looks forward to every class.", name: "Parent of a student", place: "London, UK" },
    { quote: "I had never sung before. Six months later I performed at our community festival.", name: "Adult beginner", place: "Toronto, Canada" },
    { quote: "A voice that stays with you long after the concert ends.", name: "Audience review", place: "Chennai" }
  ],

  /* ---------- 8. FEATURED IN / COLLABORATIONS (leave [] to hide) ---------- */
  featuredIn: ["Radio Feature (replace)", "Music Festival (replace)", "Sabha Name (replace)", "Collaboration (replace)"],

  /* ---------- 9. CONTACT FORM ----------
     Free: get an access key at https://web3forms.com (enter her email, key arrives by email).
     Leave "" and the form will open the visitor's email app instead.            */
  contactFormKey: ""
};
