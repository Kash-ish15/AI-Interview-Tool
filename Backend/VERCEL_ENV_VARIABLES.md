# Required Environment Variables for Vercel Deployment

## Critical Environment Variables (Required)

These environment variables **MUST** be set in your Vercel project settings for the backend to work:

### 1. Database Configuration
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority
```
- **Required**: Yes
- **Description**: MongoDB connection string
- **Used in**: `Backend/api/config/database.js`

### 2. JWT Authentication
```
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters
```
- **Required**: Yes
- **Description**: Secret key for signing and verifying JWT tokens
- **Used in**: `Backend/api/middlewares/auth.middleware.js`, `Backend/api/controllers/auth.controller.js`
- **Note**: Use a strong, random string (minimum 32 characters recommended)

### 3. Google GenAI API
```
GOOGLE_GENAI_API_KEY=your-google-genai-api-key
```
- **Required**: Yes
- **Description**: API key for Google GenAI service (Gemini)
- **Used in**: `Backend/api/services/ai.service.js`
- **Note**: Required for generating interview reports and resume PDFs

### 4. Cloudinary Configuration
```
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```
- **Required**: Yes (for file uploads and PDF generation)
- **Description**: Cloudinary credentials for file storage and PDF generation
- **Used in**: `Backend/api/config/cloudinary.js`
- **Note**: While the code has fallback values, you should set your own credentials

### 5. Node Environment
```
NODE_ENV=production
```
- **Required**: Recommended
- **Description**: Sets the environment mode (production/development)
- **Used in**: Multiple files for cookie security settings and error handling
- **Note**: Set to `production` for Vercel deployment

## How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with its value
4. Make sure to select the appropriate **Environment** (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your application for changes to take effect

## Verification Checklist

After adding all environment variables, verify:

- [ ] `MONGO_URI` is set and valid
- [ ] `JWT_SECRET` is set with a strong random string
- [ ] `GOOGLE_GENAI_API_KEY` is set and valid
- [ ] `CLOUDINARY_CLOUD_NAME` is set
- [ ] `CLOUDINARY_API_KEY` is set
- [ ] `CLOUDINARY_API_SECRET` is set
- [ ] `NODE_ENV` is set to `production`
- [ ] All variables are added to Production environment
- [ ] Application has been redeployed after adding variables

## Common Issues

### Server Crashes on Startup
- **Cause**: Missing `MONGO_URI` or invalid connection string
- **Solution**: Verify MongoDB connection string is correct and accessible

### Authentication Errors
- **Cause**: Missing or invalid `JWT_SECRET`
- **Solution**: Set a strong JWT secret (minimum 32 characters)

### AI Service Errors
- **Cause**: Missing or invalid `GOOGLE_GENAI_API_KEY`
- **Solution**: Verify your Google GenAI API key is correct and has proper permissions

### File Upload Errors
- **Cause**: Missing or invalid Cloudinary credentials
- **Solution**: Verify all three Cloudinary environment variables are set correctly

### Cookie/Session Issues
- **Cause**: `NODE_ENV` not set to `production`
- **Solution**: Set `NODE_ENV=production` in Vercel environment variables

## Security Notes

⚠️ **Never commit environment variables to Git**
- Keep `.env` files in `.gitignore`
- Use Vercel's environment variables feature
- Rotate secrets regularly
- Use different secrets for production and development
