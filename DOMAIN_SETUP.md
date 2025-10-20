# Domain Setup Guide - rebelz.app

Congratulations on adding your custom domain! Here's what you need to update.

## 🌐 Environment Variables to Update

Go to your DigitalOcean App Platform → Settings → Environment Variables and update:

### 1. ALLOWED_ORIGINS ⚠️ **IMPORTANT**

Update this to include your new domain:

```
https://rebelz.app,https://www.rebelz.app
```

Or if you want to keep the DigitalOcean URL as well:
```
https://rebelz.app,https://www.rebelz.app,${_self.PUBLIC_URL}
```

### 2. VITE_API_BASE_URL (Optional)

If you want the frontend to use the custom domain:
```
https://rebelz.app
```

Or keep it dynamic:
```
${_self.PUBLIC_URL}
```

## 📋 Quick Update Checklist

- [ ] Add domain in DigitalOcean App Platform (✅ Done!)
- [ ] Update `ALLOWED_ORIGINS` environment variable
- [ ] (Optional) Update `VITE_API_BASE_URL` environment variable
- [ ] Save and redeploy
- [ ] Test the app at https://rebelz.app
- [ ] Test the app at https://www.rebelz.app

## 🔧 Step-by-Step Instructions

### Step 1: Update Environment Variables

1. Go to: https://cloud.digitalocean.com/apps
2. Click on your **rebelzapp** application
3. Go to **Settings** tab
4. Click **App-Level Environment Variables** (or component settings)
5. Find `ALLOWED_ORIGINS` and click **Edit**
6. Update the value to:
   ```
   https://rebelz.app,https://www.rebelz.app
   ```
7. Click **Save**

### Step 2: Redeploy

The app will automatically redeploy with the new settings.

### Step 3: Test

Visit your app at:
- https://rebelz.app
- https://www.rebelz.app

## 🎯 What This Does

**ALLOWED_ORIGINS** tells the backend which domains are allowed to make API requests. This is a CORS (Cross-Origin Resource Sharing) security setting.

Without updating this, you'll see errors like:
- "CORS policy: No 'Access-Control-Allow-Origin' header"
- API requests failing from your custom domain

## 🔒 Security Best Practices

✅ **Good:**
```
https://rebelz.app,https://www.rebelz.app
```

❌ **Avoid in production:**
```
*  (allows all domains - security risk!)
```

## 📝 Optional: SSL/HTTPS

DigitalOcean automatically provides SSL certificates for custom domains, so your site will be secure with HTTPS! 🔒

## 🎉 You're All Set!

Once you update the environment variables and redeploy, your app will be fully functional at:

**https://rebelz.app** 🚀

---

**Need help?** Check the DigitalOcean documentation on custom domains:
https://docs.digitalocean.com/products/app-platform/how-to/manage-domains/

