# Cloudinary Integration Guide

This guide explains how to use the new Cloudinary integration for image storage and processing.

## Setup

### 1. Get Cloudinary Credentials

1. Sign up for a free Cloudinary account at [cloudinary.com](https://cloudinary.com)
2. Go to your dashboard and copy your:
   - Cloud Name
   - API Key
   - API Secret

### 2. Update Environment Variables

Update your `.env` file with your Cloudinary credentials:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
CLOUDINARY_FOLDER=rentman-properties
```

### 3. Test the Connection

Run the migration script to test your Cloudinary connection:

```bash
npm run migrate:cloudinary
```

## Features

### Automatic Image Processing

The system automatically creates multiple image sizes:
- **Thumb**: 300x200px (80% quality)
- **Medium**: 800x600px (85% quality) 
- **Large**: 1200x900px (90% quality)
- **Original**: Full resolution (auto quality)

### Image URLs

Images are served through Cloudinary's CDN with automatic optimization:
- Format: WebP (with fallbacks)
- Compression: Automatic
- CDN: Global edge locations
- Caching: 1 year browser cache

## API Endpoints

### Get Image
```
GET /api/images/{filename}?size={thumb|medium|large|original}
```

Examples:
- `GET /api/images/property123.jpg` → Medium size
- `GET /api/images/property123.jpg?size=thumb` → Thumbnail
- `GET /api/images/property123_thumb.jpg` → Thumbnail (from filename)

### Upload Image
```
POST /api/images/upload
Content-Type: application/json

{
  "base64Data": "data:image/jpeg;base64,/9j/4AAQ...",
  "filename": "property123.jpg"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "thumb": "https://res.cloudinary.com/your-cloud/image/upload/w_300,h_200,c_fill,q_80,f_webp/rentman-properties/property123_thumb",
    "medium": "https://res.cloudinary.com/your-cloud/image/upload/w_800,h_600,c_fill,q_85,f_webp/rentman-properties/property123_medium",
    "large": "https://res.cloudinary.com/your-cloud/image/upload/w_1200,h_900,c_fill,q_90,f_webp/rentman-properties/property123_large",
    "original": "https://res.cloudinary.com/your-cloud/image/upload/q_auto,f_webp/rentman-properties/property123_original"
  },
  "message": "Image uploaded successfully to Cloudinary"
}
```

## Usage in Code

### Upload Images to Cloudinary

```typescript
import { cloudinaryService } from '../utils/cloudinaryService';

// Upload single image with multiple sizes
const results = await cloudinaryService.uploadMultipleSizes(
  base64Data,
  'property123.jpg'
);

console.log(results.thumb);   // Thumbnail URL
console.log(results.medium);  // Medium URL
console.log(results.large);   // Large URL
console.log(results.original); // Original URL
```

### Generate Cloudinary URLs

```typescript
import { cloudinaryService } from '../utils/cloudinaryService';

const publicId = 'rentman-properties/property123';

// Generate different sizes
const thumbUrl = cloudinaryService.generateSizeUrl(publicId, 'thumb');
const mediumUrl = cloudinaryService.generateSizeUrl(publicId, 'medium');
const largeUrl = cloudinaryService.generateSizeUrl(publicId, 'large');
```

### Process Property Media

```typescript
import { processPropertyMediaToCloudinary } from '../utils/cloudinaryHelper';

// Process all media for a property
const processedImages = await processPropertyMediaToCloudinary(mediaArray);

// Use the processed URLs
Object.entries(processedImages).forEach(([filename, urls]) => {
  console.log(`${filename}:`, urls.medium);
});
```

## Migration from Local Storage

### 1. Migrate Existing Images

Run the migration script to upload existing cached images:

```bash
npm run migrate:cloudinary
```

### 2. Update Your Code

Replace local image processing with Cloudinary:

**Before:**
```typescript
const imageProcessor = new ImageProcessor();
const results = await imageProcessor.processBase64Image(
  base64Data,
  filename,
  './public/images'
);
```

**After:**
```typescript
const results = await cloudinaryService.uploadMultipleSizes(
  base64Data,
  filename
);
```

## Frontend Integration

### Next.js Image Component

```tsx
import Image from 'next/image';

// Use Cloudinary URLs directly
<Image
  src="https://res.cloudinary.com/your-cloud/image/upload/w_800,h_600,c_fill,q_85,f_webp/rentman-properties/property123_medium"
  alt="Property image"
  width={800}
  height={600}
/>
```

### Responsive Images

```tsx
<Image
  src="https://res.cloudinary.com/your-cloud/image/upload/w_800,h_600,c_fill,q_85,f_webp/rentman-properties/property123_medium"
  alt="Property image"
  width={800}
  height={600}
  sizes="(max-width: 600px) 300px, (max-width: 1200px) 800px, 1200px"
  srcSet="
    https://res.cloudinary.com/your-cloud/image/upload/w_300,h_200,c_fill,q_80,f_webp/rentman-properties/property123_thumb 300w,
    https://res.cloudinary.com/your-cloud/image/upload/w_800,h_600,c_fill,q_85,f_webp/rentman-properties/property123_medium 800w,
    https://res.cloudinary.com/your-cloud/image/upload/w_1200,h_900,c_fill,q_90,f_webp/rentman-properties/property123_large 1200w
  "
/>
```

## Benefits

1. **No Local Storage**: Images stored in the cloud
2. **Automatic Optimization**: WebP format, compression, resizing
3. **Global CDN**: Fast loading worldwide
4. **Responsive Images**: Multiple sizes generated automatically
5. **Transformations**: On-the-fly image modifications
6. **Backup**: Images safely stored in the cloud
7. **Analytics**: Cloudinary provides usage analytics

## Troubleshooting

### Common Issues

1. **Invalid Credentials**: Check your Cloudinary credentials in `.env`
2. **Upload Failures**: Verify your API key has upload permissions
3. **Image Not Found**: Ensure the public ID format is correct
4. **CORS Issues**: Check your CORS configuration

### Debug Mode

Enable debug logging by setting:
```env
LOG_LEVEL=debug
```

### Test Connection

```bash
npm run migrate:cloudinary
```

This will test your Cloudinary connection and upload a test image.

