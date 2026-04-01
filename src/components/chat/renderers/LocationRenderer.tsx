import React, { memo } from 'react';
import { MapPin } from 'lucide-react';
import {
    extractLocationFromMessage,
    extractMapUrlFromMessage,
} from '../../../utils/messageHelpers';

interface LocationRendererProps {
    text: string;
}

/**
 * مكون عرض الموقع
 * يعرض الموقع على الخريطة مع رابط لفتحه في Google Maps
 */
export const LocationRenderer: React.FC<LocationRendererProps> = memo(({
    text,
}) => {
    const location = extractLocationFromMessage(text);

    if (!location) {
        return <p className="text-red-500">خطأ في عرض الموقع</p>;
    }

    const mapUrl = extractMapUrlFromMessage(text);
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location.latitude},${location.longitude}&zoom=15&size=400x200&markers=color:red%7C${location.latitude},${location.longitude}&key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg`;

    return (
        <div className="w-full">
            <div className="bg-white rounded-lg overflow-hidden shadow-md border border-gray-200">
                <div className="p-2 bg-gray-100 text-center font-medium text-gray-700">
                    موقعي الحالي
                </div>
                <div className="relative h-40 bg-gray-200">
                    <img
                        src={staticMapUrl}
                        alt="موقع على الخريطة"
                        className="w-full h-full object-cover"
                    />
                    <div
                        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => {
                            if (mapUrl) {
                                window.open(mapUrl, '_blank');
                            }
                        }}
                    >
                        <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center">
                            <MapPin size={16} className="ml-2 text-green-500" />
                            <span className="font-medium">فتح في الخرائط</span>
                        </div>
                    </div>
                </div>
                <div className="p-2 text-xs text-gray-500 text-center bg-gray-50 border-t border-gray-200">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </div>
            </div>
        </div>
    );
});

LocationRenderer.displayName = 'LocationRenderer';
