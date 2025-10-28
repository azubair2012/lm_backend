/**
 * Framer Integration Examples
 * Examples of using the API with Framer frontend
 */

import { RentmanApiClient } from '../client/RentmanApiClient';
import { transformPropertyForFramer, transformMediaForFramer } from '../framer/dataTransformers';
import { RentmanApiConfig } from '../types';

// Example 1: Fetch properties for Framer
async function fetchPropertiesForFramer() {
  console.log('=== Fetching Properties for Framer ===');
  
  const client = new RentmanApiClient({
    token: process.env.RENTMAN_TOKEN || 'your-token-here',
    baseURL: process.env.RENTMAN_BASE_URL || 'https://www.rentman.online'
  });
  
  try {
    // Get properties from API
    const response = await client.getPropertyAdvertising({ limit: 5, noimage: 1 });
    
    // Transform for Framer
    const framerProperties = response.data.map(transformPropertyForFramer);
    
    console.log('Framer-ready properties:');
    framerProperties.forEach((property, index) => {
      console.log(`${index + 1}. ${property.address} - ${property.price}`);
      console.log(`   Images: ${Object.keys(property.images).length} image sets`);
      console.log(`   Main image: ${property.images.main.medium}`);
    });
    
    return framerProperties;
    
  } catch (error) {
    console.error('Error fetching properties for Framer:', error);
    return [];
  }
}

// Example 2: Fetch property media for Framer
async function fetchPropertyMediaForFramer(propertyId: string) {
  console.log(`=== Fetching Media for Property ${propertyId} ===`);
  
  const client = new RentmanApiClient({
    token: process.env.RENTMAN_TOKEN || 'your-token-here',
    baseURL: process.env.RENTMAN_BASE_URL || 'https://www.rentman.online'
  });
  
  try {
    // Get media from API
    const response = await client.getPropertyMedia({ propref: propertyId });
    
    // Transform for Framer
    const framerMedia = response.data.map(transformMediaForFramer);
    
    console.log(`Found ${framerMedia.length} media files:`);
    framerMedia.forEach((media, index) => {
      console.log(`${index + 1}. ${media.caption}`);
      console.log(`   URLs: ${Object.keys(media.urls).join(', ')}`);
      console.log(`   Order: ${media.order}`);
    });
    
    return framerMedia;
    
  } catch (error) {
    console.error('Error fetching media for Framer:', error);
    return [];
  }
}

// Example 3: Complete property data for Framer
async function getCompletePropertyForFramer(propertyId: string) {
  console.log(`=== Complete Property Data for Framer ===`);
  
  const client = new RentmanApiClient({
    token: process.env.RENTMAN_TOKEN || 'your-token-here',
    baseURL: process.env.RENTMAN_BASE_URL || 'https://www.rentman.online'
  });
  
  try {
    // Get property with media
    const propertyWithMedia = await client.getPropertyWithMedia(propertyId);
    
    // Transform property for Framer
    const framerProperty = transformPropertyForFramer(propertyWithMedia.property);
    
    // Transform media for Framer
    const framerMedia = propertyWithMedia.media.map(transformMediaForFramer);
    
    // Add media to property
    framerProperty.images.gallery = framerMedia;
    
    console.log('Complete Framer property data:');
    console.log(JSON.stringify(framerProperty, null, 2));
    
    return framerProperty;
    
  } catch (error) {
    console.error('Error getting complete property for Framer:', error);
    return null;
  }
}

