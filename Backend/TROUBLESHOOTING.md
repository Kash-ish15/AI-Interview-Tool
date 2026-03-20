# Troubleshooting Guide

## Common Errors and Solutions

### 1. `/favicon.ico:1 Failed to load resource: the server responded with a status of 500 ()`

**Cause**: The browser automatically requests `/favicon.ico` but the server didn't have a handler for it, causing a 500 error.

**Solution**: ✅ **FIXED** - Added a favicon route handler that returns `204 No Content` status.

**Location**: `Backend/api/app.js` - Added before the root route handler.

### 2. `Unchecked runtime.lastError: The message port closed before a response was received.`

**Cause**: This is typically a **browser extension error**, not related to your backend server. Browser extensions (like ad blockers, password managers, etc.) sometimes try to communicate with pages and fail.

**Solution**: 
- This is usually harmless and can be ignored
- If it's annoying, try disabling browser extensions one by one to identify the culprit
- It doesn't affect your application functionality

### 3. Server Crashes on Startup

**Common Causes**:

#### Missing Environment Variables
- **MONGO_URI** not set → Database connection fails
- **JWT_SECRET** not set → Authentication fails
- **GOOGLE_GENAI_API_KEY** not set → AI services fail
- **CLOUDINARY_*** variables not set → File uploads fail

**Solution**: ✅ **IMPROVED** - Added better error handling:
- Database connection now checks if `MONGO_URI` exists before connecting
- Server won't crash if database connection fails (will log error instead)
- Routes are wrapped in try-catch to prevent crashes

#### Database Connection Issues
- Invalid MongoDB connection string
- Network issues
- MongoDB Atlas IP whitelist restrictions

**Solution**: 
- Verify `MONGO_URI` is correct
- Check MongoDB Atlas allows connections from Vercel IPs (0.0.0.0/0 for all)
- Check network connectivity

### 4. 500 Internal Server Error on API Routes

**Possible Causes**:

1. **Missing Environment Variables**
   - Check Vercel environment variables are set
   - Verify all required variables are present (see `VERCEL_ENV_VARIABLES.md`)

2. **Database Connection Failed**
   - Check MongoDB connection string
   - Verify database is accessible
   - Check logs for connection errors

3. **AI Service Errors**
   - Verify `GOOGLE_GENAI_API_KEY` is valid
   - Check API quota/limits
   - Verify API key has proper permissions

4. **Cloudinary Errors**
   - Verify Cloudinary credentials
   - Check Cloudinary account status
   - Verify URL2PNG add-on is enabled (for PDF generation)

### 5. CORS Errors

**Cause**: Frontend origin not in allowed origins list.

**Solution**: 
- Check `allowedOrigins` in `Backend/api/app.js`
- Add your frontend URL to the list
- For Vercel, the code already allows `*.vercel.app` domains

## Debugging Steps

### 1. Check Vercel Logs
```bash
# View logs in Vercel dashboard
# Go to: Your Project → Deployments → Click on deployment → View Function Logs
```

### 2. Test Server Health
```bash
# Test root endpoint
curl https://your-backend.vercel.app/

# Test health endpoint
curl https://your-backend.vercel.app/api/health
```

### 3. Verify Environment Variables
- Go to Vercel Dashboard → Settings → Environment Variables
- Verify all required variables are set
- Check they're set for the correct environment (Production/Preview/Development)

### 4. Test Database Connection
- Verify MongoDB connection string format
- Test connection from local machine
- Check MongoDB Atlas logs

### 5. Check Route Loading
- Look for "Error loading routes" in logs
- Verify all route files exist and are valid
- Check for syntax errors in route files

## Recent Fixes Applied

✅ **Favicon Handler**: Added route to handle `/favicon.ico` requests
✅ **Database Error Handling**: Improved error handling to prevent crashes
✅ **Route Loading**: Added try-catch around route loading
✅ **Environment Variable Checks**: Added validation before database connection

## Next Steps if Issues Persist

1. **Check Vercel Function Logs**
   - Look for specific error messages
   - Check for stack traces
   - Identify which route/function is failing

2. **Verify All Environment Variables**
   - Use the checklist in `VERCEL_ENV_VARIABLES.md`
   - Ensure all variables are set correctly

3. **Test Locally**
   - Run the server locally with the same environment variables
   - Reproduce the error locally
   - Debug locally before deploying

4. **Check Dependencies**
   - Verify all npm packages are installed
   - Check for version conflicts
   - Ensure `package.json` is correct

## Getting Help

If issues persist:
1. Check Vercel deployment logs
2. Review error messages in browser console
3. Test individual API endpoints
4. Verify environment variables are set correctly
5. Check MongoDB and Cloudinary service status
