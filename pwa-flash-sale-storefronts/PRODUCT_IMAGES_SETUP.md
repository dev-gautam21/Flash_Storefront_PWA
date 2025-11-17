# Product Image Configuration

## Setting up Unsplash API for Product Images

To enable dynamic product images based on product names, you need to configure the Unsplash API:

### 1. Get Unsplash API Key
1. Visit [Unsplash Developers](https://unsplash.com/developers)
2. Create a new application
3. Copy your Access Key

### 2. Configure Environment Variable
Update your `.env.local` file:
```
VITE_UNSPLASH_API_KEY=your_actual_unsplash_access_key_here
```

### 3. How It Works
- When a product card loads, it searches Unsplash for images matching the product name
- The first result is displayed as the product image
- If no results are found or the API fails, it falls back to a placeholder image with the product name
- Loading states are shown while images are being fetched

### 4. Features
- **Dynamic Image Loading**: Images are fetched based on product names
- **Loading States**: Shows loading indicator while images are being fetched
- **Error Handling**: Graceful fallback to placeholder images if API fails
- **Responsive**: Images are optimized for different screen sizes

### 5. Rate Limits
Unsplash API has rate limits:
- Development mode: 50 requests per hour
- Production mode: 5000 requests per hour (requires approval)

### 6. Attribution
When using Unsplash images, proper attribution is required. The implementation includes this in the API usage.