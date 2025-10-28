# Framer Integration Guide

This guide explains how to integrate the Rentman API Client with Framer for creating property listing websites and applications.

## Quick Start

### 1. Start the API Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` with the following endpoints:
- Properties: `http://localhost:3000/api/properties`
- Search: `http://localhost:3000/api/search/properties`
- Media: `http://localhost:3000/api/media/:propertyId`

### 2. Configure Framer

In your Framer project, create a data source that points to the API:

```javascript
// In Framer, create a data source
const propertiesData = Data("http://localhost:3000/api/properties?limit=20");
```

## Data Structure

The API returns data in a Framer-optimized format:

### Property Object
```javascript
{
  id: "123",
  address: "123 Test Street, London",
  price: "£1,500 pcm",
  rentMonth: 1500,
  type: "Apartment",
  beds: 2,
  baths: 1,
  receptions: 1,
  furnished: "3",
  heating: "GCH",
  available: "2024-01-01",
  status: "Available",
  rating: 4.5,
  age: "Modern",
  description: "A beautiful modern apartment...",
  strapline: "Modern 2 Bed Apartment",
  postcode: "SW1A 1AA",
  area: "Westminster",
  url: "https://example.com",
  images: {
    main: {
      thumb: "/api/images/prop123_thumb.webp",
      medium: "/api/images/prop123_medium.webp",
      large: "/api/images/prop123_large.webp",
      original: "/api/images/prop123_original.webp"
    },
    floorplan: {
      thumb: "/api/images/floorplan_thumb.webp",
      medium: "/api/images/floorplan_medium.webp",
      large: "/api/images/floorplan_large.webp",
      original: "/api/images/floorplan_original.webp"
    },
    gallery: [
      {
        id: "img1.jpg",
        caption: "Living Room",
        order: 1,
        urls: {
          thumb: "/api/images/img1_thumb.webp",
          medium: "/api/images/img1_medium.webp",
          large: "/api/images/img1_large.webp",
          original: "/api/images/img1_original.webp"
        }
      }
    ]
  }
}
```

## Framer Components

### Property Card Component

```javascript
// Property Card Component
export function PropertyCard({ property }) {
  return (
    <Frame
      width={300}
      height={400}
      background="#ffffff"
      borderRadius={8}
      shadow="0 4px 12px rgba(0,0,0,0.1)"
    >
      {/* Property Image */}
      <Frame
        width="100%"
        height={200}
        backgroundImage={property.images.main.medium}
        backgroundSize="cover"
        backgroundPosition="center"
      />
      
      {/* Property Details */}
      <Frame
        y={220}
        padding={16}
        width="100%"
      >
        <Text
          text={property.strapline}
          fontSize={18}
          fontWeight={600}
          color="#333"
        />
        
        <Text
          y={30}
          text={property.address}
          fontSize={14}
          color="#666"
        />
        
        <Text
          y={50}
          text={property.price}
          fontSize={20}
          fontWeight={700}
          color="#2563eb"
        />
        
        <Frame
          y={80}
          direction="horizontal"
          gap={16}
        >
          <Text
            text={`${property.beds} bed`}
            fontSize={12}
            color="#666"
          />
          <Text
            text={`${property.baths} bath`}
            fontSize={12}
            color="#666"
          />
          <Text
            text={property.type}
            fontSize={12}
            color="#666"
          />
        </Frame>
      </Frame>
    </Frame>
  );
}
```

### Property Grid Component

```javascript
// Property Grid Component
export function PropertyGrid() {
  const properties = Data("http://localhost:3000/api/properties?limit=12");
  
  return (
    <Frame
      width="100%"
      padding={24}
    >
      <Frame
        direction="horizontal"
        wrap="wrap"
        gap={24}
        width="100%"
      >
        {properties.map((property, index) => (
          <PropertyCard
            key={property.id}
            property={property}
            x={index % 3 * 324}
            y={Math.floor(index / 3) * 424}
          />
        ))}
      </Frame>
    </Frame>
  );
}
```

### Search Component

