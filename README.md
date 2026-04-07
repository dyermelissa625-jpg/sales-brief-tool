# Sales Research Assistant

AI-powered sales intelligence that generates a full client brief from a company URL in seconds, built for B2B salespeople who need information and a tailored pitch quickly, without spending a long time doing the background research.

Live at: [sales-research-assistant.org](https://sales-research-assistant.org)

## What it does

Paste any company URL and write a short description of what products you sell. The tool fetches publicly available information about that company, analyses it with an LLM, and generates a structured sales brief containing:

- Company overview and industry
- Business background and history
- Client potential rating (Very Low → Very High)
- Ranked product recommendations tailored to your offering
- A ready-to-send cold email with subject line
- A realistic phone call script with objection handling

Built for my mother, who works in B2B sales and needed a faster way to research prospects before calls.

## Screenshots of app in use
<img width="1089" height="657" alt="Screenshot 2026-04-07 at 16 26 22" src="https://github.com/user-attachments/assets/451e6788-6474-4d46-9572-57bfd8d4795b" />
<img width="1412" height="769" alt="Screenshot 2026-04-07 at 16 27 10" src="https://github.com/user-attachments/assets/4097d4ff-1bc4-44af-89f1-5c344a54c206" />
<img width="1415" height="804" alt="Screenshot 2026-04-07 at 16 27 27" src="https://github.com/user-attachments/assets/318f47f0-3ae7-4038-9741-962bf6279a75" />

## How it works

The full pipeline runs on Cloudflare's edge infrastructure:

User inputs URL + product description
        ↓
Cloudflare Worker validates and fetches the target webpage
        ↓
HTMLRewriter extracts title, meta tags, OG tags, headings, and JSON-LD structured data
        ↓
Context string is cleaned and truncated to signal-dense text
        ↓
Workers AI (llama-3.1-8b-instruct) generates a structured sales brief
        ↓
JSON response returned to the frontend

Key technical decisions:

- Used HTMLRewriter instead of a third-party scraping API to stay edge-native and avoid external dependencies
- Extracts JSON-LD structured data alongside meta tags to maximise signal from client-side rendered sites
- AbortController timeout on fetch prevents hanging requests
- Prompt engineered for plain text output with consistent section structure


## Tech stack

| Layer | Technology |
|---|---|
| Backend | Cloudflare Workers |
| AI Inference | Cloudflare Workers AI (llama-3.1-8b-instruct) |
| HTML Parsing | Cloudflare HTMLRewriter |
| Frontend | HTML, CSS, Vanilla JavaScript |
| Hosting | Cloudflare Pages |
| Domain | Cloudflare Registrar |


## Running locally

Prerequisites: Node.js 18+, a Cloudflare account

```bash
# Clone the repo
git clone https://github.com/dyermelissa625-jpg/sales-brief-tool
cd sales-brief-tool

# Install dependencies
npm install

# Start the Worker in remote mode (required for AI binding)
npx wrangler dev --remote

# In a separate terminal, serve the frontend
cd public
npx serve .
```

The Worker runs at `localhost:8787` and the frontend at `localhost:3000`.


## Roadmap

These features are planned for V2:

- **User profiles** — save your product description and preferences so you don't re-enter them every session
- **Brief history** — view and revisit previously generated briefs
- **Gmail integration** — send the generated email pitch directly from the app
- **Click-to-call** — view the call script while dialling from the browser
- **Fine-tuned model** — train on a curated dataset of successful cold calls and emails for higher quality output
- **Funding and revenue data** — integrate Crunchbase or PitchBook API for richer company intelligence
- **KV caching** — cache generated briefs by URL to avoid redundant LLM calls


## Author

Built by Melissa Dyer as a passion project.

[GitHub](https://github.com/dyermelissa625-jpg) · [Live App](https://sales-research-assistant.org)
