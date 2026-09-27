# Music website — setup guide

A fast, mobile-friendly site that costs **₹0 to run**. Everything is edited in **one file: `content.js`**.

| Part | Service | Cost |
|---|---|---|
| Hosting | GitHub Pages | Free |
| Videos | YouTube embeds | Free |
| Contact form | Web3Forms (or WhatsApp / email buttons) | Free |
| Class payments | Razorpay Payment Links | No setup or monthly fee; a small % per payment |
| Live classes | Zoom (free plan limits group meetings to 40 min) or Google Meet | Free, or upgrade when revenue allows |
| Custom domain (optional) | e.g. `ananyarao.com` | A few hundred rupees a year — site works without it |

## 1. Add her content (`content.js`)
- **Name, bio, photo:** edit section 1. Put her photo in `assets/` as `portrait.jpg`.
- **Videos:** for `https://www.youtube.com/watch?v=AbC123xYz` the id is `AbC123xYz`. Mark one `featured: true`.
- **Concerts / announcements:** add entries with `date: "YYYY-MM-DD"`. Past events move to "Past" by themselves; the next one shows in the countdown banner.
- **Articles:** write paragraphs in `body`, or set `url` to a Medium/Substack post.
- **Replace** the sample testimonials and "Featured in" names with real ones (or set `featuredIn: []`).

## 2. Classes & payments — OFF until she switches them on
In `content.js` → `classes`:
- `enabled: false` → classes, prices and "Learn with me" are hidden from everyone.
- Preview anytime while OFF: open `your-site-address/?preview=classes`
- `enabled: true` → visible to the public.
- `inviteOnly: true` → visitors must enter `accessCode` to see plans. Share the code (or a link like `your-site/?code=RAGA2026`) only with students. *This is a simple privacy gate, not bank-grade security — never put the Zoom link on the site.*

**Razorpay (payments):**
1. Sign up at razorpay.com, complete KYC (PAN + bank account).
2. Dashboard → **Payment Links** (or **Payment Pages**) → create one per plan.
3. Paste each link into that plan's `payLink`.
4. For overseas students: request **International payments** activation in the Razorpay dashboard, then optionally create USD links and add `payLinkUSD: "..."` to each plan.
Until a `payLink` is set, the button says "Enquire to enrol" and fills in the contact form instead.

**Zoom:** after a payment notification, email the student their recurring Zoom meeting link. (Keep links off the website.)

## 3. Contact form (free)
Go to web3forms.com, enter her email, copy the access key into `contactFormKey`. Messages then arrive in her inbox. Without a key, the form opens the visitor's email app. The WhatsApp button uses the `whatsapp` number.

## 4. Publish free on GitHub Pages
One-time: create an empty **public** repo on github.com called `music-site` (no README).

In **PowerShell**, from the unzipped `music-site` folder:

```powershell
cd "$HOME\Downloads\music-site"
git init
git add .
git commit -m "Launch music website"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/music-site.git
git push -u origin main
```

Then on GitHub: repo → **Settings → Pages → Source: Deploy from a branch → `main` / `root` → Save**.
The site goes live at `https://YOUR-USERNAME.github.io/music-site/` within a couple of minutes.

**Every later update** (new video, concert, article, switching classes on):

```powershell
cd "$HOME\Downloads\music-site"
git add .
git commit -m "Update content"
git push
```

## 5. Growing international students (free wins)
- Put the site link in the YouTube channel banner, every video description and the Instagram bio.
- Pin a comment on each video: "Online classes worldwide → link".
- Keep "Upcoming" fresh — a live countdown gives people a reason to return.
- Post one short article a month (practice tips rank well on Google).
- Add a Google Business Profile for local students.
