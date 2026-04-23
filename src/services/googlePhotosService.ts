
export async function fetchGooglePhotos(accessToken: string, months: number) {
  const dateLimit = new Date();
  dateLimit.setMonth(dateLimit.getMonth() - months);
  
  console.log("Using access token for Photos API:", accessToken ? accessToken.substring(0, 15) + "..." : "UNDEFINED");
  
  try {
    const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Google Photos API Error:', response.status, errorBody);
      throw new Error(`Google Photos API failed with status ${response.status}: ${errorBody}`);
    }
    
    const data = await response.json();
    return data.mediaItems || [];
  } catch (error) {
    console.error('Error fetching Google Photos:', error);
    throw error;
  }
}
