/**
 * Basic Usage Examples
 * Simple examples of using the Rentman API Client
 */

import { RentmanApiClient } from '../client/RentmanApiClient';
import { RentmanApiConfig } from '../types';

// Example 1: Basic setup and usage
async function basicExample() {
  console.log('=== Basic Usage Example ===');
  
  // Initialize the client
  const config: RentmanApiConfig = {
    token: process.env.RENTMAN_TOKEN || 'your-token-here',
    baseURL: process.env.RENTMAN_BASE_URL || 'https://www.rentman.online'
  };
  
  const client = new RentmanApiClient(config);
  
  try {
    // Get all properties
        const properties = await client.getPropertyAdvertising({ limit: 5 });
        
    // Display first property
    if (properties.data.length > 0) {
      const property = properties.data[0];
      console.log('First property:', {
        id: property.propref,
        address: property.displayaddress,
        price: property.displayprice,
        type: property.TYPE,
        beds: property.beds
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 2: Search properties by area
async function searchExample() {
  console.log('\n=== Search Example ===');
  
  const client = new RentmanApiClient({
    token: process.env.RENTMAN_TOKEN || 'your-token-here',
    baseURL: process.env.RENTMAN_BASE_URL || 'https://www.rentman.online'
  });
  
  try {
    // Search for properties in a specific area
    const properties = await client.searchPropertiesByArea('London', 10);
    console.log(`Found ${properties.length} properties in London`);
    
    properties.forEach((property, index) => {
      console.log(`${index + 1}. ${property.displayaddress} - ${property.displayprice}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 3: Get property with media
async function propertyWithMediaExample() {
  console.log('\n=== Property with Media Example ===');
  
  const client = new RentmanApiClient({
    token: process.env.RENTMAN_TOKEN || 'your-token-here',
    baseURL: process.env.RENTMAN_BASE_URL || 'https://www.rentman.online'
  });
  
  try {
    // Get a specific property with its media
    const propertyId = '2'; // Example property ID
    const propertyWithMedia = await client.getPropertyWithMedia(propertyId);
    
    console.log('Property:', {
      id: propertyWithMedia.property.propref,
      address: propertyWithMedia.property.displayaddress,
      price: propertyWithMedia.property.displayprice
    });
    
    console.log(`Media files: ${propertyWithMedia.media.length}`);
    propertyWithMedia.media.forEach((media, index) => {
      console.log(`${index + 1}. ${media.filename} - ${media.caption}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 4: Get featured properties
async function featuredPropertiesExample() {
  console.log('\n=== Featured Properties Example ===');
  
  const client = new RentmanApiClient({
    token: process.env.RENTMAN_TOKEN || 'your-token-here',
    baseURL: process.env.RENTMAN_BASE_URL || 'https://www.rentman.online'
  });
  
  try {
    // Get featured properties
    const featured = await client.getFeaturedProperties(5);
    console.log(`Found ${featured.length} featured properties`);
    
    featured.forEach((property, index) => {
      console.log(`${index + 1}. ${property.strapline} - ${property.displayprice}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Example 5: Health check
async function healthCheckExample() {
  console.log('\n=== Health Check Example ===');
  
  const client = new RentmanApiClient({
    token: process.env.RENTMAN_TOKEN || 'your-token-here',
    baseURL: process.env.RENTMAN_BASE_URL || 'https://www.rentman.online'
  });
  
  try {
    const isHealthy = await client.healthCheck();
    console.log(`API Health: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run all examples
async function runAllExamples() {
  await basicExample();
  await searchExample();
  await propertyWithMediaExample();
  await featuredPropertiesExample();
  await healthCheckExample();
}

// Export for use in other files
export {
  basicExample,
  searchExample,
  propertyWithMediaExample,
  featuredPropertiesExample,
  healthCheckExample,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
