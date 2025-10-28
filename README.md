# Rentman API Client

A comprehensive TypeScript/Node.js API client for the Rentman Advertising API with Framer-optimized REST endpoints.

## Features

- 🏠 **Property Management** - Full property advertising and media API support
- 🎨 **Framer Optimized** - REST endpoints designed specifically for Framer frontend
- 🖼️ **Image Processing** - Automatic image optimization and multiple size generation
- 🔍 **Advanced Search** - Powerful search and filtering capabilities
- 📱 **Responsive Images** - Multiple image sizes for responsive design
- 🚀 **High Performance** - Caching, rate limiting, and error handling
- 📝 **TypeScript** - Full type safety and IntelliSense support
- 🧪 **Well Tested** - Comprehensive test suite with Jest

## Quick Start

### Installation

```bash
npm install
```

### Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update `.env` with your Rentman API credentials:
```env
RENTMAN_TOKEN=your_rentman_token_here
RENTMAN_BASE_URL=https://www.rentman.online
PORT=3000
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## API Endpoints

### Properties

- `GET /api/properties` - List all properties
- `GET /api/properties/:id` - Get specific property
- `GET /api/properties/featured` - Get featured properties
- `GET /api/properties/search` - Search properties

### Media

- `GET /api/media/:propertyId` - Get property media
- `GET /api/media/file/:filename` - Get specific media file

### Search

- `GET /api/search/properties` - Advanced property search
- `GET /api/search/suggestions` - Search suggestions

### Health

- `GET /api/health` - Health check endpoint

## Framer Integration

### Property Data Structure

```typescript
interface FramerProperty {
  id: string;
  address: string;
  price: string;
  rentMonth: number;
  type: string;
  beds: number;
  // ... more fields
  
  images: {
    main: {
      thumb: string;
      medium: string;
      large: string;
      original: string;
    };
    floorplan?: {
      thumb: string;
      medium: string;
      large: string;
      original: string;
    };
    gallery: FramerImage[];
  };
}
```

### Usage in Framer

```javascript
// Fetch properties
const response = await fetch('http://localhost:3000/api/properties');
const data = await response.json();

// Use in Framer component
const properties = data.data;
const firstProperty = properties[0];

// Access images
const mainImage = firstProperty.images.main.medium;
const thumbnails = firstProperty.images.gallery.map(img => img.urls.thumb);
```

## Image Processing

The API automatically processes images for optimal Framer performance:

- **Multiple Sizes**: thumb (300px), medium (800px), large (1200px), original
- **WebP Format**: Modern, optimized image format
- **Responsive**: Automatic srcset generation
- **Caching**: Intelligent caching for fast delivery

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RENTMAN_TOKEN` | Rentman API token | Required |
| `RENTMAN_BASE_URL` | Rentman API base URL | `https://www.rentman.online` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGIN` | CORS origin | `http://localhost:3000` |
| `IMAGE_QUALITY` | Image compression quality | `85` |

### Image Processing

```typescript
// Configure image processing
const imageConfig = {
  quality: 85,
  formats: ['webp', 'jpeg'],
  sizes: [
    { name: 'thumb', width: 300, height: 200 },
    { name: 'medium', width: 800, height: 600 },
    { name: 'large', width: 1200, height: 900 }
  ]
};
```

## Development

### Project Structure

```
src/
├── types/           # TypeScript type definitions
├── client/          # Core API client
├── server/          # Express.js server
│   ├── routes/      # API route handlers
│   └── middleware/  # Express middleware
├── framer/          # Framer-specific utilities
├── utils/           # Utility functions
└── examples/        # Usage examples
```

### Adding New Features

1. **Types**: Add new types in `src/types/`
2. **Client**: Extend `RentmanApiClient` in `src/client/`
3. **Routes**: Add new routes in `src/server/routes/`
4. **Tests**: Add tests in `tests/`

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## API Reference

### RentmanApiClient

```typescript
const client = new RentmanApiClient({
  token: 'your-token',
  baseURL: 'https://www.rentman.online'
});

// Get properties
const properties = await client.getPropertyAdvertising({
  limit: 10,
  page: 1
});

// Get property with media
const propertyWithMedia = await client.getPropertyWithMedia('123');

// Search properties
const searchResults = await client.searchPropertiesByArea('London');
```

### Framer Data Transformers

```typescript
import { transformPropertyForFramer } from './src/framer/dataTransformers';

// Transform API data for Framer
const framerProperty = transformPropertyForFramer(apiProperty);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the examples in `src/examples/`
