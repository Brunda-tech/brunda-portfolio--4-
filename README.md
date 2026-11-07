# Brunda S - Portfolio

Animated single-page portfolio (HTML + CSS + JS, no build step).

## Files
- index.html - the whole website
- resume.pdf - shown in the Resume section
- certificates/ - your 6 certificate images (shown in popups in the Journey section)

## Run locally
Open index.html in a browser (or use the VS Code "Live Server" extension).

## Deploy free with GitHub Pages
1. Push this folder to a GitHub repo.
2. Repo > Settings > Pages > Source: "Deploy from a branch" > main / (root) > Save.
3. Your site will be live at https://<username>.github.io/<repo-name>/

## Live stats (LeetCode + GitHub)

The "Live Stats" section shows your LeetCode solved count and GitHub contributions.

How it works
- GitHub: the browser fetches your public profile, recent activity and contribution
  graph directly, and re-checks every 5 minutes while the page is open.
- LeetCode: browsers can't call LeetCode directly, so a GitHub Action
  (.github/workflows/update-stats.yml) fetches your data every 30 minutes and saves it
  to data/stats.json, which the site reads. (GitHub can delay scheduled runs by a few minutes.)

One-time setup after you push to GitHub
1. Open your repo > Actions tab. If asked, click "I understand my workflows, enable them".
2. Click "Update live stats" > "Run workflow" once so data/stats.json gets filled right away.
3. Check Settings > Actions > General > Workflow permissions is "Read and write permissions".

Good to know
- The Action commits to your repo, so run `git pull` in VS Code before your next push.
- Private GitHub contributions only show if "Include private contributions on my profile"
  is turned on in your GitHub profile settings.
- GitHub pauses scheduled workflows after ~60 days with no repo activity; if that happens,
  press "Enable workflow" in the Actions tab.
- Usernames live in: scripts/update-stats.mjs (top), the CFG line in index.html's script.
