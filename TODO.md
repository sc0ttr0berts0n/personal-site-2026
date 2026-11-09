# To do

Open tasks for the site. When one is done, delete it and say so in the commit.

## Launch blockers

- **Point scottrobertson.dev at the new site.** The domain still serves the old Bluehost site. Once it moves, change `SITE_URL` in `site/config.js` and run `npm run share -- --pages` so share previews point at the new address.
- **Make scott@scottrobertson.dev receive mail.** It's on the artist card but doesn't work yet. Plan: switch the domain's nameservers from Bluehost to Namecheap BasicDNS and add a redirect to Gmail. Check Bluehost's DNS for records worth keeping first.

## After launch

- **Reply as scott@scottrobertson.dev.** Forwarding only receives. In Gmail, Settings › Accounts › "Send mail as", add the address and send through `smtp.gmail.com` with a Google app password. That's free, but some mail may show "via gmail.com" or land in spam, so add Google to the domain's SPF record (`include:_spf.google.com`) and add a DMARC record. Fully hosted mail on the domain (Google Workspace) is paid.
