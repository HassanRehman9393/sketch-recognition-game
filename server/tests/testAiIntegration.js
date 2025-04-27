const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables if needed
require('dotenv').config();

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5001';
const TEST_IMAGE_PATH = path.join(__dirname, 'test-image.png'); // Add a test image to this path
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'your_test_auth_token'; // Set up for your testing

async function testAiStatus() {
  try {
    console.log('Testing AI service status...');
    const response = await axios.get(`${SERVER_URL}/api/ai/status`);
    console.log('Status response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('Error testing AI status:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

async function testAiClasses() {
  try {
    console.log('Testing AI service classes...');
    const response = await axios.get(`${SERVER_URL}/api/ai/classes`);
    console.log('Classes response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('Error testing AI classes:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

async function testSketchRecognition() {
  try {
    console.log('Testing sketch recognition...');
    
    // Check if test image exists
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.error('Test image not found at:', TEST_IMAGE_PATH);
      return false;
    }
    
    // Read test image file and convert to base64
    const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    
    // Send recognition request
    const response = await axios.post(
      `${SERVER_URL}/api/ai/recognize`,
      { imageData: base64Image },
      { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } }
    );
    
    console.log('Recognition response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('Error testing sketch recognition:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

async function runTests() {
  console.log('Starting API integration tests...');
  
  // Test AI service status
  const statusResult = await testAiStatus();
  
  // Test AI service classes
  const classesResult = await testAiClasses();
  
  // Only test recognition if status and classes are successful
  let recognitionResult = false;
  if (statusResult && classesResult) {
    recognitionResult = await testSketchRecognition();
  }
  
  // Print summary
  console.log('\nTest Summary:');
  console.log(`AI Status: ${statusResult ? 'PASS' : 'FAIL'}`);
  console.log(`AI Classes: ${classesResult ? 'PASS' : 'FAIL'}`);
  console.log(`Sketch Recognition: ${recognitionResult ? 'PASS' : 'FAIL'}`);
  
  // Return overall success
  return statusResult && classesResult && recognitionResult;
}

// Run tests
runTests()
  .then(success => {
    console.log(`\nAll tests ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
