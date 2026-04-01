// Message Helper Functions
// These functions handle various message-related operations

// دالة للتحقق مما إذا كانت الرسالة تحتوي على موقع
export const isLocationMessage = (text: string) => {
  return text.includes('موقعي الحالي') && text.includes('[عرض على الخريطة]');
};

// دالة لاستخراج إحداثيات الموقع من الرسالة
export const extractLocationFromMessage = (text: string) => {
  try {
    const match = text.match(/(\d+\.\d+),\s*(\d+\.\d+)/);
    if (match && match.length >= 3) {
      const latitude = parseFloat(match[1]);
      const longitude = parseFloat(match[2]);
      
      // التحقق من صحة الإحداثيات
      if (isNaN(latitude) || isNaN(longitude)) {
        return null;
      }
      
      return { latitude, longitude };
    }
  } catch (error) {
    console.error('Error extracting location from message:', error);
  }
  return null;
};

// دالة لاستخراج رابط الخريطة من الرسالة
export const extractMapUrlFromMessage = (text: string) => {
  try {
    const match = text.match(/\[عرض على الخريطة\]\(([^)]+)\)/);
    return match && match[1] ? match[1] : null;
  } catch (error) {
    console.error('Error extracting map URL from message:', error);
    return null;
  }
};

// دالة لإنشاء رسالة موقع جديدة
export const createLocationMessage = (latitude: number, longitude: number) => {
  try {
    // التحقق من صحة الإحداثيات
    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Invalid coordinates');
    }
    
    // إنشاء رابط خرائط جوجل للموقع
    const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    
    // إنشاء رسالة الموقع
    return `📍 موقعي الحالي\n${latitude}, ${longitude}\n[عرض على الخريطة](${locationUrl})`;
  } catch (error) {
    console.error('Error creating location message:', error);
    return '';
  }
};

// دالة للتحقق من صحة إحداثيات الموقع
export const isValidLocation = (latitude: number, longitude: number) => {
  return !isNaN(latitude) && !isNaN(longitude) && 
         latitude >= -90 && latitude <= 90 && 
         longitude >= -180 && longitude <= 180;
};
