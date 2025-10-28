# API Reference

## Base URL
```
http://localhost:3000/api
```

## Authentication
All API requests require a valid Rentman token. The token is automatically included in requests to the Rentman API.

## Response Format
All API responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Format
Error responses follow this format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "code": "HTTP_STATUS_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Properties

### Get All Properties
```http
GET /api/properties
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Number of properties per page (default: 25, max: 1000)
- `featured` (number, optional): Filter featured properties (1 = featured only)
- `area` (number, optional): Include area information (1 = include areas)
- `rob` (string, optional): Property type filter ("rent" or "sale")
- `noimage` (number, optional): Exclude image data (1 = exclude images)

**Example Request:**
```http
GET /api/properties?limit=10&featured=1
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "address": "123 Test Street, London",
      "price": "£1,500 pcm",
      "rentMonth": 1500,
      "type": "Apartment",
      "beds": 2,
      "baths": 1,
      "images": {
        "main": {
          "thumb": "/api/images/prop123_thumb.webp",
          "medium": "/api/images/prop123_medium.webp",
          "large": "/api/images/prop123_large.webp",
          "original": "/api/images/prop123_original.webp"
        }
      }
    }
  ],
  "message": "Found 10 properties",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Get Property by ID
```http
GET /api/properties/:id
```

**Path Parameters:**
- `id` (string, required): Property reference ID

**Query Parameters:**
- `noimage` (number, optional): Exclude image data (1 = exclude images)

**Example Request:**
```http
GET /api/properties/123
```

### Get Featured Properties
```http
GET /api/properties/featured
```

**Query Parameters:**
- `limit` (number, optional): Number of properties (default: 10)

### Search Properties
```http
GET /api/properties/search
```

**Query Parameters:**
- `q` (string, optional): Search query
- `area` (string, optional): Area filter
- `type` (string, optional): Property type ("rent" or "sale")
- `beds` (number, optional): Minimum bedroom count
- `minPrice` (number, optional): Minimum price
- `maxPrice` (number, optional): Maximum price
- `featured` (boolean, optional): Featured properties only
- `page` (number, optional): Page number
- `limit` (number, optional): Results per page

**Example Request:**
```http
GET /api/properties/search?q=London&beds=2&minPrice=1000&maxPrice=2000
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "properties": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 25,
      "total": 50,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "areas": ["Westminster", "Camden"],
      "types": ["Apartment", "House"],
      "priceRange": {
        "min": 1000,
        "max": 3000
      }
    }
  },
  "message": "Found 50 properties matching search criteria",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Media

### Get Property Media
```http
GET /api/media/:propertyId
```

**Path Parameters:**
- `propertyId` (string, required): Property reference ID

**Query Parameters:**
- `format` (string, optional): Response format ("json" or "base64")

**Example Request:**
```http
GET /api/media/123
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "image1.jpg",
      "caption": "Living Room",
      "order": 1,
      "urls": {
        "thumb": "/api/images/image1_thumb.webp",
        "medium": "/api/images/image1_medium.webp",
        "large": "/api/images/image1_large.webp",
        "original": "/api/images/image1_original.webp"
      }
    }
  ],
  "message": "Found 5 media files for property 123",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Get Media File
```http
GET /api/media/file/:filename
```

**Path Parameters:**
- `filename` (string, required): Media filename

**Query Parameters:**
- `format` (string, optional): Response format ("json" or "base64")

---

## Search

### Advanced Property Search
```http
GET /api/search/properties
```

**Query Parameters:**
Same as `/api/properties/search` but with additional filtering options.

### Get Search Suggestions
```http
GET /api/search/suggestions
```

**Query Parameters:**
- `q` (string, required): Search query (minimum 2 characters)

**Example Request:**
```http
GET /api/search/suggestions?q=London
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "areas": ["London", "London Bridge", "London Fields"],
    "types": ["Apartment", "House", "Studio"],
    "addresses": ["123 London Street", "456 London Road"]
  },
  "message": "Search suggestions generated",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Images

### Get Optimized Image
```http
GET /api/images/:filename
```

**Path Parameters:**
- `filename` (string, required): Image filename

**Query Parameters:**
- `size` (string, optional): Image size ("thumb", "medium", "large", "original")
- `format` (string, optional): Image format ("webp", "jpeg")

**Example Request:**
```http
GET /api/images/property123_medium.webp
```

**Response:** Binary image data

---

## Health

### Health Check
```http
GET /api/health
```

**Example Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

---

## Data Types

### Property Object
```typescript
interface Property {
  id: string;
  address: string;
  price: string;
  rentMonth: number;
  type: string;
  beds: number;
  singles: number;
  doubles: number;
  baths: number;
  receptions: number;
  furnished: string;
  heating: string;
  available: string;
  status: string;
  rating: number;
  age: string;
  description: string;
  strapline: string;
  postcode: string;
  area: string;
  url: string;
  images: {
    main: ImageSet;
    floorplan?: ImageSet;
    gallery: Image[];
  };
}
```

### Image Object
```typescript
interface Image {
  id: string;
  caption: string;
  order: number;
  urls: ImageSet;
}

interface ImageSet {
  thumb: string;
  medium: string;
  large: string;
  original: string;
}
```

### Pagination Object
```typescript
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `400` | Bad Request - Invalid parameters |
| `404` | Not Found - Resource not found |
| `500` | Internal Server Error - Server error |
| `UNKNOWN_ERROR` | Unknown error occurred |
| `NETWORK_ERROR` | Network connection error |
| `TIMEOUT_ERROR` | Request timeout |

---

## Rate Limiting

The API implements rate limiting to ensure fair usage:
- **Default limit:** 100 requests per minute per IP
- **Headers:** Rate limit information is included in response headers
- **Exceeded limit:** Returns 429 status code

---

## CORS

The API supports Cross-Origin Resource Sharing (CORS) for web applications:
- **Allowed origins:** Configurable via `CORS_ORIGIN` environment variable
- **Methods:** GET, POST, PUT, DELETE, OPTIONS
- **Headers:** Content-Type, Authorization, X-Requested-With

---

## Examples

### JavaScript/Fetch
```javascript
// Get properties
const response = await fetch('http://localhost:3000/api/properties?limit=10');
const data = await response.json();

// Search properties
const searchResponse = await fetch('http://localhost:3000/api/search/properties?q=London&beds=2');
const searchData = await searchResponse.json();

// Get property media
const mediaResponse = await fetch('http://localhost:3000/api/media/123');
const mediaData = await mediaResponse.json();
```

### cURL
```bash
# Get properties
curl "http://localhost:3000/api/properties?limit=10"

# Search properties
curl "http://localhost:3000/api/search/properties?q=London&beds=2"

# Get property media
curl "http://localhost:3000/api/media/123"
```

### Axios
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// Get properties
const properties = await api.get('/properties', {
  params: { limit: 10 }
});

// Search properties
const search = await api.get('/search/properties', {
  params: { q: 'London', beds: 2 }
});
```
