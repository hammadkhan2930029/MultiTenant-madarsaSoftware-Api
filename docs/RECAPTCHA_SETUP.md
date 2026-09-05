# Google reCAPTCHA setup

Login protection Google reCAPTCHA v2 ("I'm not a robot" checkbox) use karti hai. Frontend sirf site key rakhta hai; secret key sirf API environment mein rehti hai.

## Google Console

1. Google reCAPTCHA Admin Console mein reCAPTCHA v2 checkbox key banayein.
2. Production domain `madrasasoftware.com` register karein. Is registration ke sath us ke subdomains bhi supported hain.
3. Local development ke liye alag key banayein aur `localhost` add karein.

## Production variables

Frontend build environment:

```env
VITE_RECAPTCHA_ENABLED=true
VITE_RECAPTCHA_SITE_KEY=your_site_key
```

Backend runtime environment:

```env
RECAPTCHA_ENABLED=true
RECAPTCHA_SECRET_KEY=your_secret_key
```

Frontend variables set karne ke baad frontend dobara build karein. Backend variables set karne ke baad API process restart karein. `RECAPTCHA_SECRET_KEY` ko kabhi `VITE_` variable ya frontend repository mein na rakhein.

## Local development

Do safe choices hain:

- CAPTCHA off: frontend aur backend dono mein `*_RECAPTCHA_ENABLED=false` rakhein.
- CAPTCHA test: Google ki official test site/secret keys use karein. Test keys hamesha verification pass karti hain aur production mein use nahi honi chahiye.

Official v2 test site key: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`

Official v2 test secret key: `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

Production mein flags omit hon to CAPTCHA default enabled hai. Is surat mein missing backend secret par API startup fail hogi, taa-ke login protection ghalti se bypass na ho.
