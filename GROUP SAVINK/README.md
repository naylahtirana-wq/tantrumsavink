# Group Savings Ledger

A simple static website for tracking group savings contributions.

It includes a monthly payment check so you can see who has paid, partially paid, or not paid for a selected month.

## Open Locally

Open `index.html` in a browser, or run a local server:

```sh
python3 -m http.server 4173
```

Then visit:

```txt
http://localhost:4173
```

## Let Friends See It

Because this is a static website, the ledger is saved in the browser that edits it. To share it with friends:

1. Upload these files to GitHub Pages, Netlify, Vercel, or any static web host.
2. Add your friends and contributions.
3. Click `Copy share link`.
4. Send the copied link to your friends.

The copied link contains a read-only snapshot. If you need everyone to edit the same live savings list at the same time, the next step is adding a small database login system such as Firebase or Supabase.

## Files

- `index.html` - page structure
- `styles.css` - visual design and responsive layout
- `script.js` - savings ledger logic, import/export, and share links
