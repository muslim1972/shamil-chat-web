/**
 * دليل المطور: كيف يعمل نظام الحماية والأمان
 * يوضح للمطور متى يمنع ومتى لا يمنع التعديل
 */

import React from 'react';
import { AlertTriangle, CheckCircle, Shield, Code } from 'lucide-react';

export const DeveloperProtectionGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-500" />
          دليل المطور: نظام الحماية والأمان
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          كل ما تحتاج معرفته عن كيفية عمل نظام الحماية والأمان في التطبيق
        </p>
      </div>

      <div className="space-y-6">
        {/* ماذا يمنع النظام */}
        <div className="border-l-4 border-red-500 pl-4">
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5" />
            ما يمنع النظام (في حالات خاصة فقط)
          </h3>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
              <span><strong>الوحدات المحمية للقراءة فقط:</strong> النظام يمنع تعديل ملفات الوحدات المعزولة إذا وضعت `readonly: true`</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
              <span><strong>في وضع الصيانة:</strong> إذا كان النظام في وضع `maintenance`، قد تمنع بعض العمليات</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
              <span><strong>في حالة الفشل الكامل:</strong> إذا كانت جميع الوحدات في حالة `error`</span>
            </li>
          </ul>
        </div>

        {/* ماذا لا يمنع النظام */}
        <div className="border-l-4 border-green-500 pl-4">
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5" />
            ما لا يمنع النظام (الطبيعي)
          </h3>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
              <span><strong>التعديل العادي:</strong> يمكنك تعديل أي ملف عادي عادياً</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
              <span><strong>إضافة خصائص جديدة:</strong> إضافة مكونات ووظائف جديدة</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
              <span><strong>تعديل الوحدات غير المحمية:</strong> مثل `image-processing`, `audio-processing`</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
              <span><strong>تعديل الوحدات مع إلغاء الحماية:</strong> يمكنك إزالة الحماية إذا أردت</span>
            </li>
          </ul>
        </div>

        {/* كيفية إلغاء الحماية */}
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-2">
            <Code className="w-5 h-5" />
            كيفية إلغاء الحماية (إذا احتجت)
          </h3>
          <div className="bg-gray-100 dark:bg-gray-700 rounded p-4">
            <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
{`// في ملف المكون الخاص بك
const { enableModuleProtection, setModuleReadonly } = useModuleIsolationManager();

// إلغاء الحماية (تسمح بالتعديل)
enableModuleProtection('video-thumbnail', false);

// جعل الوحدة قابلة للتعديل
setModuleReadonly('video-thumbnail', false);

// أو بديل سريع - إعادة تشغيل النظام
const { resetModule } = useModuleIsolationManager();
await resetModule('video-thumbnail');`}
            </pre>
          </div>
        </div>

        {/* كيفية إدراج لوحة المراقبة */}
        <div className="border-l-4 border-yellow-500 pl-4">
          <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
            كيفية الوصول لواجهة المراقبة
          </h3>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>الرابط المباشر:</strong> <code className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">http://localhost:3000/system-health</code></li>
            <li><strong>من خلال التطبيق:</strong> أضف <code className="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">/system-health</code> للرابط الحالي</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DeveloperProtectionGuide;