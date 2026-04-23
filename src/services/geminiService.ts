import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Automatically tags a clothing item with category, vibe, and color.
 */
export async function tagItem(imageData: string) {
  const model = "gemini-3-flash-preview";

  const prompt = `
    Analyze this clothing item and provide detailed tagging.
    Identify:
    1. Category: Choose from 'Outerwear', 'Dresses', 'Tops', 'Bottoms', 'Accessories', 'Suits', 'Knitwear'.
    2. Vibe/Persona: Identify the stylistic aura (e.g., 'Minimalist', 'Bohemian', 'Chic', 'Brutalist', 'Streetwear', 'Etherial', 'Classic').
    3. Specific Color: Be precise (e.g., 'Midnight Navy', 'Dusty Rose', 'Charcoal').
    4. Versatility: A score from 1-10 on how easy it is to style.
    
    Return in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { text: prompt },
        { inlineData: { mimeType: "image/jpeg", data: imageData.split(',')[1] || imageData } }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            vibe: { type: Type.STRING },
            color: { type: Type.STRING },
            versatilityScore: { type: Type.NUMBER },
            description: { type: Type.STRING }
          },
          required: ["category", "vibe", "color", "versatilityScore"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error tagging item:", error);
    return null;
  }
}

export async function analyzeItemVersatility(itemImageUrl: string, existingItems: string[]) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this new clothing item against the user's existing wardrobe.
    Existing items are represented by these descriptions: ${existingItems.join(", ")}.
    
    1. Provide a Versatility Score (1-10).
    2. Check for Redundancy: Does this overlap significantly with existing items?
    3. Suggest 3 outfit pairings with existing items.
    4. Categorize it and identify its stylistic Vibe.
    
    Return the response in JSON format.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      { text: prompt },
      { inlineData: { mimeType: "image/jpeg", data: itemImageUrl.split(',')[1] || itemImageUrl } }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          color: { type: Type.STRING },
          versatilityScore: { type: Type.NUMBER },
          redundancyCheck: { type: Type.STRING },
          pairings: { type: Type.ARRAY, items: { type: Type.STRING } },
          vibe: { type: Type.STRING }
        },
        required: ["versatilityScore", "redundancyCheck", "pairings", "category", "color", "vibe"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

/**
 * Analyzes a batch of photos and extracts unique wardrobe items.
 */
export async function extractItemsFromPhotos(photos: { baseUrl: string, id: string }[]) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    I am providing a list of media items from a user's photo library.
    Your task is to:
    1. Identify UNIQUE clothing items (ignore background, people faces, and duplicates).
    2. For each unique item, pinpoint the 'Hero' image (the clearest one).
    3. Categorize them and assign a 'Vibe' aura.
    
    Return a JSON array of objects:
    - id (original photo ID used as reference)
    - imageUrl (use the provided baseUrl)
    - category (Outerwear, Tops, Bottoms, etc.)
    - color
    - vibe (Minimalist, Bohemian, Chic, etc.)
    - reasoning
  `;

  // Filter to a manageable batch size for the MVP
  const batch = photos.slice(0, 20); 

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { text: prompt },
        ...batch.map(p => ({ text: `ID: ${p.id}, Source: ${p.baseUrl}=w1000` }))
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              imageUrl: { type: Type.STRING },
              category: { type: Type.STRING },
              color: { type: Type.STRING },
              vibe: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["id", "imageUrl", "category", "color", "vibe"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    return [];
  }
}

/**
 * Analyzes a batch of manually uploaded photos and extracts unique wardrobe items.
 */
export async function extractItemsFromManualUploads(images: string[]) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    I am providing a list of manually uploaded photos of clothing.
    Your task is to:
    1. Identify UNIQUE clothing items.
    2. Categorize them and assign a 'Vibe' aura.
    
    Return a JSON array of objects:
    - id (use the exact Image ID provided, e.g., "0", "1")
    - category (Outerwear, Tops, Bottoms, Dresses, Shoes, Accessories, etc.)
    - color
    - vibe (Minimalist, Bohemian, Chic, Streetwear, etc.)
    - reasoning
  `;

  // Filter to a manageable batch size to avoid payload overflow
  const batch = images.slice(0, 20); 

  const contents: any[] = [{ text: prompt }];
  
  batch.forEach((img, idx) => {
    try {
      const match = img.match(/^data:(image\/[a-zA-Z0-9+-.]+);base64,(.+)$/);
      if (match) {
        contents.push({ text: `Image ID: ${idx}` });
        contents.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    } catch (e) {
      console.warn("Skipping malformed image data", idx);
    }
  });

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              category: { type: Type.STRING },
              color: { type: Type.STRING },
              vibe: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["id", "category", "color", "vibe"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Manual Extraction Error:", error);
    return [];
  }
}

/**
 * Generates outfit recommendations based on the user's closet, a style goal, and current weather.
 */
export async function generateStylingAdvice(closetItems: any[], goal: string, weatherContext?: string) {
  const model = "gemini-3-flash-preview";

  const prompt = `
    The user wants styling advice for the following goal: "${goal}".
    ${weatherContext ? `WEATHER CONTEXT (Next 6 hours): ${weatherContext}` : ""}
    
    Here is their capsule wardrobe:
    ${closetItems.map(item => `[ID: ${item.id}] - ${item.color} ${item.category} (${item.vibe})`).join('\n')}
    
    Tasks:
    1. Recommend 3 distinct outfits using ONLY items from the list above.
    2. Ensure outfits are highly appropriate for the provided weather context (e.g. layering for cold/rain, breathable for heat).
    3. For each outfit, explain WHY it works for the goal, the vibe, AND how it protects/suits the weather condition.
    4. For each outfit, return the exact IDs of the items you selected in the 'itemIds' array.
    5. Suggest a "missing piece" they might consider adding to complete these looks.
    
    Return in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            outfits: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  items: { type: Type.ARRAY, items: { type: Type.STRING } },
                  itemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                  explanation: { type: Type.STRING }
                },
                required: ["name", "items", "itemIds", "explanation"]
              }
            },
            missingPieceSuggestion: { type: Type.STRING }
          },
          required: ["outfits", "missingPieceSuggestion"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Styling Error:", error);
    return null;
  }
}
