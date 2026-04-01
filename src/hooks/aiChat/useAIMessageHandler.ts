// هوك لمراقبة رسائل AI والرد عليها تلقائياً
// يراقب الرسائل الجديدة ويستدعي AI عند الحاجة

import { useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface AIMessageHandlerProps {
  conversationId?: string;
  isActive: boolean;
}

// معرف البوت الذكي (AI Bot) من قاعدة البيانات
const AI_BOT_USER_ID = '4ed1b4c0-7746-4bb6-aadc-86342d3d26a2';

// تفعيل هذا للتشخيص
const DEBUG_AI = false;

export function useAIMessageHandler({ conversationId, isActive }: AIMessageHandlerProps) {
  const { user } = useAuth();
  const lastProcessedMessageRef = useRef<string | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const debugLog = (...args: any[]) => {
    if (DEBUG_AI) console.log('[🤖 AI HANDLER]', ...args);
  };

  useEffect(() => {
    if (!conversationId || !user || !isActive) {
      debugLog('فشل التفعيل - conversationId:', conversationId, 'user:', !!user, 'isActive:', isActive);
      return;
    }

    debugLog('✅ تم تفعيل AI Handler للمحادثة:', conversationId);

    // التحقق من أن هذه محادثة AI
    const checkIfAIConversation = async () => {
      try {
        debugLog('🔍 فحص نوع المحادثة...');
        const { data: convData, error } = await supabase
          .from('conversations')
          .select('participants, type, name')
          .eq('id', conversationId)
          .single();

        if (error) {
          debugLog('❌ خطأ في جلب بيانات المحادثة:', error);
          return false;
        }

        debugLog('📋 بيانات المحادثة:', convData);

        // التحقق من نوع المحادثة (الطريقة الصحيحة)
        const isAIByType = convData?.type === 'ai';
        const isAIByName = convData?.name?.toLowerCase().includes('ai') ||
          convData?.name?.toLowerCase().includes('المحاور');
        const isAI = isAIByType || isAIByName;

        debugLog('🤖 نتائج فحص AI:', {
          isAIByType,
          isAIByName,
          finalResult: isAI
        });

        return isAI;
      } catch (error) {
        debugLog('❌ خطأ في فحص محادثة AI:', error);
        return false;
      }
    };

    let isAIConversation = false;
    let messageChannel: any = null;

    const setupAIMonitoring = async () => {
      isAIConversation = await checkIfAIConversation();
      if (!isAIConversation) {
        debugLog('❌ هذه ليست محادثة AI، لا نحتاج مراقبة');
        return;
      }

      debugLog('🎯 تم التأكد من أنها محادثة AI، تفعيل المراقبة...');

      // مراقبة الرسائل الجديدة
      messageChannel = supabase
        .channel(`ai-messages-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          async (payload: any) => {
            const newMessage = payload.new;
            debugLog('📨 تم استلام رسالة جديدة:', newMessage);

            // تجاهل الرسائل من البوت نفسه
            if (newMessage.sender_id === AI_BOT_USER_ID) {
              debugLog('🚫 تجاهل رسالة من البوت');
              return;
            }

            // تجنب معالجة نفس الرسالة عدة مرات
            if (lastProcessedMessageRef.current === newMessage.id ||
              isProcessingRef.current) {
              debugLog('⏭️ تم تجاهل الرسالة (معالجة مكررة أو جاري المعالجة)');
              return;
            }

            // التحقق من أن الرسالة نصية وليست من البوت
            if (newMessage.message_type !== 'text') {
              debugLog('🚫 تجاهل رسالة غير نصية');
              return;
            }

            debugLog('🚀 بدء معالجة رسالة AI:', newMessage.content);
            await processAIMessage(newMessage);
          }
        )
        .subscribe((status: any) => {
          debugLog('📡 حالة الاشتراك:', status);
        });

      // تحميل آخر رسالة للتأكد من عدم فوات الردود
      await loadLastMessage();
    };

    const loadLastMessage = async () => {
      try {
        debugLog('📋 جاري تحميل آخر رسالة...');
        const { data: messages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('message_type', 'text')
          .is('is_hidden', false) // 🔥🔥 هام: تجاهل الرسائل المخفية أيضاً
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          debugLog('❌ خطأ في تحميل آخر رسالة:', error);
          return;
        }

        if (messages && messages.length > 0) {
          const lastMessage = messages[0];
          debugLog('📝 آخر رسالة:', lastMessage);

          // إذا كانت آخر رسالة من المستخدم وليست من البوت، قد نحتاج رد
          if (lastMessage.sender_id !== user.id &&
            lastMessage.sender_id !== AI_BOT_USER_ID) {

            // تحقق من وجود رد للبوت
            const { data: aiReply } = await supabase
              .from('messages')
              .select('id')
              .eq('conversation_id', conversationId)
              .gt('created_at', lastMessage.created_at)
              .eq('sender_id', AI_BOT_USER_ID)
              .limit(1);

            if (!aiReply || aiReply.length === 0) {
              debugLog('⚠️ تم العثور على رسالة بلا رد من AI، جاري الإرسال...');
              await processAIMessage(lastMessage);
            } else {
              debugLog('✅ تم العثور على رد من AI موجود');
            }
          } else {
            debugLog('📤 آخر رسالة من البوت، لا نحتاج رد');
          }
        } else {
          debugLog('📭 لا توجد رسائل في هذه المحادثة');
        }
      } catch (error) {
        debugLog('❌ خطأ في تحميل آخر رسالة:', error);
      }
    };

    const processAIMessage = async (userMessage: any) => {
      if (isProcessingRef.current) {
        debugLog('⏳ جاري معالجة رسالة أخرى، تجاهل هذه الرسالة');
        return;
      }

      isProcessingRef.current = true;
      lastProcessedMessageRef.current = userMessage.id;

      try {
        debugLog('🧠 بدء معالجة رسالة AI:', userMessage.content);

        // جمع آخر 5 رسائل للسياق (مع الصور)
        debugLog('📚 جاري جمع سياق المحادثة...');
        const { data: recentMessages, error: historyError } = await supabase
          .from('messages')
          .select('id, content, sender_id, message_type, media_metadata')
          .eq('conversation_id', conversationId)
          .in('message_type', ['text', 'image']) // دعم النصوص والصور
          .is('is_hidden', false) // 🔥🔥 هام: تجاهل الرسائل المخفية أيضاً
          .order('created_at', { ascending: false }) // جلب الأحدث أولاً
          .limit(5);

        if (historyError) {
          debugLog('❌ خطأ في جلب تاريخ المحادثة:', historyError);
        }

        // بناء سياق المحادثة من الرسائل التي تم جلبها
        const conversationHistory: any[] = (recentMessages || [])
          // عكس الترتيب ليصبح من الأقدم للأحدث
          .reverse()
          // تحويل الرسائل إلى صيغة Edge Function
          .map((msg: any) => {
            const isAI = msg.sender_id === AI_BOT_USER_ID;
            const parts: any[] = [];

            // إضافة النص إذا وُجد
            if (msg.content) {
              parts.push({ text: msg.content });
            }

            // إضافة الصورة إذا وُجدت (للرسائل من نوع image)
            const base64Data = msg.media_metadata?.base64_data;
            if (msg.message_type === 'image' && base64Data) {
              parts.push({
                image_url: { url: base64Data }
              });
            }

            return {
              role: isAI ? 'assistant' : 'user',
              parts: parts
            };
          });

        // التأكد من أن رسالة المستخدم الحالية هي آخر رسالة في السياق
        // هذا يمنع إضافتها مرتين إذا كانت قد وصلت عبر realtime بالفعل
        const lastHistoryMessage = conversationHistory[conversationHistory.length - 1];
        if (!lastHistoryMessage || lastHistoryMessage.parts[0].text !== userMessage.content) {
          conversationHistory.push({ role: 'user', parts: [{ text: userMessage.content }] });
        }

        debugLog('🚀 جاري استدعاء AI function...');
        debugLog('📤 البيانات المرسلة:', { messages: conversationHistory });

        // 🔥 استخدام Groq API عبر Edge Function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_CHAT_URL;
        const serviceRoleKey = import.meta.env.VITE_SUPABASE_CHAT_SERVICE_ROLE_KEY;

        // التحقق من وجود المتغيرات الضرورية
        if (!supabaseUrl) {
          throw new Error("VITE_SUPABASE_CHAT_URL is not defined in .env file");
        }
        if (!serviceRoleKey) {
          throw new Error("VITE_SUPABASE_CHAT_SERVICE_ROLE_KEY is not defined in .env file. Please check your .env file.");
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/ai-groq`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`
          },
          body: JSON.stringify({ messages: conversationHistory })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`فشل استدعاء الدالة: ${response.status} ${errorText}`);
        }
        const aiResponse = await response.json();

        debugLog('📥 استجابة AI:', aiResponse);
        const aiMessage = aiResponse?.text || 'عذراً، لم أتمكن من فهم طلبك.';
        debugLog('✅ تم الحصول على رد AI:', aiMessage);

        // حفظ رد AI كرسالة جديدة - بدون ID مخصص
        debugLog('💾 جاري حفظ رد AI...');

        // 🔥 تعديل نهائي: استخدام دالة RPC موثوقة لحفظ رد AI لتجاوز RLS
        const { error: saveError } = await supabase.rpc('save_ai_response', {
          p_conversation_id: conversationId,
          p_content: aiMessage
        });

        if (saveError) {
          debugLog('❌ خطأ في حفظ رد AI:', saveError);
          throw saveError;
        } else {
          debugLog('✅ تم حفظ رد AI بنجاح');
        }

      } catch (error) {
        debugLog('❌ خطأ في معالجة رسالة AI:', error);

        // في حالة الخطأ، أرسل رسالة خطأ
        try {
          debugLog('🚨 جاري إرسال رسالة خطأ...');
          await supabase.rpc('save_ai_response', {
            p_conversation_id: conversationId,
            p_content: `عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى.\n\nتفاصيل الخطأ: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
          });
          debugLog('✅ تم إرسال رسالة خطأ');
        } catch (fallbackError) {
          debugLog('❌ خطأ في إرسال رسالة الخطأ:', fallbackError);
        }
      } finally {
        isProcessingRef.current = false;
        debugLog('🏁 انتهت معالجة رسالة AI');
      }
    };

    // تفعيل المراقبة
    setupAIMonitoring();

    // تنظيف عند إلغاء التحميل
    return () => {
      debugLog('🧹 تنظيف AI Handler');
      if (messageChannel) {
        messageChannel.unsubscribe();
      }
      isProcessingRef.current = false;
      lastProcessedMessageRef.current = null;
    };

  }, [conversationId, user, isActive]);

  // إرجاع معلومات مفيدة
  return {
    isMonitoring: isActive && !!conversationId,
  };
}