// Example 4: Search properties for Framer
async function searchPropertiesForFramer(query: string) {
  console.log(`=== Searching Properties for Framer: "${query}" ===`);
  
  const client = new RentmanApiClient({
    token: process.env.RENTMAN_TOKEN || 'your-token-here',
    baseURL: process.env.RENTMAN_BASE_URL || 'https://www.rentman.online'
  });
  
  try {
    // Search properties
    const properties = await client.searchPropertiesByArea(query, 10);
    
    // Transform for Framer
    const framerProperties = properties.map(transformPropertyForFramer);
    
    console.log(`Found ${framerProperties.length} properties matching "${query}"`);
    
    // Group by area for Framer
    const groupedByArea = framerProperties.reduce((acc, property) => {
      if (!acc[property.area]) {
        acc[property.area] = [];
      }
      acc[property.area].push(property);
      return acc;
    }, {} as Record<string, typeof framerProperties>);
    
    console.log('Properties grouped by area:');
    Object.keys(groupedByArea).forEach(area => {
      console.log(`  ${area}: ${groupedByArea[area].length} properties`);
    });
    
    return framerProperties;
    
  } catch (error) {
    console.error('Error searching properties for Framer:', error);
    return [];
  }
}

// Example 5: Generate Framer component data
async function generateFramerComponentData() {
  console.log('=== Generating Framer Component Data ===');
  
  const client = new RentmanApiClient({
    token: process.env.RENTMAN_TOKEN || 'your-token-here',
    baseURL: process.env.RENTMAN_BASE_URL || 'https://www.rentman.online'
  });
  
  try {
    // Get featured properties
    const featured = await client.getFeaturedProperties(3);
    
    // Transform for Framer
    const framerProperties = featured.map(transformPropertyForFramer);
    
    // Generate component data structure
    const componentData = {
      properties: framerProperties,
      totalCount: framerProperties.length,
      lastUpdated: new Date().toISOString(),
      imageSizes: {
        thumb: { width: 300, height: 200 },
        medium: { width: 800, height: 600 },
        large: { width: 1200, height: 900 }
      }
    };
    
    console.log('Framer component data structure:');
    console.log(JSON.stringify(componentData, null, 2));
    
    return componentData;
    
  } catch (error) {
    console.error('Error generating Framer component data:', error);
    return null;
  }
}

// Example 6: REST API usage (for Framer frontend)
async function restApiUsageExample() {
  console.log('=== REST API Usage for Framer ===');
  
  const baseUrl = 'http://localhost:3000/api';
  
  try {
    // Example API calls that Framer would make
    
    // 1. Get all properties
    console.log('1. Fetching all properties...');
    const propertiesResponse = await fetch(`${baseUrl}/properties?limit=5`);
    const propertiesData = await propertiesResponse.json() as any;
    console.log(`Found ${propertiesData.data.length} properties`);
    
    // 2. Get specific property
    if (propertiesData.data.length > 0) {
      const propertyId = propertiesData.data[0].id;
      console.log(`2. Fetching property ${propertyId}...`);
      const propertyResponse = await fetch(`${baseUrl}/properties/${propertyId}`);
      const propertyData = await propertyResponse.json() as any;
      console.log(`Property: ${propertyData.data.address}`);
    }
    
    // 3. Search properties
    console.log('3. Searching properties...');
    const searchResponse = await fetch(`${baseUrl}/search/properties?q=London&limit=3`);
    const searchData = await searchResponse.json() as any;
    console.log(`Found ${searchData.data.properties.length} properties in search`);
    
    // 4. Get featured properties
    console.log('4. Fetching featured properties...');
    const featuredResponse = await fetch(`${baseUrl}/properties/featured?limit=3`);
    const featuredData = await featuredResponse.json() as any;
    console.log(`Found ${featuredData.data.length} featured properties`);
    
  } catch (error) {
    console.error('Error with REST API usage:', error);
  }
}

// Run all Framer examples
async function runAllFramerExamples() {
  await fetchPropertiesForFramer();
  await fetchPropertyMediaForFramer('2');
  await getCompletePropertyForFramer('2');
  await searchPropertiesForFramer('London');
  await generateFramerComponentData();
  await restApiUsageExample();
}

// Export for use in other files
export {
  fetchPropertiesForFramer,
  fetchPropertyMediaForFramer,
  getCompletePropertyForFramer,
  searchPropertiesForFramer,
  generateFramerComponentData,
  restApiUsageExample,
  runAllFramerExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllFramerExamples().catch(console.error);
}
