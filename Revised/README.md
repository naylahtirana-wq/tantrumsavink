# Tantrum Rajin Menabung

A simple static website for tracking Tantrum's savings contributions.

It includes a monthly payment check, a per-month progress preview, and an editable friend contribution link.

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
4. Send the copied link to your friends so they can fill their own contribution.

The copied link contains an editable contribution snapshot. Friend updates save in their own browser; if you need everyone to edit the same live savings list at the same time, the next step is adding a small database login system such as Firebase or Supabase.

## Files

- `index.html` - page structure
- `styles.css` - visual design and responsive layout
- `script.js` - savings ledger logic, import/export, and share links
