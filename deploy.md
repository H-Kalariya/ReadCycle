# ReadCycle Deployment Guide - Render

## Quick Deployment Steps

### 1. Prepare Your Code
- ✅ All files are ready for deployment
- ✅ `package.json` has correct start script
- ✅ Environment variables are configured
- ✅ MongoDB connection is set up

### 2. Deploy to Render

1. **Go to Render.com**
   - Visit [render.com](https://render.com)
   - Sign up or log in

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub/GitLab repository
   - Select the ReadCycle repository

3. **Configure Service**
   ```
   Name: readcycle
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   Plan: Free (for testing)
   ```

4. **Set Environment Variables**
   - Click "Environment" tab
   - Add these variables:
   ```
   MONGODB_URI=mongodb+srv://HetviK2208:HetviK9909855402@cluster0.ih1tunm.mongodb.net/ReadCycle
   SESSION_SECRET=your-super-secret-session-key-here
   NODE_ENV=production
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for build to complete (2-5 minutes)
   - Your app will be available at: `https://your-app-name.onrender.com`

### 3. Test Your Deployment

1. Visit your Render URL
2. Test user registration
3. Test login functionality
4. Test book management features
5. Verify database connections

### 4. Custom Domain (Optional)

1. In Render dashboard, go to your service
2. Click "Settings" → "Custom Domains"
3. Add your domain
4. Configure DNS records as instructed

## Troubleshooting

### Common Issues:

1. **Build Fails**
   - Check `package.json` has correct dependencies
   - Verify Node.js version compatibility

2. **Database Connection Error**
   - Verify MongoDB Atlas network access allows `0.0.0.0/0`
   - Check connection string format

3. **App Crashes**
   - Check Render logs for errors
   - Verify environment variables are set correctly

4. **Session Issues**
   - Ensure `SESSION_SECRET` is set
   - Check cookie settings for HTTPS

### Useful Commands:

```bash
# Check local build
npm install
npm start

# Test MongoDB connection
node -e "const mongoose = require('mongoose'); mongoose.connect('your-connection-string').then(() => console.log('Connected')).catch(console.error)"
```

## Security Notes

- ✅ Passwords are hashed with bcrypt
- ✅ Sessions are secure in production
- ✅ CORS is configured
- ✅ Input validation is implemented
- ⚠️ Consider adding rate limiting for production
- ⚠️ Consider adding HTTPS redirects

## Performance Tips

- Use Render's "Starter" plan for better performance
- Consider implementing caching for book searches
- Optimize database queries for large datasets
- Monitor Render's performance metrics

## Support

If you encounter issues:
1. Check Render's deployment logs
2. Verify all environment variables
3. Test locally first
4. Check MongoDB Atlas status 