```javascript
// Search Component
export function PropertySearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  
  const handleSearch = async (query) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/search/properties?q=${encodeURIComponent(query)}&limit=20`
      );
      const data = await response.json();
      setSearchResults(data.data.properties);
    } catch (error) {
      console.error("Search error:", error);
    }
  };
  
  return (
    <Frame width="100%" padding={24}>
      <Input
        placeholder="Search properties..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSearch(searchQuery);
          }
        }}
      />
      
      {searchResults.length > 0 && (
        <Frame y={60} width="100%">
          {searchResults.map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              x={index % 3 * 324}
              y={Math.floor(index / 3) * 424}
            />
          ))}
        </Frame>
      )}
    </Frame>
  );
}
```

### Property Detail Component

```javascript
// Property Detail Component
export function PropertyDetail({ propertyId }) {
  const [property, setProperty] = useState(null);
  const [media, setMedia] = useState([]);
  
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        // Fetch property details
        const propertyResponse = await fetch(
          `http://localhost:3000/api/properties/${propertyId}`
        );
        const propertyData = await propertyResponse.json();
        setProperty(propertyData.data);
        
        // Fetch property media
        const mediaResponse = await fetch(
          `http://localhost:3000/api/media/${propertyId}`
        );
        const mediaData = await mediaResponse.json();
        setMedia(mediaData.data);
      } catch (error) {
        console.error("Error fetching property:", error);
      }
    };
    
    fetchProperty();
  }, [propertyId]);
  
  if (!property) return <Frame>Loading...</Frame>;
  
  return (
    <Frame width="100%" padding={24}>
      {/* Main Image */}
      <Frame
        width="100%"
        height={400}
        backgroundImage={property.images.main.large}
        backgroundSize="cover"
        backgroundPosition="center"
        borderRadius={8}
      />
      
      {/* Property Info */}
      <Frame y={420} width="100%">
        <Text
          text={property.strapline}
          fontSize={32}
          fontWeight={700}
          color="#333"
        />
        
        <Text
          y={40}
          text={property.address}
          fontSize={18}
          color="#666"
        />
        
        <Text
          y={70}
          text={property.price}
          fontSize={28}
          fontWeight={700}
          color="#2563eb"
        />
        
        {/* Property Features */}
        <Frame y={110} direction="horizontal" gap={24}>
          <Text text={`${property.beds} bed`} fontSize={16} color="#666" />
          <Text text={`${property.baths} bath`} fontSize={16} color="#666" />
          <Text text={property.type} fontSize={16} color="#666" />
          <Text text={property.area} fontSize={16} color="#666" />
        </Frame>
        
        {/* Description */}
        <Text
          y={150}
          text={property.description}
          fontSize={16}
          color="#333"
          width="100%"
        />
      </Frame>
      
      {/* Image Gallery */}
      {media.length > 0 && (
        <Frame y={300} width="100%">
          <Text
            text="Gallery"
            fontSize={24}
            fontWeight={600}
            color="#333"
            marginBottom={16}
          />
          
          <Frame direction="horizontal" wrap="wrap" gap={16}>
            {media.map((image, index) => (
              <Frame
                key={image.id}
                width={200}
                height={150}
                backgroundImage={image.urls.medium}
                backgroundSize="cover"
                backgroundPosition="center"
                borderRadius={8}
                onClick={() => {
                  // Open image in lightbox
                  console.log("Open image:", image.urls.original);
                }}
              />
            ))}
          </Frame>
        </Frame>
      )}
    </Frame>
  );
}
```

## Responsive Images

The API provides multiple image sizes for responsive design:

```javascript
// Use different sizes based on screen size
const getImageUrl = (property, size) => {
  const sizes = {
    mobile: property.images.main.thumb,
    tablet: property.images.main.medium,
    desktop: property.images.main.large
  };
  return sizes[size] || property.images.main.medium;
};

// In your component
<Frame
  backgroundImage={getImageUrl(property, "desktop")}
  backgroundSize="cover"
/>
```

## Search and Filtering

### Advanced Search

```javascript
// Advanced search with multiple filters
const searchProperties = async (filters) => {
  const params = new URLSearchParams();
  
  if (filters.query) params.append("q", filters.query);
  if (filters.area) params.append("area", filters.area);
  if (filters.type) params.append("type", filters.type);
  if (filters.beds) params.append("beds", filters.beds);
  if (filters.minPrice) params.append("minPrice", filters.minPrice);
  if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);
  if (filters.featured) params.append("featured", filters.featured);
  
  const response = await fetch(
    `http://localhost:3000/api/search/properties?${params.toString()}`
  );
  return response.json();
};
```

### Search Suggestions

```javascript
// Get search suggestions for autocomplete
const getSearchSuggestions = async (query) => {
  if (query.length < 2) return [];
  
  const response = await fetch(
    `http://localhost:3000/api/search/suggestions?q=${encodeURIComponent(query)}`
  );
  const data = await response.json();
  return data.data;
};
```

## Error Handling

```javascript
// Error handling for API calls
const fetchProperties = async () => {
  try {
    const response = await fetch("http://localhost:3000/api/properties");
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || "API error");
    }
    
    return data.data;
  } catch (error) {
    console.error("Error fetching properties:", error);
    // Handle error in UI
    return [];
  }
};
```

## Loading States

```javascript
// Loading state component
export function PropertyGridWithLoading() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchProperties();
        setProperties(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (loading) {
    return (
      <Frame width="100%" height={400} center>
        <Text text="Loading properties..." fontSize={18} color="#666" />
      </Frame>
    );
  }
  
  if (error) {
    return (
      <Frame width="100%" height={400} center>
        <Text text={`Error: ${error}`} fontSize={18} color="#e53e3e" />
      </Frame>
    );
  }
  
  return (
    <Frame width="100%">
      {properties.map((property, index) => (
        <PropertyCard
          key={property.id}
          property={property}
          x={index % 3 * 324}
          y={Math.floor(index / 3) * 424}
        />
      ))}
    </Frame>
  );
}
```

## Performance Tips

1. **Use appropriate image sizes**: Use `thumb` for lists, `medium` for cards, `large` for details
2. **Implement pagination**: Load properties in batches to improve performance
3. **Cache data**: Store frequently accessed data in Framer's data layer
4. **Lazy load images**: Load images only when they come into view
5. **Debounce search**: Wait for user to stop typing before searching

## Example Projects

### Property Listing Website
- Property grid with search and filters
- Property detail pages with image galleries
- Featured properties section
- Area-based property browsing

### Property Management Dashboard
- Property overview with statistics
- Quick search and filtering
- Property status management
- Media management interface

### Mobile Property App
- Swipeable property cards
- Map integration
- Quick property details
- Image galleries with gestures

## Troubleshooting

### Common Issues

1. **CORS errors**: Ensure the API server is running and CORS is configured
2. **Image loading issues**: Check that image URLs are correct and accessible
3. **Search not working**: Verify search parameters are properly encoded
4. **Slow loading**: Implement pagination and use appropriate image sizes

### Debug Tips

1. Check browser console for errors
2. Verify API responses in Network tab
3. Test API endpoints directly with tools like Postman
4. Check server logs for errors

## Support

For additional help:
- Check the API reference documentation
- Review the example code in `src/examples/`
- Check server logs for error details
- Ensure all environment variables are set correctly
