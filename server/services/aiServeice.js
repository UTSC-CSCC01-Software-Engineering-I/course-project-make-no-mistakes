export const verifyCommentRelevance = async (content) => {
  try {
    // 1. Artificial delay to simulate AI processing time (0.5 seconds)
    // This allows you to test the frontend loading state!
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. keyword list
    const validKeywords = [
      "add", 
      "create", 
      "change", 
      "update", 
      "modify", 
      "remove",
      "delete",
      "mapping", 
      "distribution", 
      "battery", 
      "objection",
      "boundary",
      "riding",
      "district",
      "proposal"
    ];

    // 3. Convert comment to lowercase for case-insensitive matching
    const lowerContent = content.toLowerCase();

    // 4. Check if the comment contains at least one of the keywords
    const isRelevant = validKeywords.some(keyword => lowerContent.includes(keyword));

    // If it contains a keyword, it passes (true). If not, it fails (false).
    return isRelevant;
    
  } catch (error) {
    console.error("Keyword Verification Error:", error);
    return false; 
  }
};