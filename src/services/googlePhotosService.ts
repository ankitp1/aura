
export async function fetchGooglePhotos(accessToken: string, months: number) {
  const dateLimit = new Date();
  dateLimit.setMonth(dateLimit.getMonth() - months);
  
  try {
    const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pageSize: 100, // Process in batches
        filters: {
          dateFilter: {
            ranges: [{
              startDate: { year: dateLimit.getFullYear(), month: dateLimit.getMonth() + 1, day: dateLimit.getDate() },
              endDate: { year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: new Date().getDate() }
            }]
          },
          mediaTypeFilter: {
             mediaTypes: ['PHOTO']
          }
        }
      })
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
    return [];
  }
}
